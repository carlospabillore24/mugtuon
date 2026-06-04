<?php
/**
 * MugTuon PHP API — Single entry point.
 * All /api/* requests are routed here by .htaccess.
 */

// ── Error reporting ────────────────────────────────────────────────────────
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ── Load core ──────────────────────────────────────────────────────────────
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/auth_middleware.php';
require_once __DIR__ . '/email.php';

_auto_migrate();

// ── CORS (#8 — restrict in production) ────────────────────────────────────
$allowedOrigins = APP_ENV === 'production'
    ? [rtrim(BASE_URL, '/')]
    : ['*'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array('*', $allowedOrigins) || in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . ($origin ?: '*'));
} else {
    header('Access-Control-Allow-Origin: ' . $allowedOrigins[0]);
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

// ── Security headers ──────────────────────────────────────────────────────
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'");
if (APP_ENV === 'production') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── CSRF protection (#11 — verify Origin on mutations) ────────────────────
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE'])) {
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $baseHost = parse_url(BASE_URL, PHP_URL_HOST);
    if ($baseHost !== 'localhost' && empty($requestOrigin) && empty($referer)) {
        http_response_code(403);
        echo json_encode(['error' => 'Missing Origin/Referer header']);
        exit;
    }
    $originOk = empty($requestOrigin)
        || parse_url($requestOrigin, PHP_URL_HOST) === $baseHost
        || $baseHost === 'localhost';
    $refererOk = empty($referer)
        || parse_url($referer, PHP_URL_HOST) === $baseHost
        || $baseHost === 'localhost';
    if (!$originOk && !$refererOk) {
        http_response_code(403);
        echo json_encode(['error' => 'Cross-origin request blocked']);
        exit;
    }
}

// ── Parse request ──────────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$uri    = $_SERVER['REQUEST_URI'] ?? '/';

// Strip query string
$uri = strtok($uri, '?');

// Remove everything up to and including /api (handles subfolder deployment like /mugtuon/api/...)
if (preg_match('#/api(/.*)?$#', $uri, $m)) {
    $path = $m[1] ?? '/';
} else {
    $path = $uri;
}
$path = '/' . trim($path, '/');

// ── Route matching ─────────────────────────────────────────────────────────
// Split path into segments: /auth/login -> ['auth','login']
$segments = array_values(array_filter(explode('/', $path)));
$prefix   = $segments[0] ?? '';

try {
    switch ($prefix) {
        case 'auth':
            require_once __DIR__ . '/routes/auth.php';
            route_auth($method, $segments);
            break;

        case 'users':
            require_once __DIR__ . '/routes/users.php';
            route_users($method, $segments);
            break;

        case 'bookings':
            require_once __DIR__ . '/routes/bookings.php';
            route_bookings($method, $segments);
            break;

        case 'spaces':
            require_once __DIR__ . '/routes/spaces.php';
            route_spaces($method, $segments);
            break;

        case 'sessions':
            require_once __DIR__ . '/routes/sessions.php';
            route_sessions($method, $segments);
            break;

        case 'achievements':
            require_once __DIR__ . '/routes/achievements.php';
            route_achievements($method, $segments);
            break;

        case 'payments':
            require_once __DIR__ . '/routes/payments.php';
            route_payments($method, $segments);
            break;

        case 'plans':
            require_once __DIR__ . '/routes/plans.php';
            route_plans($method, $segments);
            break;

        case 'analytics':
            require_once __DIR__ . '/routes/analytics.php';
            route_analytics($method, $segments);
            break;

        case 'contact':
            require_once __DIR__ . '/routes/contact.php';
            route_contact($method, $segments);
            break;

        case 'admin':
            require_once __DIR__ . '/routes/admin.php';
            route_admin($method, $segments);
            break;

        case 'qr':
            require_once __DIR__ . '/qrcode.php';
            $qrData = $segments[1] ?? '';
            if (!$qrData) json_error('Missing QR data', 400);
            header('Content-Type: image/png');
            header('Cache-Control: public, max-age=86400');
            echo generate_qr_png($qrData, 300);
            exit;

        case 'payment-settings':
            // Public endpoint for checkout page
            if ($method === 'GET') {
                $stmt = db()->query('SELECT * FROM payment_settings WHERE is_enabled = 1 ORDER BY id');
                json_response($stmt->fetchAll());
            }
            json_error('Not found', 404);
            break;

        default:
            json_error('Not found', 404);
    }
} catch (PDOException $e) {
    log_error('PDO', $e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
    json_error('Internal server error', 500);
} catch (Exception $e) {
    log_error('API', $e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine()]);
    json_error('Internal server error', 500);
}
