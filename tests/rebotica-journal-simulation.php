<?php
require __DIR__.'/../integrations/wordpress/salero-rebotica-journal.php';
$state=null;$calls=array();$failBegin=false;$failOffer=false;$generation=0;$permit=null;$accepted=false;$writes=0;$n=0;
$load=function()use(&$state){return $state;};$save=function($s)use(&$state){$state=$s;};
$rpc=function($op,$args)use(&$calls,&$failBegin,&$failOffer,&$generation,&$permit,&$accepted){
 $calls[]=$op;
 if($op==='begin'){if(!$permit)$permit=array('batchId'=>$args[0],'generation'=>++$generation,'closed'=>false); if($failBegin)throw new RuntimeException('network_timeout');return $permit;}
 $accepted=true;if($failOffer)throw new RuntimeException('offer_ack_lost');return array('accepted'=>true,'duplicate'=>true);
};
function ok($v,$label){global $n;if(!$v)throw new RuntimeException($label);$n++;echo "PASS $label\n";}
$j=new Salero_Rebotica_Journal($load,$save,$rpc);
$j->before(false,'draft');ok(!$state && !$calls,'draft does not notify or register a public event');
$failBegin=true;try{$j->before(true,'save');$writes++;}catch(RuntimeException $e){}ok($writes===0 && $state['intent'] && !$state['permit'],'lost permit acknowledgment prevents visible write');
$intent=$state['intent'];$j=new Salero_Rebotica_Journal($load,$save,$rpc);$failBegin=false;$j->before(true,'save');ok($generation===1 && $state['permit']['batchId']===$intent,'restart retries same durable intent');
$j->before(true,'save');ok(count($state['events'])===1 && $state['version']===1,'duplicate WordPress hooks coalesce');
ok($j->revision()['editing'],'incomplete mutation blocks export');
try{$j->prepare(function(){throw new RuntimeException('must_not_export');},function(){});}catch(RuntimeException $e){ok($e->getMessage()==='editing_or_incomplete','partial request refuses snapshot');}
$j->finished('save');$revision=$j->revision()['revision'];$packet=$j->prepare(function()use($revision){return array('revision'=>$revision,'snapshotId'=>'sha256:'.str_repeat('a',64));},function($s,$g,$b){return $s+array('generation'=>$g,'batchId'=>$b);});
ok($state['phase']==='frozen' && $state['outbox']===$packet,'snapshot persists before send');
try{$j->before(true,'concurrent');}catch(RuntimeException $e){ok($e->getMessage()==='export_frozen','concurrent edit blocked during frozen export');}
$failOffer=true;try{$j->flush(function(){throw new RuntimeException('must_not_dispatch');});}catch(RuntimeException $e){}ok($accepted && $state['outbox']===$packet,'lost storage acknowledgment preserves exact outbox');
$j=new Salero_Rebotica_Journal($load,$save,$rpc);$failOffer=false;try{$j->flush(function(){return false;});}catch(RuntimeException $e){}ok($state['dispatch'] && !$state['outbox'],'accepted snapshot retains durable build dispatch');
$job=$state['dispatch']['jobId'];$j=new Salero_Rebotica_Journal($load,$save,$rpc);$j->flush(function($d)use($job){ok($d['jobId']===$job,'dispatch retry uses stable job identity');return true;});
ok(!$state['dispatch'] && $state['phase']==='closed','confirmed dispatch clears only acknowledged item');
$j->before(false,'unrelated');ok($state['version']===1,'unrelated administration does not change public revision');
echo "PASS journal: $n checks (simulated persistence; real WordPress barriers not installed)\n";
