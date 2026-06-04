<?php
/**
 * Authentication & authorization middleware.
 * Mirrors server/middleware/auth.js — JWT verify + token_version check (5-min cache).
 */

require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/config.php';

// ── Token-version cache (file-based, 5-min TTL) ───────────────────────────
function _tv_cache_path(): string {
    $dir = sys_get_temp_dir() . '/mugtuon_tv';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir;
}

function _get_token_version(string $userId): int {
    $file = _tv_cache_path() . '/' . md5($userId) . '.tv';
    if (file_exists($file) && (time() - filemtime($file)) < 300) {
        return (int) file_get_contents($file);
    }
    try {
        $stmt = db()->prepare('SELECT token_version FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        $tv = $row ? (int)$row['token_version'] : 0;
        @file_put_contents($file, (string)$tv);
        return $tv;
    } catch (Exception $e) {
        return 0;
    }
}

function invalidate_token_cache(string $userId): void {
    $file = _tv_cache_path() . '/' . md5($userId) . '.tv';
    @unlink($file);
}

// ── Authenticate: verify JWT from cookie or Authorization header ──────────
function authenticate(): array {
    $token = '';

    if (!empty($_COOKIE['mugtuon_jwt'])) {
        $token = $_COOKIE['mugtuon_jwt'];
    }

    if (empty($token)) {
        $header = $_SERVER['HTTP_AUTHORIZATION']
               ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
               ?? '';
        if (empty($header) && function_exists('apache_request_headers')) {
            $apacheHeaders = apache_request_headers();
            $header = $apacheHeaders['Authorization'] ?? $apacheHeaders['authorization'] ?? '';
        }
        if (!empty($header) && stripos($header, 'Bearer ') === 0) {
            $token = trim(substr($header, 7));
        }
    }

    if (empty($token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }

    try {
        $payload = JWT::decode($token, JWT_SECRET);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or expired token']);
        exit;
    }

    // Token version check
    if (isset($payload['tv'])) {
        $currentTv = _get_token_version($payload['id']);
        if ((int)$payload['tv'] !== $currentTv) {
            http_response_code(401);
            echo json_encode(['error' => 'Session expired. Please sign in again.']);
            exit;
        }
    }

    return $payload; // { id, email, role, tv, iat, exp }
}

// ── Authorize: require one of the listed roles ─────────────────────────────
function authorize(array $user, array $roles): void {
    if (!in_array($user['role'] ?? '', $roles)) {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions']);
        exit;
    }
}
