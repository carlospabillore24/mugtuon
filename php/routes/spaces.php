<?php
/**
 * Spaces routes: list spaces, single space, availability by date
 */

function route_spaces(string $method, array $seg): void {
    $action = $seg[1] ?? '';
    $subAction = $seg[2] ?? '';

    // ── GET /api/spaces ────────────────────────────────────────────────────
    if ($method === 'GET' && $action === '') {
        $type = $_GET['type'] ?? '';
        $date = $_GET['date'] ?? '';

        $query  = 'SELECT * FROM spaces WHERE is_active = 1';
        $params = [];

        if ($type) {
            $query .= ' AND type = ?';
            $params[] = $type;
        }
        $query .= ' ORDER BY type, name';

        $stmt = db()->prepare($query);
        $stmt->execute($params);
        $spaces = $stmt->fetchAll();

        if ($date) {
            $bStmt = db()->prepare(
                "SELECT space_id, start_time, end_time FROM bookings
                 WHERE booking_date = ? AND status NOT IN ('cancelled')"
            );
            $bStmt->execute([$date]);
            $bookings = $bStmt->fetchAll();

            foreach ($spaces as &$space) {
                $space['booked_slots'] = array_values(array_filter($bookings, fn($b) => $b['space_id'] === $space['id']));
            }
        }

        json_response($spaces);
    }

    // ── GET /api/spaces/:id/availability ───────────────────────────────────
    if ($method === 'GET' && $subAction === 'availability') {
        $spaceId = $action;
        $date = $_GET['date'] ?? date('Y-m-d');
        $stmt = db()->prepare(
            "SELECT start_time, end_time, status FROM bookings
             WHERE space_id = ? AND booking_date = ? AND status NOT IN ('cancelled')
             ORDER BY start_time"
        );
        $stmt->execute([$spaceId, $date]);
        json_response($stmt->fetchAll());
    }

    // ── GET /api/spaces/:id ────────────────────────────────────────────────
    if ($method === 'GET' && $action !== '' && $subAction === '') {
        $stmt = db()->prepare('SELECT * FROM spaces WHERE id = ?');
        $stmt->execute([$action]);
        $space = $stmt->fetch();
        if (!$space) json_error('Space not found', 404);
        json_response($space);
    }

    json_error('Not found', 404);
}
