<?php
// Hook adapter exercised with WordPress doubles. No site, database or network is touched.
define('ABSPATH',__DIR__.'/fixture-wordpress/');define('SALERO_PAGES_ENABLED',false);
define('SALERO_REBOTICA_STAGING_ENABLED',true);
define('SALERO_REBOTICA_COORDINATOR_URL','https://salero-push-staging.fixture.workers.dev/rpc');
define('SALERO_REBOTICA_EDITOR_KEY',str_repeat('e',32));define('SALERO_REBOTICA_SNAPSHOT_KEY',str_repeat('s',32));
$host='staging6.cms.webagencia360.com';$hooks=array();$options=array();$network=array();$offline=false;$scheduled=array();$usedMedia=false;$termObjects=array(10);
$posts=array(10=>(object)array('post_type'=>'post','post_status'=>'publish'),11=>(object)array('post_type'=>'post','post_status'=>'draft'),12=>(object)array('post_type'=>'sectores','post_status'=>'publish'),99=>(object)array('post_type'=>'attachment','post_status'=>'inherit'));
function home_url($path){global $host;return 'https://'.$host.$path;}
function add_action($hook,$callback,$priority=10,$args=1){global $hooks;$hooks[$hook]=array($callback,$priority,$args);}
function add_filter($hook,$callback,$priority=10,$args=1){add_action($hook,$callback,$priority,$args);}
function get_post($id){global $posts;return $posts[$id]??null;}
function wp_get_attachment_url($id){return 'https://staging6.cms.webagencia360.com/wp-content/uploads/fixture.jpg';}
function get_objects_in_term($id,$taxonomy){global $termObjects;return $termObjects;}
function is_wp_error($value){return false;}
function wp_die($message,$title,$args){throw new RuntimeException('blocked-'.$args['response']);}
function get_option($key,$default=false){global $options;return $options[$key]??$default;}
function update_option($key,$value,$autoload=false){global $options;$options[$key]=$value;}
function delete_option($key){global $options;unset($options[$key]);}
function maybe_unserialize($value){return $value;}
function wp_next_scheduled($hook){global $scheduled;return $scheduled[$hook]??false;}
function wp_schedule_single_event($at,$hook){global $scheduled;$scheduled[$hook]=$at;}
function wp_remote_post($url,$args){global $network,$offline;$c=json_decode($args['body'],true);$network[]=$c['operation'];return array('status'=>$offline?503:200,'type'=>'application/json','body'=>json_encode(array('ok'=>true,'value'=>array('generation'=>1,'batchId'=>$c['args'][0],'closed'=>false))));}
function wp_remote_retrieve_response_code($r){return $r['status'];}function wp_remote_retrieve_header($r,$h){return $r['type'];}function wp_remote_retrieve_body($r){return $r['body'];}
$wpdb=new class {public $posts='fixture_posts';public $postmeta='fixture_postmeta';public $options='fixture_options';public function prepare($sql,...$args){return array($sql,$args);}public function esc_like($s){return $s;}public function get_var($q){global $options,$usedMedia;if(strpos($q[0],'option_value')!==false)return $options[$q[1][0]]??null;if(strpos($q[0],'SELECT p.ID')!==false)return $usedMedia?10:null;return 1;}};
require __DIR__.'/../integrations/wordpress/salero-rebotica-staging.php';
$n=0;function ok($v,$label){global $n;if(!$v)throw new RuntimeException($label);$n++;echo 'PASS '.$label."\n";}
function resetAdapter(){global $options,$network,$scheduled;$options=array();$network=array();$scheduled=array();foreach(array('held'=>false,'started'=>false,'event'=>null)as $name=>$value){$p=new ReflectionProperty('Salero_Rebotica_Staging',$name);$p->setAccessible(true);$p->setValue(null,$value);}Salero_Rebotica_Staging::boot();}
$host='cms.webagencia360.com';Salero_Rebotica_Staging::boot();ok(count($hooks)===1,'production host cannot register staging editorial hooks');$host='staging6.cms.webagencia360.com';resetAdapter();
foreach(array('wp_insert_post_data','pre_post_update','before_delete_post','update_post_metadata','add_term_relationship','edit_terms','delete_attachment','shutdown')as $hook)ok(isset($hooks[$hook]),'registered pre-write/finish hook '.$hook);
Salero_Rebotica_Staging::post(array('post_type'=>'post','post_status'=>'draft'),array('ID'=>11),array(),true);ok(!$network&&!$options,'draft save remains available with no outgoing request');
$offline=true;try{Salero_Rebotica_Staging::post(array('post_type'=>'post','post_status'=>'publish'),array('ID'=>11),array(),true);throw new Exception('publication accepted');}catch(RuntimeException $e){ok($e->getMessage()==='blocked-409','unconfirmed remote permit blocks publication before core write');}Salero_Rebotica_Staging::finish();ok(isset($scheduled[Salero_Rebotica_Staging::CRON]),'lost permit gets a retry, no content replay');$offline=false;resetAdapter();
Salero_Rebotica_Staging::post(array('post_type'=>'post','post_status'=>'publish'),array('ID'=>11),array(),true);Salero_Rebotica_Staging::meta(null,10,'acf_fixture','value');Salero_Rebotica_Staging::relationship(10,array(1),'category');Salero_Rebotica_Staging::finish();$state=$options[Salero_Rebotica_WordPress_Store::OPTION];ok($network===array('begin')&&$state['version']===1&&count($state['events'])===1&&!in_array(false,$state['events'],true),'publish, ACF and taxonomies coalesce with persistent completion');
resetAdapter();Salero_Rebotica_Staging::post(array('post_type'=>'post','post_status'=>'draft'),array('ID'=>10),array(),true);Salero_Rebotica_Staging::finish();ok($network===array('begin'),'withdrawal fences previously visible content');
resetAdapter();Salero_Rebotica_Staging::related(10);Salero_Rebotica_Staging::finish();ok($network===array('begin'),'delete/update visible post fences before mutation');
resetAdapter();$usedMedia=true;Salero_Rebotica_Staging::related(99);Salero_Rebotica_Staging::finish();ok($network===array('begin'),'referenced media fenced before update/delete');$usedMedia=false;
resetAdapter();Salero_Rebotica_Staging::term(1,'post_tag');Salero_Rebotica_Staging::finish();ok($network===array('begin'),'referenced tag edit/delete fenced');
resetAdapter();Salero_Rebotica_Staging::related(12);Salero_Rebotica_Staging::meta(null,11,'draft_meta','value');ok(!$network&&!$options,'sectors and draft metadata do not enter the blog pipeline');
echo "PASS WordPress hook doubles: $n checks; real core hooks and staging DB NOT validated\n";
