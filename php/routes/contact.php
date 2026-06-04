<?php
/**
 * Contact routes: GET /contact/info, POST /contact
 */

function route_contact(string $method, array $seg): void {
    $action = $seg[1] ?? '';

    // ── GET /api/contact/info ──────────────────────────────────────────────
    if ($method === 'GET' && $action === 'info') {
        try {
            $stmt = db()->query("SELECT `key`, value FROM site_settings WHERE `key` LIKE 'contact_%' ORDER BY `key`");
            $info = [];
            foreach ($stmt->fetchAll() as $r) {
                $info[$r['key']] = $r['value'];
            }
            json_response($info);
        } catch (Exception $e) {
            json_response(new stdClass());
        }
    }

    // ── POST /api/contact ──────────────────────────────────────────────────
    if ($method === 'POST' && $action === '') {
        rate_limit('contact', 900, 5, 'Too many messages. Please try again in 15 minutes.');
        $body = get_json_body();
        $name    = sanitize($body['name'] ?? '');
        $email   = sanitize_email($body['email'] ?? '');
        $subject = sanitize($body['subject'] ?? '') ?: 'General Inquiry';
        $message = sanitize($body['message'] ?? '');

        if (!$name || !$email || !$message) json_error('Name, email, and message are required');
        if (!validate_email($email)) json_error('Please enter a valid email address');

        $stmt = db()->prepare(
            'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$name, $email, $subject, $message]);

        // Notify admin (non-blocking best effort)
        email_contact_admin($name, $email, $subject, $message);

        json_response(['success' => true]);
    }

    json_error('Not found', 404);
}
