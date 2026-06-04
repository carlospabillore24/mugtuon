<?php
/**
 * MugTuon — Database configuration & PDO connection
 */

// ── .env loader ───────────────────────────────────────────────────────────
function _load_env(): void {
    $envFile = __DIR__ . '/../.env.php';
    if (!file_exists($envFile)) return;
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if (!array_key_exists($key, $_ENV)) {
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}
_load_env();

function env(string $key, string $default = ''): string {
    return $_ENV[$key] ?? getenv($key) ?: $default;
}

// ── Environment ────────────────────────────────────────────────────────────
define('DB_HOST',    env('DB_HOST', 'localhost'));
define('DB_NAME',    env('DB_NAME', 'mugtuon'));
define('DB_USER',    env('DB_USER', 'root'));
define('DB_PASS',    env('DB_PASS', ''));
define('DB_CHARSET', 'utf8mb4');

define('JWT_SECRET',     env('JWT_SECRET', 'CHANGE-THIS-IN-PRODUCTION'));
define('JWT_EXPIRES_IN', (int) env('JWT_EXPIRES_IN', (string)(7 * 24 * 60 * 60)));

define('SMTP_HOST', env('SMTP_HOST', ''));
define('SMTP_PORT', (int) env('SMTP_PORT', '587'));
define('SMTP_USER', env('SMTP_USER', ''));
define('SMTP_PASS', env('SMTP_PASS', ''));
define('SMTP_FROM', env('SMTP_FROM', ''));

define('BASE_URL', env('BASE_URL', 'http://localhost/mugtuon'));
define('APP_ENV',  env('APP_ENV', 'development'));

// ── Production safety checks ──────────────────────────────────────────────
if (APP_ENV === 'production') {
    if (JWT_SECRET === 'CHANGE-THIS-IN-PRODUCTION') {
        error_log('[FATAL] JWT_SECRET not set — refusing to start in production with default secret');
        http_response_code(500);
        exit('Server configuration error');
    }
    if (strpos(BASE_URL, 'localhost') !== false) {
        error_log('[FATAL] BASE_URL contains localhost — refusing to start in production');
        http_response_code(500);
        exit('Server configuration error');
    }
}

// ── PDO Singleton ──────────────────────────────────────────────────────────
function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $opts = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed']);
        error_log('[DB] Connection error: ' . $e->getMessage());
        exit;
    }

    return $pdo;
}

// ── Helper: get base URL ───────────────────────────────────────────────────
function base_url(): string {
    if (BASE_URL) return rtrim(BASE_URL, '/');
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host  = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $proto . '://' . $host;
}

// ── Helper: generate UUID v4 ───────────────────────────────────────────────
function uuid_v4(): string {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); // version 4
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); // variant
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
