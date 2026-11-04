<?php
/** Load only the production configuration stored outside public_html. */
if (!defined('ABSPATH')) return;
$file=dirname(rtrim(ABSPATH,'/')).'/salero-rebotica-production-private.php';
if(is_readable($file))require_once $file;
