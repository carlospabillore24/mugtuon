<?php
/**
 * Common response helpers, JSON body parsing, file-based rate limiting.
 */

// ── Input sanitization ────────────────────────────────────────────────────

function sanitize(string $input): string {
    return htmlspecialchars(trim($input), ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function sanitize_email(string $input): string {
    $email = filter_var(trim($input), FILTER_SANITIZE_EMAIL);
    return $email ?: '';
}

function validate_email(string $email): bool {
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validate_password(string $password): ?string {
    if (strlen($password) < 8) return 'Password must be at least 8 characters';
    if (!preg_match('/[a-z]/', $password)) return 'Password must contain a lowercase letter';
    if (!preg_match('/[A-Z]/', $password)) return 'Password must contain an uppercase letter';
    if (!preg_match('/[0-9]/', $password)) return 'Password must contain a number';
    return null;
}

function set_jwt_cookie(string $token, bool $remember = true): void {
    $secure = APP_ENV === 'production' || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    setcookie('mugtuon_jwt', $token, [
        'expires'  => $remember ? time() + JWT_EXPIRES_IN : 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly'  => true,
        'samesite' => 'Lax',
    ]);
}

function clear_jwt_cookie(): void {
    $secure = APP_ENV === 'production' || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    setcookie('mugtuon_jwt', '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $secure,
        'httponly'  => true,
        'samesite' => 'Lax',
    ]);
}

// ── JSON body parsing ──────────────────────────────────────────────────────

function get_json_body(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ── Response helpers ───────────────────────────────────────────────────────

function json_response($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function json_error(string $message, int $status = 400): void {
    json_response(['error' => $message], $status);
}

// ── File-based rate limiter ────────────────────────────────────────────────

function rate_limit(string $bucket, int $windowSec = 900, int $maxHits = 10, string $message = 'Too many requests. Please try again later.'): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $dir = sys_get_temp_dir() . '/mugtuon_rl';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);

    $file = $dir . '/' . md5($bucket . $ip) . '.rl';

    $entry = ['count' => 0, 'start' => time()];
    if (file_exists($file)) {
        $content = @file_get_contents($file);
        $stored  = $content ? json_decode($content, true) : null;
        if ($stored && (time() - $stored['start']) <= $windowSec) {
            $entry = $stored;
        }
    }

    $entry['count']++;

    if ($entry['count'] > $maxHits) {
        $retryAfter = $entry['start'] + $windowSec - time();
        header("Retry-After: $retryAfter");
        json_error($message, 429);
    }

    @file_put_contents($file, json_encode($entry), LOCK_EX);

    // Cleanup old files occasionally (1% chance)
    if (mt_rand(1, 100) === 1) {
        foreach (glob($dir . '/*.rl') as $f) {
            if (time() - filemtime($f) > $windowSec * 2) @unlink($f);
        }
    }
}

// ── Structured error logger (#16) ─────────────────────────────────────────

function _auto_migrate(): void {
    static $ran = false;
    if ($ran) return;
    $ran = true;
    try { db()->exec('ALTER TABLE users ADD COLUMN deleted_at DATETIME DEFAULT NULL'); } catch (PDOException $e) {}
    try { db()->exec('CREATE INDEX idx_users_deleted ON users (deleted_at)'); } catch (PDOException $e) {}
}

function log_error(string $context, string $message, ?array $extra = null): void {
    $dir = __DIR__ . '/../logs';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $file = $dir . '/error-' . date('Y-m-d') . '.log';
    $entry = json_encode([
        'time'    => date('c'),
        'context' => $context,
        'message' => $message,
        'ip'      => $_SERVER['REMOTE_ADDR'] ?? '',
        'uri'     => $_SERVER['REQUEST_URI'] ?? '',
        'extra'   => $extra,
    ]) . "\n";
    @file_put_contents($file, $entry, FILE_APPEND | LOCK_EX);
    error_log("[$context] $message");
}

// ── Audit log helper ───────────────────────────────────────────────────────

function log_admin_action(string $adminId, string $action, ?string $targetType = null, ?string $targetId = null, ?string $details = null): void {
    try {
        $stmt = db()->prepare(
            'INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$adminId, $action, $targetType, $targetId, $details]);
    } catch (Exception $e) {
        error_log('[Audit] ' . $e->getMessage());
    }
}
