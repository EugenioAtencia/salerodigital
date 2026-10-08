<?php
require __DIR__ . '/../integrations/wordpress/salero-editorial-snapshot.php';
$checks = 0;
function check($condition, $label) { global $checks; if (!$condition) throw new RuntimeException('FAIL: '.$label); $checks++; echo 'PASS: '.$label."\n"; }
function rejected($code, $fn) { global $checks; try { $fn(); } catch (RuntimeException $e) { if ($e->getMessage() !== $code) throw $e; $checks++; echo 'PASS: '.$code."\n"; return; } throw new RuntimeException('Accepted invalid '.$code); }
function fixture() {
 $result=array();$sizes=array(4,3,2,2);
 foreach(Salero_Editorial_Snapshot_Exporter::COLLECTIONS as $t=>$type) {
  $items=array();for($i=0;$i<$sizes[$t];$i++) $items[]=array('id'=>($t+1)*100+$i,'slug'=>$type.'-'.$i,'status'=>'publish','date'=>'2026-06-01T12:00:00',
   'title'=>array('rendered'=>'Título '.$type.' '.$i),'excerpt'=>array('rendered'=>'<p>Texto público de prueba.</p>'),
   'content'=>array('rendered'=>'<p>Artículo de prueba.</p>','protected'=>false),'acf'=>(object)array(),
   '_embedded'=>array('wp:term'=>array(array(array('id'=>1,'name'=>'Categoría','slug'=>'categoria')))));
  $result[$type]=$items;
 }
 return $result;
}
function reader($data, $alter=null) {
 return function($type,$page,$size) use($data,$alter) {
  $items=$data[$type];$r=array('status'=>200,'contentType'=>'application/json; charset=UTF-8','total'=>count($items),'totalPages'=>(int)ceil(count($items)/$size),'items'=>array_slice($items,($page-1)*$size,$size));
  return $alter ? $alter($r,$type,$page,$size) : $r;
 };
}
$stable=function(){return array('revision'=>str_repeat('a',64),'editing'=>false);};$data=fixture();
$valid=Salero_Editorial_Snapshot_Exporter::export($stable,reader($data),2);
if(in_array('--emit-snapshot',$argv,true)){echo json_encode($valid,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);exit;}
check($valid['counts']===array('servicios'=>4,'sectores'=>3,'casos-exito'=>2,'posts'=>2),'all collections, multiple pages and counts 4/3/2/2');
$blog=Salero_Editorial_Snapshot_Exporter::export($stable,function($type,$page,$size)use($data){if($type!=='posts')throw new RuntimeException('non_blog_read');return reader($data)($type,$page,$size);},2,array('posts'));
check($blog['counts']===array('servicios'=>0,'sectores'=>0,'casos-exito'=>0,'posts'=>2),'scoped blog exporter never reads other collections');
foreach(array('featured_media','categories','tags')as $field)rejected($field==='featured_media'?'snapshot_media_missing':'snapshot_terms_missing',function()use($stable,$data,$field){$bad=$data;$bad['posts'][0][$field]=$field==='featured_media'?999:array(999);Salero_Editorial_Snapshot_Exporter::export($stable,reader($bad));});

check(hash('sha256',$valid['body'])===$valid['sha256'] && strlen($valid['body'])===$valid['bytes'],'exact UTF-8 bytes hash');
check($valid===Salero_Editorial_Snapshot_Exporter::export($stable,reader($data),2),'deterministic snapshot');
$reverse=$data;foreach($reverse as &$items)foreach($items as &$item)$item=array_reverse($item,true);unset($item,$items);
check($valid===Salero_Editorial_Snapshot_Exporter::export($stable,reader($reverse),2),'object key order irrelevant; card order preserved');
foreach(array(202,403,500) as $status)rejected('page_http',function()use($stable,$data,$status){Salero_Editorial_Snapshot_Exporter::export($stable,reader($data,function($r)use($status){$r['status']=$status;return $r;}));});
rejected('page_content_type',function()use($stable,$data){Salero_Editorial_Snapshot_Exporter::export($stable,reader($data,function($r){$r['contentType']='text/html';return $r;}));});
rejected('pagination_invalid',function()use($stable,$data){Salero_Editorial_Snapshot_Exporter::export($stable,reader($data,function($r){unset($r['total']);return $r;}));});
rejected('pagination_invalid',function()use($stable,$data){Salero_Editorial_Snapshot_Exporter::export($stable,reader($data,function($r){$r['totalPages']=99;return $r;}));});
rejected('pagination_changed',function()use($stable,$data){Salero_Editorial_Snapshot_Exporter::export($stable,reader($data,function($r,$t,$p,$size){if($p===2){$r['total']++;$r['totalPages']=(int)ceil($r['total']/$size);}return $r;}),2);});
rejected('page_incomplete',function()use($stable,$data){Salero_Editorial_Snapshot_Exporter::export($stable,reader($data,function($r){array_pop($r['items']);return $r;}));});
rejected('page_format',function()use($stable,$data){Salero_Editorial_Snapshot_Exporter::export($stable,reader($data,function($r){$r['items']=array('wrong'=>'object');return $r;}));});
foreach(array('slug','id','cross-id')as $kind)rejected('duplicate_record',function()use($stable,$data,$kind){$bad=$data;if($kind==='slug')$bad['servicios'][1]['slug']=$bad['servicios'][0]['slug'];else if($kind==='id')$bad['servicios'][1]['id']=$bad['servicios'][0]['id'];else $bad['sectores'][0]['id']=$bad['servicios'][0]['id'];Salero_Editorial_Snapshot_Exporter::export($stable,reader($bad));});
$bad=$data;$bad['servicios'][1]['slug']=strtoupper($bad['servicios'][0]['slug']);rejected('duplicate_record',function()use($stable,$bad){Salero_Editorial_Snapshot_Exporter::export($stable,reader($bad));});
foreach(array(array('status','draft','record_invalid'),array('id',1.2,'record_invalid'),array('slug','../x','slug_invalid'),array('password','private-fixture','protected_record'),array('acf','bad','acf_invalid'))as $case)rejected($case[2],function()use($stable,$data,$case){$bad=$data;$bad['servicios'][0][$case[0]]=$case[1];Salero_Editorial_Snapshot_Exporter::export($stable,reader($bad));});
rejected('date_invalid',function()use($stable,$data){$bad=$data;$bad['posts'][0]['date']='2026-02-30T12:00:00';Salero_Editorial_Snapshot_Exporter::export($stable,reader($bad));});
foreach(array(array('revision'=>123,'editing'=>false),array('revision'=>'bad','editing'=>false))as $r)rejected('revision_invalid',function()use($r,$data){Salero_Editorial_Snapshot_Exporter::export(function()use($r){return $r;},reader($data));});
foreach(array(array('revision'=>str_repeat('a',64)),array('revision'=>str_repeat('a',64),'editing'=>true),array('revision'=>str_repeat('a',64),'editing'=>'false'))as $r)rejected('editing_or_incomplete',function()use($r,$data){Salero_Editorial_Snapshot_Exporter::export(function()use($r){return $r;},reader($data));});
rejected('record_invalid',function()use($stable,$data){$bad=$data;unset($bad['posts'][0]['content']);Salero_Editorial_Snapshot_Exporter::export($stable,reader($bad));});
$n=0;rejected('revision_changed',function()use(&$n,$data){Salero_Editorial_Snapshot_Exporter::export(function()use(&$n){return array('revision'=>str_repeat(++$n===1?'a':'b',64),'editing'=>false);},reader($data));});
$n=0;rejected('revision_changed',function()use(&$n,$data){Salero_Editorial_Snapshot_Exporter::export(function()use(&$n){return array('revision'=>str_repeat(++$n<3?'a':'b',64),'editing'=>false);},reader($data));});
$n=0;rejected('snapshot_changed',function()use(&$n,$stable,$data){Salero_Editorial_Snapshot_Exporter::export($stable,reader($data,function($r,$type)use(&$n){if(++$n>4)$r['items'][0]['title']['rendered']='Concurrent change';return $r;}));});
rejected('read_timeout',function()use($stable){Salero_Editorial_Snapshot_Exporter::export($stable,function(){throw new RuntimeException('read_timeout');});});
$empty=array_fill_keys(Salero_Editorial_Snapshot_Exporter::COLLECTIONS,array());$zero=Salero_Editorial_Snapshot_Exporter::export($stable,reader($empty));check(array_sum($zero['counts'])===0,'explicit confirmed empty collections');
rejected('json_encoding',function()use($stable,$data){$bad=$data;$bad['posts'][0]['title']['rendered']="bad\xFF";Salero_Editorial_Snapshot_Exporter::export($stable,reader($bad));});
// WordPress adapter: only internal REST calls, anonymous context restored even after error.
class Salero_Pages_Publish { public static function revision(){return array('revision'=>str_repeat('a',64),'editing'=>false);} }
class WP_REST_Request { public $path;public $query;public function __construct($m,$p){if($m!=='GET')throw new Exception('method');$this->path=$p;}public function set_query_params($q){$this->query=$q;} }
class FixtureResponse { public $items;public $total;public $pages;public function get_status(){return 200;}public function get_headers(){return array('X-WP-Total'=>$this->total,'X-WP-TotalPages'=>$this->pages);} }
$user=9;$calls=0;$restFail=false;
function get_current_user_id(){global $user;return $user;}function wp_set_current_user($id){global $user;$user=$id;}function is_wp_error($r){return false;}
function rest_do_request($req){global $data,$calls,$user,$restFail;if($restFail)throw new RuntimeException('internal_rest_failed');if($user!==0||$req->query['context']!=='view'||$req->query['_embed']!==1)throw new Exception('private_context');$calls++;$type=basename($req->path);$r=new FixtureResponse();$r->total=count($data[$type]);$r->pages=(int)ceil($r->total/$req->query['per_page']);$r->items=array_slice($data[$type],($req->query['page']-1)*$req->query['per_page'],$req->query['per_page']);return $r;}
function rest_get_server(){return new class {public function response_to_data($r,$embed){if(!$embed)throw new Exception('embed');return $r->items;}};}
check(Salero_WordPress_Snapshot_Source::export(2)===$valid&&$calls===12&&$user===9,'WordPress internal public REST adapter, embedding and user restoration');
$restFail=true;rejected('internal_rest_failed',function(){Salero_WordPress_Snapshot_Source::export();});check($user===9,'user restored on failed internal export');
$mediaItem=$data['casos-exito'][0];$mediaItem['acf']=array('hero_image'=>999,'hero_video'=>999,'galeria_caso'=>array(array('imagen'=>999,'video'=>'https://example.test/video.mp4')));$mediaReads=0;
$enriched=Salero_WordPress_Snapshot_Source::enrichCase($mediaItem,function($id)use(&$mediaReads){$mediaReads++;return array('id'=>$id,'source_url'=>'https://example.test/image.jpg');});
check($mediaReads===1&&isset($enriched['salero_snapshot_media']->{999}),'case media references exported once per read, no network');
rejected('snapshot_media_missing',function()use($mediaItem){Salero_WordPress_Snapshot_Source::enrichCase($mediaItem,function(){return null;});});
rejected('snapshot_media_missing',function()use($mediaItem){Salero_WordPress_Snapshot_Source::enrichCase($mediaItem,function(){return array('id'=>888,'source_url'=>'https://example.test/image.jpg');});});
echo 'PASS: push exporter — '.$checks." checks; PHP ".PHP_VERSION."; no network or writes\n";
