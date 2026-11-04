<?php
/** Phase 1 library only: no boot hooks, activation, filesystem writes or HTTP calls. */
final class Salero_Editorial_Snapshot_Exporter {
    const COLLECTIONS = array('servicios', 'sectores', 'casos-exito', 'posts');
    private static function fail($code) { throw new RuntimeException($code); }
    private static function revision($read) {
        $r = $read();
        if (!is_array($r) || !isset($r['revision']) || !is_string($r['revision']) || !preg_match('/^[a-f0-9]{64}$/D', $r['revision'])) self::fail('revision_invalid');
        if (!array_key_exists('editing', $r) || $r['editing'] !== false) self::fail('editing_or_incomplete');
        return $r['revision'];
    }
    private static function canonical($v) {
        if (is_object($v)) { $a = get_object_vars($v); ksort($a, SORT_STRING); foreach ($a as &$x) $x = self::canonical($x); return (object)$a; }
        if (!is_array($v)) return $v;
        $list = !$v || array_keys($v) === range(0, count($v) - 1);
        if (!$list) ksort($v, SORT_STRING);
        foreach ($v as &$x) $x = self::canonical($x);
        return $v;
    }
    private static function encode($v) {
        $s = json_encode(self::canonical($v), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        if ($s === false) self::fail('json_encoding');
        return $s;
    }
    private static function total($v) {
        if (!(is_int($v) || is_string($v)) || !preg_match('/^(0|[1-9][0-9]*)$/D', (string)$v) || (float)$v > 9007199254740991) self::fail('pagination_invalid');
        return (int)$v;
    }
    private static function validate($item, $type) {
        if (!is_array($item) || !isset($item['id']) || !is_int($item['id']) || $item['id'] <= 0 || $item['id'] > 9007199254740991) self::fail('record_invalid');
        $slug = $item['slug'] ?? null;
        if (!is_string($slug) || !preg_match('/^(?:[a-z0-9_-]|%[a-f0-9]{2})+$/iD', $slug) || in_array(strtolower(rawurldecode($slug)), array('detalle', 'page', 'index'), true)) self::fail('slug_invalid');
        if (($item['status'] ?? null) !== 'publish' || !is_string($item['title']['rendered'] ?? null) || !trim(strip_tags($item['title']['rendered'])) || !is_string($item['excerpt']['rendered'] ?? null)) self::fail('record_invalid');
        if (!empty($item['password']) || !empty($item['content']['protected']) || !empty($item['excerpt']['protected'])) self::fail('protected_record');
        if ($type === 'posts') {
            if (!is_string($item['content']['rendered'] ?? null)) self::fail('record_invalid');
            $date = $item['date'] ?? null;
            $parsed = is_string($date) ? DateTime::createFromFormat('!Y-m-d\TH:i:s', $date) : false;
            if (!$parsed || $parsed->format('Y-m-d\TH:i:s') !== $date) self::fail('date_invalid');
            self::postRelations($item);
        }
        foreach (array('acf', 'salero_acf') as $key) if (array_key_exists($key, $item) && $item[$key] !== false && !is_array($item[$key]) && !is_object($item[$key])) self::fail('acf_invalid');
    }
    private static function postRelations($item) {
        $mediaId = $item['featured_media'] ?? 0;
        if (!is_int($mediaId) || $mediaId < 0) self::fail('snapshot_media_missing');
        if ($mediaId) {
            $media = $item['_embedded']['wp:featuredmedia'] ?? array();
            if (!is_array($media) || count($media)!==1 || ($media[0]['id'] ?? null)!==$mediaId || !is_string($media[0]['alt_text'] ?? null)) self::fail('snapshot_media_missing');
            $url = parse_url($media[0]['source_url'] ?? '');
            if (!$url || empty($url['host']) || !in_array($url['scheme'] ?? '', array('http','https'),true) || isset($url['user']) || isset($url['pass'])) self::fail('snapshot_media_missing');
        }
        $embedded = $item['_embedded']['wp:term'] ?? array();
        foreach (array('categories'=>'category','tags'=>'post_tag') as $field=>$taxonomy) {
            if (!array_key_exists($field,$item)) continue;
            $ids=$item[$field];
            if (!is_array($ids) || count(array_unique($ids,SORT_REGULAR))!==count($ids) || !is_array($embedded)) self::fail('snapshot_terms_missing');
            foreach ($ids as $id) if (!is_int($id) || $id<1) self::fail('snapshot_terms_missing');
            $found=array();
            foreach ($embedded as $group) {
                if (!is_array($group)) self::fail('snapshot_terms_missing');
                foreach ($group as $term) if (($term['taxonomy'] ?? null)===$taxonomy) {
                    $id=$term['id'] ?? null;
                    if (!in_array($id,$ids,true) || isset($found[$id]) || !is_string($term['name'] ?? null) || !trim($term['name']) || !is_string($term['slug'] ?? null) || !$term['slug']) self::fail('snapshot_terms_missing');
                    $found[$id]=true;
                }
            }
            if (count($found)!==count($ids)) self::fail('snapshot_terms_missing');
        }
    }
    private static function collect($pageReader, $perPage, $types) {
        $result = array(); $globalIds = array();
        foreach (self::COLLECTIONS as $type) {
            if (!in_array($type, $types, true)) { $result[$type] = array(); continue; }
            $items = array(); $slugs = array(); $expected = null; $pages = null;
            for ($page = 1; $pages === null || $page <= $pages; $page++) {
                $r = $pageReader($type, $page, $perPage);
                if (!is_array($r) || ($r['status'] ?? null) !== 200) self::fail('page_http');
                if (!preg_match('~^application/json(?:\s*;|$)~i', $r['contentType'] ?? '')) self::fail('page_content_type');
                $total = self::total($r['total'] ?? null); $n = self::total($r['totalPages'] ?? null);
                if ($n !== (int)ceil($total / $perPage)) self::fail('pagination_invalid');
                if ($expected === null) { $expected = $total; $pages = $n; }
                if ($total !== $expected || $n !== $pages) self::fail('pagination_changed');
                $data = $r['items'] ?? null;
                if (!is_array($data) || ($data && array_keys($data) !== range(0, count($data) - 1))) self::fail('page_format');
                if (count($data) !== min($perPage, max(0, $total - ($page - 1) * $perPage))) self::fail('page_incomplete');
                foreach ($data as $item) {
                    self::validate($item, $type);
                    $slug = strtolower(rawurldecode($item['slug']));
                    if (isset($slugs[$slug]) || isset($globalIds[$item['id']])) self::fail('duplicate_record');
                    $slugs[$slug] = true; $globalIds[$item['id']] = true; $items[] = $item;
                }
            }
            if (count($items) !== $expected) self::fail('collection_incomplete');
            $result[$type] = $items;
        }
        return $result;
    }
    public static function export($revisionReader, $pageReader, $perPage = 100, $types = null) {
        if (!is_int($perPage) || $perPage < 1 || $perPage > 100) self::fail('page_size');
        if ($types === null) $types = self::COLLECTIONS;
        if ($types !== self::COLLECTIONS && $types !== array('posts')) self::fail('export_scope');
        $before = self::revision($revisionReader);
        $first = self::collect($pageReader, $perPage, $types);
        if (self::revision($revisionReader) !== $before) self::fail('revision_changed');
        $second = self::collect($pageReader, $perPage, $types);
        if (self::encode($first) !== self::encode($second)) self::fail('snapshot_changed');
        if (self::revision($revisionReader) !== $before) self::fail('revision_changed');
        $counts = array(); foreach ($first as $type => $items) $counts[$type] = count($items);
        $body = self::encode(array('formatVersion' => 1, 'revision' => $before, 'counts' => $counts, 'collections' => $first));
        $hash = hash('sha256', $body);
        return array('formatVersion' => 1, 'revision' => $before, 'counts' => $counts, 'sha256' => $hash,
            'snapshotId' => 'sha256:' . $hash, 'bytes' => strlen($body), 'body' => $body);
    }
}

/** Future explicit caller only. Uses WordPress REST internally as an anonymous public reader. */
final class Salero_WordPress_Snapshot_Source {
    // Resolve exactly the references used by the established case renderer inside both guarded reads.
    public static function enrichCase($item, $readMedia) {
        $a = $item['salero_acf'] ?? ($item['acf'] ?? array()); $a = (array)$a;
        $keys = array('hero_video','video_hero','video_fondo','fondo_video','background_video','hero_background_video',
            'video_portada','portada_video','video_principal','video_principal_url','video_principal_caso','video_caso','video_campana','video',
            'hero_poster','poster_hero','video_poster','poster_video','poster','hero_image','imagen_hero','imagen_principal','imagen_caso','imagen_destacada','imagen_campana','cover_image','logo_cliente','logo_marca','logo');
        $values = array(); foreach ($keys as $key) if (isset($a[$key])) $values[] = $a[$key];
        foreach (($a['galeria_caso'] ?? array()) as $row) foreach (array('imagen','video') as $key) if (isset($row[$key])) $values[] = $row[$key];
        $media = array();
        foreach ($values as $value) {
            if (is_object($value)) $value = (array)$value;
            if (is_array($value) && (!empty($value['url']) || !empty($value['source_url']) || !empty($value['guid']['rendered']))) continue;
            $id = is_array($value) ? ($value['ID'] ?? ($value['id'] ?? ($value['attachment_id'] ?? ($value['media_id'] ?? null)))) : $value;
            if (!(is_int($id) || (is_string($id) && preg_match('/^[0-9]+$/D', $id))) || (int)$id <= 0) continue;
            $id = (int)$id; if (isset($media[$id])) continue;
            $record = $readMedia($id);
            if (!is_array($record) || ($record['id'] ?? null) !== $id || !is_string($record['source_url'] ?? null) || !preg_match('~^https?://~', $record['source_url'])) throw new RuntimeException('snapshot_media_missing');
            $media[$id] = $record;
        }
        if ($media) $item['salero_snapshot_media'] = (object)$media;
        return $item;
    }
    private static function items($type, $items) {
        if ($type !== 'casos-exito' || !is_array($items)) return $items;
        return array_map(function ($item) {
            return self::enrichCase($item, function ($id) {
                $request = new WP_REST_Request('GET', '/wp/v2/media/' . $id);
                $request->set_query_params(array('context' => 'view'));
                $response = rest_do_request($request);
                if (is_wp_error($response) || $response->get_status() !== 200) throw new RuntimeException('snapshot_media_missing');
                return rest_get_server()->response_to_data($response, false);
            });
        }, $items);
    }
    public static function export($perPage = 100, $blogOnly = false, $revisionReader = null) {
        if ((!$revisionReader && !class_exists('Salero_Pages_Publish')) || !class_exists('WP_REST_Request')) throw new RuntimeException('wordpress_source_unavailable');
        $user = get_current_user_id(); wp_set_current_user(0);
        try {
            return Salero_Editorial_Snapshot_Exporter::export($revisionReader ?: array('Salero_Pages_Publish', 'revision'), function ($type, $page, $size) {
                $request = new WP_REST_Request('GET', '/wp/v2/' . $type);
                $request->set_query_params(array('context' => 'view', 'status' => 'publish', '_embed' => 1, 'page' => $page,
                    'per_page' => $size, 'orderby' => 'date', 'order' => 'desc'));
                $response = rest_do_request($request);
                if (is_wp_error($response)) throw new RuntimeException('internal_rest_failed');
                $headers = array_change_key_case($response->get_headers(), CASE_LOWER);
                return array('status' => $response->get_status(), 'contentType' => $headers['content-type'] ?? 'application/json',
                    'total' => $headers['x-wp-total'] ?? null, 'totalPages' => $headers['x-wp-totalpages'] ?? null,
                    'items' => self::items($type, rest_get_server()->response_to_data($response, true)));

            }, $perPage, $blogOnly ? array('posts') : null);
        } finally { wp_set_current_user($user); }
    }
}
