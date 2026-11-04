<?php
/** Isolated Phase 2 preparation. No automatic hooks, writes, activation or deploy calls. */
final class Salero_Editorial_Push_Staging_Transport {
    private $url; private $editorKey; private $snapshotKey; private $sender;
    public function __construct($url, $editorKey, $snapshotKey, $sender = null) {
        $parts = parse_url($url);
        if (!$parts || !isset($parts['host']) || !isset($parts['scheme']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])
            || ($parts['path'] ?? '') !== '/rpc' || strpos($url, '/pages/webhooks/') !== false) throw new RuntimeException('staging_endpoint');
        $local = in_array($parts['host'], array('localhost', '127.0.0.1'), true);
        if (!$local && ($parts['scheme'] !== 'https' || !preg_match('/^salero-push-staging\.[a-z0-9-]+\.workers\.dev$/D', $parts['host']))) throw new RuntimeException('staging_endpoint');
        if ($local && !in_array($parts['scheme'], array('http', 'https'), true)) throw new RuntimeException('staging_endpoint');
        if (!is_string($editorKey) || strlen($editorKey) < 32 || !is_string($snapshotKey) || strlen($snapshotKey) < 32 || $editorKey === $snapshotKey) throw new RuntimeException('staging_keys');
        $this->url = $url; $this->editorKey = $editorKey; $this->snapshotKey = $snapshotKey;
        $this->sender = $sender ?: function ($url, $body) {
            if (!function_exists('wp_remote_post')) throw new RuntimeException('wordpress_transport_unavailable');
            $response = wp_remote_post($url, array('timeout' => 5, 'redirection' => 0, 'sslverify' => true,
                'headers' => array('Content-Type' => 'application/json', 'Accept' => 'application/json'), 'body' => $body));
            if (is_wp_error($response)) throw new RuntimeException('coordinator_unavailable');
            return array('status' => wp_remote_retrieve_response_code($response),
                'contentType' => wp_remote_retrieve_header($response, 'content-type'), 'body' => wp_remote_retrieve_body($response));
        };
    }
    private static function canonical($v) {
        if (is_object($v)) { $v = get_object_vars($v); ksort($v, SORT_STRING); foreach ($v as &$x) $x = self::canonical($x); return (object)$v; }
        if (!is_array($v)) return $v;
        if ($v && array_keys($v) !== range(0, count($v) - 1)) ksort($v, SORT_STRING);
        foreach ($v as &$x) $x = self::canonical($x); return $v;
    }
    private static function json($v) {
        $s = json_encode(self::canonical($v), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($s === false) throw new RuntimeException('transport_json'); return $s;
    }
    public function packet($snapshot, $generation, $batchId) {
        if (!is_array($snapshot) || !is_int($generation) || $generation < 1 || !is_string($batchId) || !preg_match('/^[a-z0-9-]{1,80}$/D', $batchId)) throw new RuntimeException('snapshot_identity');
        $packet = $snapshot; $packet['generation'] = $generation; $packet['batchId'] = $batchId;
        $metadata = array();
        foreach (array('formatVersion', 'revision', 'counts', 'sha256', 'snapshotId', 'bytes', 'generation', 'batchId') as $key) {
            if (!array_key_exists($key, $packet)) throw new RuntimeException('snapshot_format'); $metadata[$key] = $packet[$key];
        }
        $packet['signature'] = hash_hmac('sha256', self::json($metadata), $this->snapshotKey); return $packet;
    }
    public function command($operation, $args) {
        if (!in_array($operation, array('begin', 'offer', 'notify'), true) || !is_array($args)) throw new RuntimeException('transport_permission');
        $request = array('role' => 'editor', 'operation' => $operation, 'args' => $args, 'at' => time(), 'nonce' => bin2hex(random_bytes(16)));
        $request['signature'] = hash_hmac('sha256', self::json($request), $this->editorKey);
        $response = call_user_func($this->sender, $this->url, self::json($request));
        if (!is_array($response) || ($response['status'] ?? null) !== 200 || !preg_match('~^application/json(?:\s*;|$)~i', $response['contentType'] ?? '')) throw new RuntimeException('coordinator_unavailable');
        $data = json_decode($response['body'] ?? '', true);
        if (!is_array($data) || ($data['ok'] ?? null) !== true || !isset($data['value']) || !is_array($data['value'])) throw new RuntimeException('coordinator_unconfirmed');
        return $data['value'];
    }
}

/** Policy input must be resolved before a core mutation, never from save_post afterwards. */
final class Salero_Editorial_Push_Write_Policy {
    public static function visibleChange($postType, $beforeStatus, $afterStatus, $referencedPublicContent = false) {
        if (!is_bool($referencedPublicContent)) throw new RuntimeException('reference_state_unknown');
        if ($referencedPublicContent) return true;
        if (!in_array($postType, array('servicios', 'sectores', 'casos-exito', 'post'), true)) return false;
        return $beforeStatus === 'publish' || $afterStatus === 'publish';
    }
    public static function authorize($visibleChange, $state) {
        if (!is_bool($visibleChange)) throw new RuntimeException('reference_state_unknown');
        if (!$visibleChange) return true; // Drafts, revisions and unrelated administration remain available.
        if (!is_array($state) || ($state['gate'] ?? null) !== 'editing' || !isset($state['permit'])
            || !is_array($state['permit']) || ($state['permit']['closed'] ?? null) !== false
            || !is_int($state['permit']['generation'] ?? null) || $state['permit']['generation'] < 1
            || !is_string($state['permit']['batchId'] ?? null) || !preg_match('/^[a-z0-9-]{1,80}$/D', $state['permit']['batchId'])) throw new RuntimeException('editorial_unannounced');
        return true; // Caller must hold the durable local writer lock across this check and registration.
    }
}
