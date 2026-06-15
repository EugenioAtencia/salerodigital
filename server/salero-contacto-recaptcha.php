<?php
/**
 * Handler de contacto para Salero Digital.
 * Ubicación recomendada en producción:
 * https://cms.webagencia360.com/salero-contacto.php
 *
 * Requisitos:
 * 1. Sustituir PENDIENTE_SECRET_KEY_RECAPTCHA por la clave secreta real de Google reCAPTCHA.
 * 2. Subir este archivo a la raíz del WordPress CMS con el nombre salero-contacto.php.
 * 3. Comprobar que wp_mail() funciona correctamente en el CMS.
 */

declare(strict_types=1);

$destinationEmail = 'info@eugenioatencia.com';
$siteBaseUrl = 'https://agenciaconsalero.es';
$successUrl = $siteBaseUrl . '/hablamos/gracias/';
$errorUrl = $siteBaseUrl . '/hablamos/?error=envio#contacto-salero';
$spamUrl = $siteBaseUrl . '/hablamos/?error=spam#contacto-salero';
$captchaUrl = $siteBaseUrl . '/hablamos/?error=captcha#contacto-salero';
$recaptchaSecret = '6LfBKSEtAAAAAH9VUHLLx3xkj3zUne199FwEAiJB';

function redirect_to(string $url): void
{
    header('Location: ' . $url, true, 303);
    exit;
}

function post_value(string $key): string
{
    return isset($_POST[$key]) ? trim((string) $_POST[$key]) : '';
}

function clean_text(string $value): string
{
    $value = strip_tags($value);
    $value = preg_replace('/[\r\n]+/', ' ', $value) ?? $value;
    return trim($value);
}

function clean_multiline(string $value): string
{
    $value = strip_tags($value);
    $value = preg_replace('/\r\n|\r/', "\n", $value) ?? $value;
    $value = preg_replace('/\n{3,}/', "\n\n", $value) ?? $value;
    return trim($value);
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function row_html(string $label, string $value): string
{
    $displayValue = $value !== '' ? $value : 'No indicado';

    return '<tr>'
        . '<td style="width:34%;padding:14px 0;border-bottom:1px solid #e6dfca;color:#1e2a21;font-weight:800;vertical-align:top;">' . h($label) . '</td>'
        . '<td style="padding:14px 0;border-bottom:1px solid #e6dfca;color:#1e2a21;vertical-align:top;">' . nl2br(h($displayValue)) . '</td>'
        . '</tr>';
}

function is_valid_email_address(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function verify_recaptcha(string $token, string $secret): bool
{
    if ($secret === '' || $secret === 'PENDIENTE_SECRET_KEY_RECAPTCHA') {
        return false;
    }

    if ($token === '') {
        return false;
    }

    $payload = http_build_query([
        'secret' => $secret,
        'response' => $token,
        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => $payload,
            'timeout' => 8,
        ],
    ]);

    $response = file_get_contents('https://www.google.com/recaptcha/api/siteverify', false, $context);
    if ($response === false) {
        return false;
    }

    $result = json_decode($response, true);
    return is_array($result) && !empty($result['success']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect_to($siteBaseUrl . '/hablamos/');
}

// Honeypot antispam: este campo debe venir vacío.
if (post_value('website') !== '') {
    redirect_to($spamUrl);
}

$recaptchaToken = post_value('g-recaptcha-response');
if (!verify_recaptcha($recaptchaToken, $recaptchaSecret)) {
    redirect_to($captchaUrl);
}

$nombre = clean_text(post_value('Nombre'));
$empresa = clean_text(post_value('Empresa'));
$telefono = clean_text(post_value('Telefono'));
$email = clean_text(post_value('Email'));
$localidad = clean_text(post_value('Localidad'));
$webRedes = clean_text(post_value('Web_o_redes'));
$tipoNegocio = clean_text(post_value('Tipo_de_negocio'));
$necesidad = clean_text(post_value('Necesidad'));
$objetivo = clean_text(post_value('Objetivo_principal'));
$mensaje = clean_multiline(post_value('Mensaje'));
$privacidad = clean_text(post_value('Acepta_privacidad'));

$required = [$nombre, $empresa, $telefono, $email, $localidad, $tipoNegocio, $necesidad, $objetivo, $privacidad];
foreach ($required as $field) {
    if ($field === '') {
        redirect_to($errorUrl);
    }
}

if (!is_valid_email_address($email)) {
    redirect_to($errorUrl);
}

if ($privacidad !== 'Sí') {
    redirect_to($errorUrl);
}

$subject = 'Nueva cata digital desde Salero Digital';
$origin = $_SERVER['HTTP_REFERER'] ?? $siteBaseUrl . '/hablamos/';
$ip = $_SERVER['REMOTE_ADDR'] ?? 'No disponible';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'No disponible';

$rows = '';
$rows .= row_html('Nombre y apellidos', $nombre);
$rows .= row_html('Empresa o negocio', $empresa);
$rows .= row_html('Teléfono', $telefono);
$rows .= row_html('Email', $email);
$rows .= row_html('Localidad', $localidad);
$rows .= row_html('Web o redes actuales', $webRedes);
$rows .= row_html('Tipo de negocio', $tipoNegocio);
$rows .= row_html('Qué necesita', $necesidad);
$rows .= row_html('Objetivo principal', $objetivo);
$rows .= row_html('Mensaje o punto de partida', $mensaje);
$rows .= row_html('Acepta contacto', $privacidad);
$rows .= row_html('IP', $ip);
$rows .= row_html('Origen', $origin);
$rows .= row_html('Navegador', $userAgent);

$body = '<!doctype html>'
    . '<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
    . '<body style="margin:0;padding:0;background:#f6f0df;font-family:Arial,Helvetica,sans-serif;color:#1e2a21;">'
    . '<div style="padding:28px 14px;">'
    . '<div style="max-width:820px;margin:0 auto;background:#fffdf7;border:1px solid #e1dac6;border-radius:24px;overflow:hidden;box-shadow:0 12px 34px rgba(30,42,33,.08);">'
    . '<div style="background:#1e2a21;padding:34px 36px;color:#fffdf7;">'
    . '<h1 style="margin:0 0 10px;font-size:34px;line-height:1.05;color:#fffdf7;">Nueva cata digital</h1>'
    . '<p style="margin:0;color:#d7d2c4;font-size:16px;line-height:1.5;">Solicitud recibida desde la página de contacto de Salero Digital.</p>'
    . '</div>'
    . '<div style="padding:32px 36px;">'
    . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:16px;line-height:1.45;">'
    . $rows
    . '</table>'
    . '<div style="margin-top:28px;padding:18px 20px;border-radius:18px;background:#f6f0df;color:#596a3d;font-size:15px;line-height:1.5;">'
    . 'Formulario enviado desde <a style="color:#1e62d0;font-weight:700;" href="' . h($origin) . '">' . h($origin) . '</a>'
    . '</div>'
    . '</div>'
    . '</div>'
    . '</div>'
    . '</body></html>';

$headers = [
    'Content-Type: text/html; charset=UTF-8',
    'From: Salero Digital <no-reply@webagencia360.com>',
    'Reply-To: ' . $nombre . ' <' . $email . '>',
];

// Intentar cargar WordPress para usar wp_mail().
$wpLoadPaths = [
    __DIR__ . '/wp-load.php',
    dirname(__DIR__) . '/wp-load.php',
];

foreach ($wpLoadPaths as $wpLoadPath) {
    if (file_exists($wpLoadPath)) {
        require_once $wpLoadPath;
        break;
    }
}

$sent = false;

if (function_exists('wp_mail')) {
    $sent = wp_mail($destinationEmail, $subject, $body, $headers);
} else {
    $sent = mail($destinationEmail, $subject, $body, implode("\r\n", $headers));
}

if ($sent) {
    redirect_to($successUrl);
}

redirect_to($errorUrl);
