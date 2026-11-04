<?php
require __DIR__ . '/../integrations/wordpress/salero-editorial-push-staging.php';
// Synthetic test keys only; optional ephemeral process values enable PHP/Worker interoperability.
$editorKey = getenv('SALERO_TEST_EDITOR_KEY') ?: str_repeat('e', 32); $snapshotKey = getenv('SALERO_TEST_SNAPSHOT_KEY') ?: str_repeat('s', 32); $passed = 0;
function check($condition, $label) { global $passed; if (!$condition) throw new RuntimeException($label); $passed++; }
function rejects($callback, $code) { try { $callback(); } catch (RuntimeException $e) { check($e->getMessage() === $code, $code); return; } throw new RuntimeException('missing rejection'); }
$captured = array();
$transport = new Salero_Editorial_Push_Staging_Transport('http://127.0.0.1:8787/rpc', $editorKey, $snapshotKey, function ($url, $body) use (&$captured) {
    $captured[] = json_decode($body, true); return array('status' => 200, 'contentType' => 'application/json; charset=utf-8', 'body' => '{"ok":true,"value":{"generation":1,"batchId":"batch-1","closed":false}}');
});
check($transport->command('begin', array('batch-1'))['generation'] === 1, 'permit parsed');
$transport->command('begin', array('batch-1'));
check($captured[0]['nonce'] !== $captured[1]['nonce'], 'retry uses fresh nonce');
check($captured[0]['args'] === $captured[1]['args'], 'retry retains batch identity');
rejects(function () use ($transport) { $transport->command('preparePromotion', array('job')); }, 'transport_permission');
foreach (array('https://agenciaconsalero.es/rpc', 'https://cms.webagencia360.com/rpc', 'http://salero-push-staging.x.workers.dev/rpc', 'http://127.0.0.1:8787/rpc?secret=x') as $url) rejects(function () use ($url, $editorKey, $snapshotKey) { new Salero_Editorial_Push_Staging_Transport($url, $editorKey, $snapshotKey); }, 'staging_endpoint');
foreach (array(array(202,'text/html','<html>challenge</html>'),array(500,'application/json','{}'),array(200,'text/html','{}'),array(200,'application/json','{}'),array(200,'application/json','{"ok":false,"error":"obsolete_snapshot"}')) as $r) {
    $t = new Salero_Editorial_Push_Staging_Transport('http://localhost:8787/rpc', $editorKey, $snapshotKey, function () use ($r) { return array('status'=>$r[0],'contentType'=>$r[1],'body'=>$r[2]); });
    rejects(function () use ($t) { $t->command('begin', array('batch')); }, $r[0] !== 200 || $r[1] !== 'application/json' ? 'coordinator_unavailable' : 'coordinator_unconfirmed');
}
foreach (array('servicios','sectores','casos-exito','post') as $type) {
    check(!Salero_Editorial_Push_Write_Policy::visibleChange($type,'draft','draft'), 'draft');
    check(Salero_Editorial_Push_Write_Policy::visibleChange($type,'draft','publish'), 'publication');
    check(Salero_Editorial_Push_Write_Policy::visibleChange($type,'publish','publish'), 'update');
    check(Salero_Editorial_Push_Write_Policy::visibleChange($type,'publish','trash'), 'removal');
}
check(!Salero_Editorial_Push_Write_Policy::visibleChange('revision','inherit','inherit'), 'revision draft');
check(Salero_Editorial_Push_Write_Policy::visibleChange('attachment','inherit','inherit',true), 'referenced media');
check(!Salero_Editorial_Push_Write_Policy::visibleChange('attachment','inherit','inherit',false), 'unreferenced media');
check(Salero_Editorial_Push_Write_Policy::authorize(false,array()), 'drafts allowed without coordinator');
rejects(function () { Salero_Editorial_Push_Write_Policy::authorize(null,array()); }, 'reference_state_unknown');
foreach (array(array(),array('gate'=>'closed'),array('gate'=>'frozen'),array('gate'=>'editing','permit'=>array('closed'=>true,'generation'=>1,'batchId'=>'batch'))) as $state) rejects(function () use ($state) { Salero_Editorial_Push_Write_Policy::authorize(true,$state); }, 'editorial_unannounced');
check(Salero_Editorial_Push_Write_Policy::authorize(true,array('gate'=>'editing','permit'=>array('closed'=>false,'generation'=>1,'batchId'=>'batch'))), 'acknowledged window permits offline writes');
if (in_array('--emit-packet', $argv, true)) { echo json_encode($transport->packet(json_decode(stream_get_contents(STDIN), true), 1, 'batch-1')); }
elseif (in_array('--emit-command', $argv, true)) { echo json_encode($captured[0]); }
else echo "staging transport/policy: $passed PASS (no WordPress writes or HTTP calls)\n";
