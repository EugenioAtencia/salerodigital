<?php
/** Plugin Name: Salero Rebotica isolated staging
 * Explicit staging configuration only. This file is not installed by the build.
 */
if (!defined('ABSPATH')) return;
require_once __DIR__.'/salero-rebotica-journal.php';
require_once __DIR__.'/salero-editorial-snapshot.php';
require_once __DIR__.'/salero-editorial-push-staging.php';
final class Salero_Rebotica_Staging {
    const CRON='salero_rebotica_staging_tick';
    private static $store; private static $journal; private static $transport; private static $event; private static $held=false; private static $started=false;
    public static function boot() {
        if (defined('SALERO_PAGES_ENABLED') && SALERO_PAGES_ENABLED!==false) return;
        if (!defined('SALERO_REBOTICA_STAGING_ENABLED') || SALERO_REBOTICA_STAGING_ENABLED!==true) return;
        if (parse_url(home_url('/'),PHP_URL_HOST)!=='staging6.cms.webagencia360.com') return;
        foreach(array('SALERO_REBOTICA_COORDINATOR_URL','SALERO_REBOTICA_EDITOR_KEY','SALERO_REBOTICA_SNAPSHOT_KEY') as $name) if(!defined($name)) return;
        self::$store=new Salero_Rebotica_WordPress_Store();
        self::$transport=new Salero_Editorial_Push_Staging_Transport(SALERO_REBOTICA_COORDINATOR_URL,SALERO_REBOTICA_EDITOR_KEY,SALERO_REBOTICA_SNAPSHOT_KEY);
        self::$journal=new Salero_Rebotica_Journal(array(self::$store,'load'),array(self::$store,'save'),array(self::$transport,'command'));
        add_filter('wp_insert_post_data',array(__CLASS__,'post'),1,4);
        add_action('delete_attachment',array(__CLASS__,'related'),1);
        add_action('before_delete_post',array(__CLASS__,'related'),1,2);
        add_action('pre_post_update',array(__CLASS__,'related'),1,2);
        foreach(array('add_post_metadata','update_post_metadata','delete_post_metadata') as $hook) add_filter($hook,array(__CLASS__,'meta'),1,5);
        add_action('add_term_relationship',array(__CLASS__,'relationship'),1,3);
        add_action('delete_term_relationships',array(__CLASS__,'relationship'),1,3);
        add_action('edit_terms',array(__CLASS__,'term'),1,2);
        add_action('pre_delete_term',array(__CLASS__,'term'),1,2);
        add_action('shutdown',array(__CLASS__,'finish'),999);
        add_action(self::CRON,array(__CLASS__,'tick'));
    }
    private static function guard($visible) {
        if(!$visible) return;
        try{
            if(!self::$held){self::$store->lock();self::$held=true;}
            if(!self::$event) self::$event='request-'.bin2hex(random_bytes(16));
            self::$journal->before(true,self::$event);self::$started=true;
        }catch(Exception $e){wp_die('La sincronización editorial de staging está temporalmente bloqueada. Guarda como borrador o reintenta.','Salero staging',array('response'=>409));}
    }
    private static function publicPost($id) { $p=get_post($id);return $p && $p->post_type==='post' && $p->post_status==='publish'; }
    public static function post($data,$postarr,$unsanitized,$update) {
        if(($data['post_type'] ?? '')==='post' && !(defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)) self::guard(($data['post_status'] ?? '')==='publish' || self::publicPost($postarr['ID'] ?? 0));
        if(($data['post_type'] ?? '')==='attachment') self::related($postarr['ID'] ?? 0);
        return $data;
    }
    public static function related($id) {
        $p=get_post($id);if(!$p)return;
        if($p->post_type==='post'){self::guard(self::publicPost($id));return;}
        if($p->post_type!=='attachment')return;
        global $wpdb;$url=wp_get_attachment_url($id);
        $used=$wpdb->get_var($wpdb->prepare("SELECT p.ID FROM {$wpdb->posts} p LEFT JOIN {$wpdb->postmeta} m ON m.post_id=p.ID AND m.meta_key='_thumbnail_id' WHERE p.post_type='post' AND p.post_status='publish' AND (m.meta_value=%s OR p.post_parent=%d OR p.post_content LIKE %s) LIMIT 1",(string)$id,(int)$id,'%'.$wpdb->esc_like($url ?: 'never-match-media-'.(int)$id).'%'));
        self::guard((bool)$used);
    }
    public static function meta($check,$id,$key,$value,$extra=null){self::related($id);return $check;}
    public static function relationship($object,$terms,$taxonomy){if(in_array($taxonomy,array('category','post_tag'),true))self::guard(self::publicPost($object));}
    public static function term($term,$taxonomy){
        if(!in_array($taxonomy,array('category','post_tag'),true))return;
        $ids=get_objects_in_term((int)$term,$taxonomy);
        if(is_wp_error($ids)){self::guard(true);return;}
        foreach($ids as $id)if(self::publicPost($id)){self::guard(true);return;}
    }
    private static function schedule($seconds){if(!wp_next_scheduled(self::CRON))wp_schedule_single_event(time()+$seconds,self::CRON);}
    public static function finish(){
        if(!self::$held)return;
        $error=error_get_last();
        if(self::$started && (!$error || !in_array($error['type'],array(E_ERROR,E_PARSE,E_CORE_ERROR,E_COMPILE_ERROR,E_USER_ERROR),true))){self::$journal->finished(self::$event);self::schedule(15);}
        if(self::$journal->state()['intent'])self::schedule(15);
        self::$store->unlock();self::$held=false;
    }
    public static function tick(){
        $held=false;
        try{
            self::$store->lock();$held=true;
            self::$journal->resumeIntent();
            $state=self::$journal->state();
            if(!$state['outbox'] && in_array($state['phase'],array('editing','frozen'),true)) self::$journal->prepare(function(){return Salero_WordPress_Snapshot_Source::export(100,true,array(self::$journal,'revision'));},array(self::$transport,'packet'));
            // Notify only after the DO has confirmed the immutable manifest. Lost ACKs keep the stable dispatch in the outbox.
            self::$journal->flush(function($job){$ack=self::$transport->command('notify',array($job['jobId'],$job['generation']));return ($ack['dispatched'] ?? false)===true;});
            delete_option('salero_rebotica_staging_attempts');
        }catch(Exception $e){$n=(int)get_option('salero_rebotica_staging_attempts',0)+1;update_option('salero_rebotica_staging_attempts',$n,false);self::schedule(min(3600,15*(int)pow(2,min($n,8))));}
        finally{if($held)self::$store->unlock();}
    }
}
add_action('muplugins_loaded',array('Salero_Rebotica_Staging','boot'),20);
