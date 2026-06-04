<?php
/**
 * Plans routes: list, single, update
 */

function route_plans(string $method, array $seg): void {
    $action = $seg[1] ?? '';

    // ── GET /api/plans ─────────────────────────────────────────────────────
    if ($method === 'GET' && $action === '') {
        $stmt = db()->query(
            'SELECT id, name, price, billing_period, description, features,
                    is_featured, badge_text, button_text, sort_order
             FROM membership_plans WHERE is_active = 1 ORDER BY sort_order ASC'
        );
        $rows = $stmt->fetchAll();
        // Decode JSON features for each row
        foreach ($rows as &$row) {
            if (is_string($row['features'])) $row['features'] = json_decode($row['features'], true) ?: [];
        }
        json_response($rows);
    }

    // ── GET /api/plans/:id ─────────────────────────────────────────────────
    if ($method === 'GET' && $action !== '') {
        $stmt = db()->prepare(
            'SELECT id, name, price, billing_period, description, features,
                    is_featured, badge_text, button_text, sort_order
             FROM membership_plans WHERE id = ? AND is_active = 1'
        );
        $stmt->execute([$action]);
        $row = $stmt->fetch();
        if (!$row) json_error('Plan not found', 404);
        if (is_string($row['features'])) $row['features'] = json_decode($row['features'], true) ?: [];
        json_response($row);
    }

    // ── PUT /api/plans/:id ─────────────────────────────────────────────────
    if ($method === 'PUT' && $action !== '') {
        $user = authenticate();
        authorize($user, ['admin']);
        $body = get_json_body();
        $features = $body['features'] ?? [];
        if (is_array($features)) $features = json_encode($features);

        $stmt = db()->prepare(
            'UPDATE membership_plans SET name=?, price=?, description=?, features=?,
                    is_featured=?, badge_text=?, button_text=?, is_active=?
             WHERE id=?'
        );
        $stmt->execute([
            $body['name'] ?? '', $body['price'] ?? 0, $body['description'] ?? null, $features,
            ($body['is_featured'] ?? false) ? 1 : 0, $body['badge_text'] ?? null,
            $body['button_text'] ?? 'Get Started', ($body['is_active'] ?? true) ? 1 : 0,
            $action
        ]);
        if ($stmt->rowCount() === 0) json_error('Plan not found', 404);

        $sel = db()->prepare('SELECT * FROM membership_plans WHERE id = ?');
        $sel->execute([$action]);
        $row = $sel->fetch();
        if (is_string($row['features'])) $row['features'] = json_decode($row['features'], true) ?: [];
        json_response($row);
    }

    json_error('Not found', 404);
}
