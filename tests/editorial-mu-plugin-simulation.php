<?php
// In-memory WordPress/HTTP fixtures. No real CMS writes or deployments.
define('ABSPATH', '/fixture/'); define('ARRAY_A', 'ARRAY_A');
define('SALERO_PAGES_ENABLED', !in_array('--disabled', $argv, true));
define('SALERO_PAGES_ACCOUNT_ID', 'fixture'); define('SALERO_PAGES_READ_TOKEN', 'fixture-private-token');
// Structural fixtures only: never use an operational Hook secret.
$hookBase = 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/fixture-private-hook';
$hookCases = array(
    'official' => array($hookBase, true),
    'http' => array(str_replace('https:', 'http:', $hookBase), false),
    'external' => array(str_replace('api.cloudflare.com', 'example.com', $hookBase), false),
    'spoofed' => array(str_replace('api.cloudflare.com', 'api.cloudflare.com.example.com', $hookBase), false),
    'credentials' => array(str_replace('https://', 'https://user:password@', $hookBase), false),
    'old-path' => array(str_replace('/deploy_hooks/', '/', $hookBase), false),
    'other-path' => array(str_replace('/deploy_hooks/', '/other/', $hookBase), false),
    'empty' => array('', false),
    'malformed' => array('https:///api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/fixture', false),
    'other-subdomain' => array(str_replace('api.cloudflare.com', 'www.cloudflare.com', $hookBase), false),
    'host-case' => array(str_replace('api.cloudflare.com', 'API.CLOUDFLARE.COM', $hookBase), false),
    'port' => array(str_replace('api.cloudflare.com', 'api.cloudflare.com:443', $hookBase), false),
    'query-redirect' => array($hookBase . '?redirect=https://example.com', false),
    'fragment' => array($hookBase . '#fragment', false),
    'encoded-path' => array(str_replace('/deploy_hooks/', '/%64eploy_hooks/', $hookBase), false),
    'newline' => array($hookBase . "\n", false),
    'response-redirect' => array($hookBase, true)
);
if (in_array('--url-validation', $argv, true)) {
    foreach (array_keys($hookCases) as $name) {
        passthru(escapeshellarg(PHP_BINARY) . ' -d pcre.jit=0 ' . escapeshellarg(__FILE__) . ' --hook-case ' . escapeshellarg($name), $status);
        if ($status !== 0) exit($status);
    }
    echo 'PASS: Hook URL validation — ' . count($hookCases) . " cases\n"; exit;
}
$caseIndex = array_search('--hook-case', $argv, true);
$hookCase = $caseIndex === false ? null : ($argv[$caseIndex + 1] ?? '');
if ($hookCase !== null && !isset($hookCases[$hookCase])) throw new Exception('Unknown Hook fixture');
define('SALERO_PAGES_DEPLOY_HOOK', $hookCase === null ? $hookBase : $hookCases[$hookCase][0]);
if (in_array('--autosave', $argv, true)) define('DOING_AUTOSAVE', true);
$options = array(); $hooks = array(); $posts = array(); $meta = array(); $scheduled = null; $http = array(); $calls = array(); $counter = 0; $checks = 0;
function add_action($name, $callback, $priority = 10, $args = 1) { global $hooks; $hooks[$name][] = $callback; }
function add_filter($name, $callback, $priority = 10, $args = 1) { add_action($name, $callback, $priority, $args); }
function add_option($key, $value, $deprecated = '', $autoload = false) { global $options; if (isset($options[$key])) return false; $options[$key] = $value; return true; }
function update_option($key, $value, $autoload = false) { global $options; $options[$key] = $value; }
function get_option($key, $default = false) { global $options; return $options[$key] ?? $default; }
function delete_option($key) { global $options; unset($options[$key]); }
function wp_generate_uuid4() { global $counter; return sprintf('00000000-0000-4000-8000-%012d', ++$counter); }
function wp_next_scheduled($hook) { global $scheduled; return $scheduled; }
function wp_unschedule_event($at, $hook) { global $scheduled; $scheduled = null; }
function wp_schedule_single_event($at, $hook) { global $scheduled; $scheduled = $at; }
function get_post($id) { global $posts; return $posts[$id] ?? null; }
function wp_is_post_revision($id) { return $id === 90; }
function wp_is_post_autosave($id) { return $id === 91; }
function get_post_meta($id, $key, $single) { global $meta; return $meta[$id][$key] ?? ''; }
function get_objects_in_term($id, $taxonomy) { return array(1); }
function get_posts($args) { return array(1); }
function is_wp_error($value) { return $value instanceof Exception; }
function maybe_serialize($value) { return is_array($value) ? serialize($value) : $value; }
function maybe_unserialize($value) { return is_string($value) && strpos($value, 'a:') === 0 ? unserialize($value) : $value; }
function wp_cache_delete($key, $group) {}
function register_rest_route($namespace, $route, $args) { global $routes; $routes[$namespace . $route] = $args; }
function wp_remote_get($url, $args) { return fixture_http('GET', $url); }
function wp_remote_post($url, $args) { global $post_args; $post_args = $args; return fixture_http('POST', $url); }
function fixture_http($method, $url) { global $http, $calls; $calls[] = $method; if (!$http) throw new Exception('Unexpected HTTP request'); return array_shift($http); }
function wp_remote_retrieve_response_code($r) { return $r['status']; }
function wp_remote_retrieve_body($r) { return $r['body']; }
class WP_REST_Response { public $data; public function __construct($data) { $this->data = $data; } public function header($key, $value) {} }
class FixtureDB {
    public $options = 'wp_options';
    public function prepare($query, ...$args) { return array($query, $args); }
    public function esc_like($value) { return $value; }
    public function get_results($query, $format) { global $options; $rows = array(); foreach ($options as $key => $value) if (strpos($key, 'salero_pages_event_') === 0) $rows[] = array('option_name' => $key, 'option_value' => maybe_serialize($value)); return $rows; }
    public function get_var($query) { global $options; return maybe_serialize($options[$query[1][0]] ?? null); }
    public function query($query) { global $options; list($key, $expected) = $query[1]; if (isset($options[$key]) && maybe_serialize($options[$key]) === $expected) unset($options[$key]); }
}
$wpdb = new FixtureDB();
require __DIR__ . '/../integrations/wordpress/salero-pages-publish.php';
function check($condition, $label) { global $checks; if (!$condition) throw new Exception('FAIL: ' . $label); $checks++; echo 'PASS: ' . $label . "\n"; }
function events() { global $options; return array_filter($options, function ($key) { return strpos($key, Salero_Pages_Publish::PREFIX) === 0; }, ARRAY_FILTER_USE_KEY); }
function complete() { global $options; Salero_Pages_Publish::finish_request(); foreach (events() as $key => $event) $options[$key]['at'] = time() - 61; }
function response($value, $status = 200) { return array('status' => $status, 'body' => json_encode($value)); }
function api($result) { return response(array('success' => true, 'result' => $result)); }
function reset_retry() { global $options; $options[Salero_Pages_Publish::STATE]['retry_at'] = 0; }
if (!SALERO_PAGES_ENABLED) { check(!$hooks && !$scheduled, 'disabled plugin registers nothing'); exit; }
$base = array('ID' => 1, 'post_type' => 'post', 'post_status' => 'publish', 'post_title' => 'Title', 'post_excerpt' => '', 'post_content' => '', 'post_date' => '2026-01-01', 'post_name' => 'title', 'post_password' => '');
foreach (array(1, 2, 90, 91) as $id) $posts[$id] = (object) array_merge($base, array('ID' => $id, 'post_status' => $id === 2 ? 'draft' : 'publish'));
if ($hookCase !== null) {
    Salero_Pages_Publish::mark(); complete();
    $accepted = $hookCases[$hookCase][1];
    $http = array(api(array()));
    if ($accepted) $http[] = $hookCase === 'response-redirect'
        ? array('status' => 302, 'body' => '', 'headers' => array('location' => 'https://example.com'))
        : response(array('success' => true));
    Salero_Pages_Publish::tick();
    $postCount = count(array_filter($calls, function ($method) { return $method === 'POST'; }));
    check($postCount === ($accepted ? 1 : 0), 'Hook case ' . $hookCase . ': expected dispatch boundary');
    check(!empty(events()) && strpos(json_encode($options), 'fixture-private') === false, 'queue retained and secret absent from diagnostics');
    if ($accepted) {
        check($post_args['redirection'] === 0, 'Hook redirects disabled');
        check($options[Salero_Pages_Publish::STATE]['status'] === ($hookCase === 'response-redirect' ? 'hook_http_rejected_or_unknown' : 'accepted'), 'Hook response classified safely');
        if ($hookCase === 'response-redirect') {
            reset_retry(); $http = array(api(array())); Salero_Pages_Publish::tick();
            check(count(array_filter($calls, function ($method) { return $method === 'POST'; })) === 1, 'redirect outcome polls without following or repeating POST');
        }
    } else check($options[Salero_Pages_Publish::STATE]['status'] === 'hook_not_configured', 'invalid Hook rejected before POST');
    check(!$http, 'no hidden HTTP calls'); exit;
}
if (defined('DOING_AUTOSAVE')) {
    Salero_Pages_Publish::before_post(1, array('post_title' => 'Autosave'));
    Salero_Pages_Publish::transition('publish', 'draft', $posts[1]);
    check(!events(), 'DOING_AUTOSAVE suppresses public hooks'); exit;
}
foreach (array('servicio', 'sector', 'caso_exito') as $type) {
    $entity = (object) array_merge($base, array('post_type' => $type));
    Salero_Pages_Publish::transition('publish', 'draft', $entity); complete();
    check(count(events()) > 0, 'verified CPT ' . $type . ' detected');
}
foreach (array_keys(events()) as $key) delete_option($key);
foreach (array(2, 90, 91) as $id) Salero_Pages_Publish::before_post($id, array('post_title' => 'Changed'));
check(!events(), 'draft, revision and autosave ignored');
Salero_Pages_Publish::before_post(1, array('post_modified' => 'noise')); Salero_Pages_Publish::transition('publish', 'publish', $posts[1]);
Salero_Pages_Publish::before_meta(null, 1, '_edit_lock', 'noise');
check(!events(), 'administrative updates ignored');
Salero_Pages_Publish::transition('publish', 'draft', $posts[1]);
Salero_Pages_Publish::before_post(1, array('post_title' => 'Changed'));
Salero_Pages_Publish::before_meta(null, 1, 'descripcion_corta', 'New ACF');
Salero_Pages_Publish::terms(1, array(), array(2), 'category', false, array(1));
check(count(events()) === 1, 'publish, title, ACF and taxonomy grouped per request');
check(Salero_Pages_Publish::revision()['editing'], 'incomplete edit blocks revision build');
Salero_Pages_Publish::finish_request(); Salero_Pages_Publish::tick();
check(!$calls, 'debounce prevents immediate deployment');
complete(); check(!Salero_Pages_Publish::revision()['editing'], 'completed edit exposes opaque epoch');
$before = count(events()); Salero_Pages_Publish::before_meta(null, 1, 'logo_cliente', 100); complete();
check(count(events()) === $before + 1, 'relevant ACF media field queues next event');
Salero_Pages_Publish::term_changed(1, 'category'); complete(); check(count(events()) === $before + 2, 'category deletion/rename tracked before mutation');
Salero_Pages_Publish::media_meta(null, 100, '_wp_attachment_metadata', array('sizes' => array())); complete(); check(count(events()) === $before + 3, 'referenced attachment representation tracked');
Salero_Pages_Publish::transition('trash', 'publish', $posts[1]); complete(); check(count(events()) === $before + 4, 'public withdrawal queues rebuild');
Salero_Pages_Publish::routes(); $route = $routes['salero-pages/v1/revision']; $payload = json_encode($route['callback']()->data);
check(strpos($payload, 'fixture-private') === false && count(json_decode($payload, true)) === 2, 'public REST exposes epoch only, no secrets/trigger');
$options[Salero_Pages_Publish::LOCK] = array('owner' => 'another-worker', 'expires' => time() + 60);
Salero_Pages_Publish::tick(); check(!$calls, 'live lock prevents overlapping workers'); unset($options[Salero_Pages_Publish::LOCK]);
$http = array(api(array()), response(array(), 429)); Salero_Pages_Publish::tick();
check(!empty(events()) && !isset($options[Salero_Pages_Publish::STATE]['active']) && $options[Salero_Pages_Publish::STATE]['retry_at'] > time(), 'rejected hook retains queue with backoff');
reset_retry(); $http = array(api(array()), new Exception('timeout')); Salero_Pages_Publish::tick();
check(isset($options[Salero_Pages_Publish::STATE]['active']) && !empty(events()), 'timeout retains ambiguous accepted state');
$postCount = count(array_filter($calls, function ($m) { return $m === 'POST'; }));
reset_retry(); $http = array(api(array())); Salero_Pages_Publish::tick();
check(count(array_filter($calls, function ($m) { return $m === 'POST'; })) === $postCount, 'unknown outcome polls without duplicate POST');
$id = '11111111-1111-4111-8111-111111111111';
$deployment = array('id' => $id, 'environment' => 'production', 'url' => 'https://fixture.pages.dev', 'created_on' => gmdate('c'), 'deployment_trigger' => array('type' => 'deploy_hook', 'metadata' => array('branch' => 'main', 'commit_hash' => 'abc')), 'latest_stage' => array('name' => 'build', 'status' => 'active'));
reset_retry(); $http = array(api(array($deployment)), api($deployment)); Salero_Pages_Publish::tick();
check($options[Salero_Pages_Publish::STATE]['status'] === 'building', 'accepted deployment tracked until completion');
Salero_Pages_Publish::before_post(1, array('post_title' => 'Change B')); complete(); $keysB = array_keys(events()); $lastB = end($keysB);
$deployment['latest_stage'] = array('name' => 'deploy', 'status' => 'success');
$http = array(api($deployment), response(array('mode' => 'revision-guarded', 'branch' => 'main', 'commit' => 'abc', 'revision' => str_repeat('a', 64))));
Salero_Pages_Publish::tick(); check(count(events()) === 1 && isset(events()[$lastB]), 'completion acknowledges only A; B survives');
$http = array(api(array($deployment)), response(array('success' => true, 'result' => array('id' => $id)))); Salero_Pages_Publish::tick();
check($options[Salero_Pages_Publish::STATE]['status'] === 'accepted', 'pending B triggers next serialized deployment');
$deployment['latest_stage'] = array('name' => 'build', 'status' => 'failure'); $http = array(api(array($deployment)), api($deployment)); Salero_Pages_Publish::tick();
check(!empty(events()) && !isset($options[Salero_Pages_Publish::STATE]['active']), 'failed build retains pending events for retry');
check(strpos(json_encode($options), 'fixture-private') === false, 'persistent diagnostics contain no credentials');
reset_retry(); $options[Salero_Pages_Publish::LOCK] = array('owner' => 'expired', 'expires' => time() - 1);
$http = array(api(array()), response(array('success' => true)));
Salero_Pages_Publish::tick(); check(!isset($options[Salero_Pages_Publish::LOCK]) && $options[Salero_Pages_Publish::STATE]['status'] === 'accepted', 'expired lease recovered without deleting a new owner');
$deployment['latest_stage'] = array('name' => 'deploy', 'status' => 'success');
$http = array(api(array($deployment)), api($deployment), response(array('mode' => '2A-snapshot-check')));
Salero_Pages_Publish::tick(); check(!empty(events()) && $options[Salero_Pages_Publish::STATE]['status'] === 'build_receipt_invalid', 'unverified/2A receipt cannot acknowledge production changes');
check(!$http, 'all fixtures consumed, no hidden network calls');
echo "PASS: MU-plugin — $checks checks\n";
