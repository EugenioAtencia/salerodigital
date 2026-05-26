<?php
/**
 * Handler de contacto para Salero Digital.
 * Ubicación recomendada en producción:
 * https://cms.webagencia360.com/salero-contacto.php
 *
 * Requisitos:
 * 1. Sustituir PENDIENTE_SECRET_KEY_RECAPTCHA por la clave secreta real de Google reCAPTCHA v2.
 * 2. Subir este archivo a la raíz del WordPress CMS con el nombre salero-contacto.php.
 * 3. Comprobar que wp_mail() funciona correctamente en el CMS.
 */

declare(strict_types=1);

$destinationEmail = 'info@eugenioatencia.com';
$successUrl = 'https://salero.webagencia360.com/hablamos/gracias/';
$errorUrl = 'https://salero.webagencia360.com/hablamos/?error=envio#contacto-salero';
$spamUrl = 'https://salero.webagencia360.com/hablamos/?error=spam#contacto-salero';
$captchaUrl = 'https://salero.webagencia360.com/hablamos/?error=captcha#contacto-salero';
$recaptchaSecret = 'PENDIENTE_SECRET_KEY_RECAPTCHA';

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
    redirect_to('https://salero.webagencia360.com/hablamos/');
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

$bodyLines = [
    'Nueva solicitud de cata digital desde Salero Digital',
    '',
    'Nombre y apellidos: ' . $nombre,
    'Empresa o negocio: ' . $empresa,
    'Teléfono: ' . $telefono,
    'Email: ' . $email,
    'Localidad: ' . $localidad,
    'Web o redes actuales: ' . ($webRedes !== '' ? $webRedes : 'No indicado'),
    'Tipo de negocio: ' . $tipoNegocio,
    'Qué necesita: ' . $necesidad,
    'Objetivo principal: ' . $objetivo,
    '',
    'Punto de partida:',
    $mensaje !== '' ? $mensaje : 'No indicado',
    '',
    'Acepta contacto: ' . $privacidad,
    'IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'No disponible'),
    'Origen: ' . ($_SERVER['HTTP_REFERER'] ?? 'No disponible'),
];

$body = implode("\n", $bodyLines);

$headers = [
    'Content-Type: text/plain; charset=UTF-8',
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
