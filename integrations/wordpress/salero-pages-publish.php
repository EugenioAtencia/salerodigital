<?php
/**
 * Plugin Name: Salero Pages Publish
 * Description: Prepared editorial queue. Disabled until explicit server configuration.
 * Version: 0.1.0
 * Install only in 2B, under the verified WordPress wp-content/mu-plugins/.
 */
if (!defined('ABSPATH')) { exit; }

final class Salero_Pages_Publish {
    const PREFIX = 'salero_pages_event_';
    const STATE = 'salero_pages_publish_state';
    const LOCK = 'salero_pages_publish_lock';
    const EPOCH = 'salero_pages_editorial_epoch';
    const CRON = 'salero_pages_publish_tick';
    private static $event_id = null;
    private static $lock_owner = null;
    private static $types = array('post', 'servicio', 'sector', 'caso_exito');
    // Only fields consumed by collection/Home renderers, not SEO/admin meta.
    private static $meta = array('_thumbnail_id', 'claim', 'subtitulo_comercial', 'titular_seo', 'meta_description',
        'nombre_tecnico', 'sector', 'sector_cliente', 'tipo_de_cliente', 'servicio_principal', 'servicios', 'servicio',
        'dato_destacado', 'mejora_conseguida', 'resultado', 'visual_label', 'etiqueta_visual',
        'resumen', 'descripcion_corta', 'cliente_nombre', 'nombre_caso', 'nombre_cliente', 'cliente',
        'slug_caso', 'slug', 'url_caso', 'enlace_caso', 'imagen_caso', 'imagen_principal', 'imagen_destacada',
        'imagen_campana', 'captura_campana', 'hero_image', 'cover_image', 'video_principal', 'video_principal_url',
        'video_caso', 'video_campana', 'video', 'video_poster', 'poster_video', 'poster', 'logo_cliente', 'logo_marca', 'logo');

    public static function enabled() { return defined('SALERO_PAGES_ENABLED') && SALERO_PAGES_ENABLED === true; }
    public static function boot() {
        if (!self::enabled()) { return; }
        add_action('pre_post_update', array(__CLASS__, 'before_post'), 10, 2);
        add_action('transition_post_status', array(__CLASS__, 'transition'), 10, 3);
        add_action('wp_after_insert_post', array(__CLASS__, 'saved'), 10, 4);
        add_action('before_delete_post', array(__CLASS__, 'before_delete'), 10, 2);
        foreach (array('add_post_metadata', 'update_post_metadata', 'delete_post_metadata') as $hook) {
            add_filter($hook, array(__CLASS__, 'before_meta'), 10, 5);
        }
        add_action('set_object_terms', array(__CLASS__, 'terms'), 10, 6);
        add_action('edit_terms', array(__CLASS__, 'term_changed'), 10, 2);
        add_action('pre_delete_term', array(__CLASS__, 'term_changed'), 10, 2);
        add_action('edit_attachment', array(__CLASS__, 'media_changed'));
        add_action('delete_attachment', array(__CLASS__, 'media_changed'));
        foreach (array('add_post_metadata', 'update_post_metadata', 'delete_post_metadata') as $hook) {
            add_filter($hook, array(__CLASS__, 'media_meta'), 10, 5);
        }
        add_action('shutdown', array(__CLASS__, 'finish_request'));
        add_action(self::CRON, array(__CLASS__, 'tick'));
        add_action('rest_api_init', array(__CLASS__, 'routes'));
        if (!wp_next_scheduled(self::CRON)) { self::schedule(60); }
    }
    public static function public_post($id) {
        $post = get_post($id);
        return $post && in_array($post->post_type, self::$types, true) && $post->post_status === 'publish'
            && !wp_is_post_revision($id) && !wp_is_post_autosave($id)
            && !(defined('DOING_AUTOSAVE') && DOING_AUTOSAVE);
    }
    public static function mark() {
        if (!self::enabled()) { return; }
        if (self::$event_id === null) { self::$event_id = wp_generate_uuid4(); }
        $key = self::PREFIX . self::$event_id;
        $event = array('at' => time(), 'complete' => false);
        if (!add_option($key, $event, '', false)) { update_option($key, $event, false); }
        // Independent UUID epoch, never a public credential or content payload.
        update_option(self::EPOCH, wp_generate_uuid4(), false);
    }
    public static function finish_request() {
        if (self::$event_id === null) { return; }
        update_option(self::PREFIX . self::$event_id, array('at' => time(), 'complete' => true), false);
        self::$event_id = null;
        self::schedule(60);
    }
    public static function before_post($id, $data) {
        if (!self::public_post($id)) { return; }
        $post = get_post($id);
        foreach (array('post_title', 'post_excerpt', 'post_content', 'post_date', 'post_name', 'post_password', 'post_status') as $field) {
            if (isset($data[$field]) && $data[$field] !== $post->$field) { self::mark(); return; }
        }
    }
    public static function transition($new, $old, $post) {
        if ($new !== $old && !(defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)
            && in_array($post->post_type, self::$types, true) && ($new === 'publish' || $old === 'publish')
            && !wp_is_post_revision($post->ID) && !wp_is_post_autosave($post->ID)) { self::mark(); }
    }
    public static function saved($id, $post, $update, $before) {
        if (!self::public_post($id)) { return; }
        if (!$before || $before->post_status !== 'publish') { self::mark(); return; }
        foreach (array('post_title', 'post_excerpt', 'post_content', 'post_date', 'post_name', 'post_password') as $field) {
            if ($post->$field !== $before->$field) { self::mark(); return; }
        }
    }
    public static function before_delete($id, $post) { if (self::public_post($id)) { self::mark(); } }
    public static function before_meta($check, $id, $key, $value, $extra = null) {
        if (in_array($key, self::$meta, true) && self::public_post($id)
            && get_post_meta($id, $key, true) !== $value) { self::mark(); }
        return $check;
    }
    public static function terms($id, $terms, $tt_ids, $taxonomy, $append, $old_tt_ids) {
        if ($taxonomy === 'category' && $tt_ids !== $old_tt_ids && self::public_post($id)) { self::mark(); }
    }
    public static function term_changed($term_id, $taxonomy) {
        if ($taxonomy !== 'category') { return; }
        $ids = get_objects_in_term($term_id, $taxonomy);
        if (!is_wp_error($ids)) { foreach ($ids as $id) { if (self::public_post($id)) { self::mark(); break; } } }
    }
    public static function media_changed($id) {
        // ACF image/video fields store attachment IDs; resolve references only on
        // public entities. URL-valued external assets are not rewritten by WP.
        $clauses = array('relation' => 'OR');
        foreach (self::$meta as $key) { $clauses[] = array('key' => $key, 'value' => $id, 'compare' => '='); }
        $posts = get_posts(array('post_type' => self::$types, 'post_status' => 'publish', 'fields' => 'ids',
            'posts_per_page' => 1, 'meta_query' => $clauses));
        if ($posts) { self::mark(); }
    }
    public static function media_meta($check, $id, $key, $value, $extra = null) {
        if (in_array($key, array('_wp_attachment_metadata', '_wp_attached_file', '_wp_attachment_image_alt'), true)
            && get_post_meta($id, $key, true) !== $value) { self::media_changed($id); }
        return $check;
    }
    private static function events() {
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare("SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s", $wpdb->esc_like(self::PREFIX) . '%'), ARRAY_A);
        $events = array();
        foreach ($rows as $row) { $events[$row['option_name']] = maybe_unserialize($row['option_value']); }
        return $events;
    }
    private static function raw_option($name) {
        global $wpdb;
        return maybe_unserialize($wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name = %s", $name)));
    }
    public static function revision() {
        $events = self::events(); $editing = false;
        foreach ($events as $event) { if (empty($event['complete'])) { $editing = true; } }
        return array('revision' => hash('sha256', (string) self::raw_option(self::EPOCH)), 'editing' => $editing);
    }
    public static function routes() {
        // Read-only opaque epoch; no build action, queue details or secrets exposed.
        register_rest_route('salero-pages/v1', '/revision', array('methods' => 'GET', 'permission_callback' => '__return_true',
            'callback' => function () {
                $response = new WP_REST_Response(self::revision());
                $response->header('Cache-Control', 'no-store, no-cache, must-revalidate');
                return $response;
            }));
    }
    private static function schedule($delay) {
        $next = wp_next_scheduled(self::CRON);
        if (!$next || $next > time() + $delay) {
            if ($next) { wp_unschedule_event($next, self::CRON); }
            wp_schedule_single_event(time() + $delay, self::CRON);
        }
    }
    private static function lock() {
        global $wpdb;
        $owner = array('owner' => wp_generate_uuid4(), 'expires' => time() + 120);
        if (!add_option(self::LOCK, $owner, '', false)) {
            $old = self::raw_option(self::LOCK);
            if (!$old || $old['expires'] >= time()) { return false; }
            // Compare-and-delete prevents deleting another worker's newer lease.
            $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s", self::LOCK, maybe_serialize($old)));
            wp_cache_delete(self::LOCK, 'options');
            if (!add_option(self::LOCK, $owner, '', false)) { return false; }
        }
        self::$lock_owner = $owner;
        return true;
    }
    private static function unlock() {
        global $wpdb;
        $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s", self::LOCK, maybe_serialize(self::$lock_owner)));
        wp_cache_delete(self::LOCK, 'options');
        self::$lock_owner = null;
    }
    private static function api($path) {
        if (!defined('SALERO_PAGES_READ_TOKEN') || !defined('SALERO_PAGES_ACCOUNT_ID')) { throw new RuntimeException('monitor_not_configured'); }
        $url = 'https://api.cloudflare.com/client/v4/accounts/' . rawurlencode(SALERO_PAGES_ACCOUNT_ID) . '/pages/projects/salerodigital/' . $path;
        $r = wp_remote_get($url, array('timeout' => 15, 'redirection' => 0, 'headers' => array('Authorization' => 'Bearer ' . SALERO_PAGES_READ_TOKEN)));
        if (is_wp_error($r) || wp_remote_retrieve_response_code($r) !== 200) { throw new RuntimeException('monitor_unavailable'); }
        $data = json_decode(wp_remote_retrieve_body($r), true);
        if (empty($data['success']) || !isset($data['result'])) { throw new RuntimeException('monitor_invalid'); }
        return $data['result'];
    }
    private static function retry(&$state, $code) {
        $state['attempts'] = min(10, ($state['attempts'] ?? 0) + 1);
        $state['status'] = $code;
        $state['retry_at'] = time() + min(3600, 60 * (2 ** ($state['attempts'] - 1)));
        self::schedule($state['retry_at'] - time());
    }
    public static function tick() {
        if (!self::enabled()) { return; }
        if (!self::lock()) { self::schedule(60); return; }
        $state = get_option(self::STATE, array());
        try {
            if (($state['retry_at'] ?? 0) > time()) { self::schedule($state['retry_at'] - time()); return; }
            if (!empty($state['active'])) {
                $active = $state['active'];
                if (empty($active['id'])) {
                    $list = self::api('deployments?env=production&per_page=20');
                    $matches = array_values(array_filter($list, function ($d) use ($active) {
                        return ($d['deployment_trigger']['type'] ?? '') === 'deploy_hook'
                            && ($d['deployment_trigger']['metadata']['branch'] ?? '') === 'main'
                            && strtotime($d['created_on']) >= $active['started'];
                    }));
                    if (count($matches) !== 1) { throw new RuntimeException('accepted_awaiting_unambiguous_deployment'); }
                    $state['active']['id'] = $matches[0]['id']; $active = $state['active'];
                }
                $d = self::api('deployments/' . rawurlencode($active['id']));
                if (($d['environment'] ?? '') !== 'production' || ($d['deployment_trigger']['metadata']['branch'] ?? '') !== 'main') { throw new RuntimeException('deployment_identity_invalid'); }
                $stage = $d['latest_stage'] ?? array();
                if (in_array($stage['status'] ?? '', array('failure', 'canceled'), true)) {
                    unset($state['active']); self::retry($state, 'build_failed');
                } elseif (($stage['name'] ?? '') === 'deploy' && ($stage['status'] ?? '') === 'success') {
                    $receipt = wp_remote_get(rtrim($d['url'], '/') . '/salero-build.json', array('timeout' => 15, 'redirection' => 0));
                    $record = is_wp_error($receipt) ? null : json_decode(wp_remote_retrieve_body($receipt), true);
                    if (is_wp_error($receipt) || wp_remote_retrieve_response_code($receipt) !== 200
                        || ($record['mode'] ?? '') !== 'revision-guarded' || ($record['branch'] ?? '') !== 'main'
                        || !preg_match('/^[a-f0-9]{64}$/D', $record['revision'] ?? '')
                        || ($record['commit'] ?? '') !== ($d['deployment_trigger']['metadata']['commit_hash'] ?? null)) {
                        throw new RuntimeException('build_receipt_invalid');
                    }
                    foreach ($active['events'] as $key) { delete_option($key); }
                    $state = array('status' => 'completed', 'deployment' => $active['id'], 'completed_at' => time());
                    self::schedule(60);
                } else { $state['status'] = 'building'; self::schedule(30); }
            } else {
                $events = self::events();
                if (!$events) { $state['status'] = 'idle'; self::schedule(60); return; }
                foreach ($events as $event) {
                    if (empty($event['complete']) || $event['at'] > time() - 60) { self::schedule(60); return; }
                }
                // Also avoid overlap with Git-origin builds currently in flight.
                foreach (self::api('deployments?env=production&per_page=20') as $d) {
                    if (in_array($d['latest_stage']['status'] ?? '', array('active', 'idle'), true)) { $state['status'] = 'waiting_existing_build'; self::schedule(60); return; }
                }
                if (!defined('SALERO_PAGES_DEPLOY_HOOK') || !preg_match('~^https://api\.cloudflare\.com/client/v4/pages/webhooks/[a-zA-Z0-9-]+$~D', SALERO_PAGES_DEPLOY_HOOK)) { throw new RuntimeException('hook_not_configured'); }
                // Persist before the HTTP request: a crash/timeout might mean it
                // was accepted. Never blindly POST again while outcome is unknown.
                $state['active'] = array('started' => time(), 'events' => array_keys($events), 'id' => null);
                $state['status'] = 'dispatching'; update_option(self::STATE, $state, false);
                $r = wp_remote_post(SALERO_PAGES_DEPLOY_HOOK, array('timeout' => 15, 'redirection' => 0, 'body' => array()));
                if (is_wp_error($r)) { throw new RuntimeException('hook_outcome_unknown'); }
                $code = wp_remote_retrieve_response_code($r);
                if ($code < 200 || $code >= 300) {
                    if ($code >= 400 && $code < 500 && $code !== 408) { unset($state['active']); }
                    throw new RuntimeException('hook_http_rejected_or_unknown');
                }
                $body = json_decode(wp_remote_retrieve_body($r), true);
                if (empty($body['success'])) { throw new RuntimeException('hook_response_unknown'); }
                $id = $body['result']['id'] ?? null;
                // Hook result IDs may identify a job rather than a deployment.
                // Associate via the deployment API on the next tick, never assume equivalence.
                if (is_string($id) && preg_match('/^[a-f0-9-]{36}$/D', $id)) { $state['active']['accepted_id'] = $id; }
                $state['status'] = 'accepted'; $state['attempts'] = 0; unset($state['retry_at']); self::schedule(30);
            }
        } catch (Throwable $error) {
            // Fixed safe codes only: WP_Error, HTTP bodies, URLs and tokens are
            // never saved in diagnostic state or printed to public logs.
            $safe = array('monitor_not_configured', 'monitor_unavailable', 'monitor_invalid',
                'accepted_awaiting_unambiguous_deployment', 'deployment_identity_invalid', 'build_receipt_invalid',
                'hook_not_configured', 'hook_outcome_unknown', 'hook_http_rejected_or_unknown', 'hook_response_unknown');
            $code = in_array($error->getMessage(), $safe, true) ? $error->getMessage() : 'internal_failure';
            self::retry($state, $code);
        } finally {
            update_option(self::STATE, $state, false); self::unlock();
        }
    }
}
Salero_Pages_Publish::boot();
