<?php
/** Durable transition library. The WordPress adapter must hold its writer lock across calls.
 * No boot hooks, credentials, network calls or schema installation on include.
 */
final class Salero_Rebotica_Journal {
    private $load; private $save; private $rpc;
    public function __construct($load, $save, $rpc) { $this->load=$load; $this->save=$save; $this->rpc=$rpc; }
    private function read() {
        $s=call_user_func($this->load);
        return $s ?: array('phase'=>'closed','intent'=>null,'permit'=>null,'version'=>0,'events'=>array(),'outbox'=>null,'dispatch'=>null);
    }
    private function write($s) { call_user_func($this->save,$s); return $s; }
    public function before($publicChange,$eventId) {
        if (!$publicChange) return true;
        $s=$this->read();
        if ($s['phase']==='frozen') throw new RuntimeException('export_frozen');
        if (!$s['permit']) {
            if (!$s['intent']) { $s['intent']='blog-'.bin2hex(random_bytes(16)); $this->write($s); }
            // A lost response leaves the same durable intent, and does not authorize a write.
            $permit=call_user_func($this->rpc,'begin',array($s['intent']));
            if (!is_array($permit) || ($permit['batchId'] ?? null)!==$s['intent'] || !is_int($permit['generation'] ?? null) || $permit['generation']<1 || ($permit['closed'] ?? true)!==false) throw new RuntimeException('permit_unconfirmed');
            $s['permit']=$permit; $s['intent']=null; $s['phase']='editing';
        }
        if (!isset($s['events'][$eventId])) { $s['events'][$eventId]=false; $s['version']++; }
        $this->write($s); return true;
    }
    public function resumeIntent() {
        $s=$this->read();
        if (!$s['intent'] || $s['permit']) return;
        $permit=call_user_func($this->rpc,'begin',array($s['intent']));
        if (!is_array($permit) || ($permit['batchId'] ?? null)!==$s['intent'] || !is_int($permit['generation'] ?? null) || $permit['generation']<1 || ($permit['closed'] ?? true)!==false) throw new RuntimeException('permit_unconfirmed');
        $s['permit']=$permit; $s['intent']=null; $s['phase']='editing'; $this->write($s);
        // The denied edit is not replayed. A fresh export of actual WordPress state closes the fence.
    }
    public function finished($eventId) {
        $s=$this->read();
        if (!array_key_exists($eventId,$s['events'])) throw new RuntimeException('event_unknown');
        $s['events'][$eventId]=true; $this->write($s);
    }
    public function revision() {
        $s=$this->read();
        return array('revision'=>hash('sha256','rebotica:'.$s['version']),'editing'=>in_array(false,$s['events'],true));
    }
    public function prepare($export,$packet) {
        $s=$this->read();
        if ($s['outbox']) return $s['outbox'];
        if ($s['phase']!=='editing' && $s['phase']!=='frozen') throw new RuntimeException('no_editorial_batch');
        if (in_array(false,$s['events'],true)) throw new RuntimeException('editing_or_incomplete');
        $s['phase']='frozen'; $this->write($s);
        $snapshot=call_user_func($export);
        if (($snapshot['revision'] ?? null)!==$this->revision()['revision']) throw new RuntimeException('revision_changed');
        $s['outbox']=call_user_func($packet,$snapshot,$s['permit']['generation'],$s['permit']['batchId']);
        $this->write($s); return $s['outbox'];
    }
    public function flush($dispatch) {
        $s=$this->read();
        if ($s['outbox']) {
            $ack=call_user_func($this->rpc,'offer',array($s['outbox']));
            if (($ack['accepted'] ?? false)!==true) throw new RuntimeException('offer_unconfirmed');
            $p=$s['outbox'];
            $s['dispatch']=array('jobId'=>'blog-'.hash('sha256',$p['snapshotId'].':'.$p['generation']),'generation'=>$p['generation']);
            $s['outbox']=null; $s['permit']=null; $s['events']=array(); $s['phase']='closed'; $this->write($s);
        }
        if ($s['dispatch']) {
            // Retry a stable job ID; the coordinator fences duplicate runners at promotion.
            if (call_user_func($dispatch,$s['dispatch'])!==true) throw new RuntimeException('dispatch_unconfirmed');
            $s['dispatch']=null; $this->write($s);
        }
    }
    public function state() { return $this->read(); }
}

/** Real WordPress persistence adapter; explicit construction only in verified staging.
 * GET_LOCK is connection-scoped and released by disconnect, never a expiring writer lease.
 */
final class Salero_Rebotica_WordPress_Store {
    const OPTION='salero_rebotica_staging_journal';
    private $name;
    public function __construct() {
        $host=parse_url(home_url('/'),PHP_URL_HOST);
        if ($host!=='staging6.cms.webagencia360.com' || !defined('SALERO_REBOTICA_STAGING_ENABLED') || SALERO_REBOTICA_STAGING_ENABLED!==true) throw new RuntimeException('staging_not_enabled');
        $this->name='salero-blog-'.substr(hash('sha256',ABSPATH),0,32);
    }
    public function lock() { global $wpdb; if ((int)$wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s,0)',$this->name))!==1) throw new RuntimeException('editorial_writer_busy'); }
    public function unlock() { global $wpdb; $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)',$this->name)); }
    public function load() { global $wpdb; return maybe_unserialize($wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name=%s",self::OPTION))); }
    public function save($state) {
        global $wpdb;
        if ((int)$wpdb->get_var($wpdb->prepare('SELECT IS_USED_LOCK(%s) = CONNECTION_ID()',$this->name))!==1) throw new RuntimeException('editorial_writer_unlocked');
        update_option(self::OPTION,$state,false);
        if ($this->load()!==$state) throw new RuntimeException('journal_persistence_failed');
    }
}
