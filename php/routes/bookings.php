<?php
/**
 * Booking routes: CRUD, QR verify, reschedule, cancel, checkin, members, reminders
 */

function route_bookings(string $method, array $seg): void {
    $action = $seg[1] ?? '';
    $subAction = $seg[2] ?? '';

    // ── GET /api/bookings/verify/:qrCode ───────────────────────────────────
    if ($method === 'GET' && $action === 'verify' && !empty($subAction)) {
        $user = authenticate();
        authorize($user, ['admin', 'staff']);
        $stmt = db()->prepare(
            'SELECT b.*, u.first_name, u.last_name, u.email, s.name as space_name
             FROM bookings b
             JOIN users u ON u.id = b.user_id
             JOIN spaces s ON s.id = b.space_id
             WHERE b.qr_code = ?'
        );
        $stmt->execute([$subAction]);
        $booking = $stmt->fetch();
        if (!$booking) json_error('No booking found for this QR code', 404);
        json_response(['booking' => $booking]);
    }

    // ── GET /api/bookings/upcoming-reminders ───────────────────────────────
    if ($method === 'GET' && $action === 'upcoming-reminders') {
        $user = authenticate();
        $tomorrow = date('Y-m-d', strtotime('+1 day'));

        $stmt = db()->prepare(
            'SELECT b.id, b.start_time, b.end_time, b.booking_date, s.name as space_name,
                    u.email, u.first_name
             FROM bookings b
             JOIN spaces s ON s.id = b.space_id
             JOIN users u ON u.id = b.user_id
             WHERE b.user_id = ?
               AND b.status = \'confirmed\'
               AND DATE(b.booking_date) = ?
               AND COALESCE(b.reminder_sent, 0) = 0
               AND COALESCE(u.email_reminder, 1) = 1'
        );
        $stmt->execute([$user['id'], $tomorrow]);
        $bookings = $stmt->fetchAll();

        foreach ($bookings as $b) {
            email_booking_reminder($b['email'], $b['first_name'], $b['space_name'], $b['booking_date'], $b['start_time'], $b['end_time']);
            $upd = db()->prepare('UPDATE bookings SET reminder_sent = 1 WHERE id = ?');
            $upd->execute([$b['id']]);
        }
        json_response(['reminders' => count($bookings)]);
    }

    // ── GET /api/bookings ──────────────────────────────────────────────────
    if ($method === 'GET' && $action === '') {
        $user = authenticate();
        $limit  = min((int)($_GET['limit'] ?? 50), 100);
        $offset = (int)($_GET['offset'] ?? 0);
        $stmt = db()->prepare(
            'SELECT b.*, s.name as space_name, s.type as space_type
             FROM bookings b JOIN spaces s ON s.id = b.space_id
             WHERE b.user_id = ? ORDER BY b.booking_date DESC, b.start_time DESC
             LIMIT ? OFFSET ?'
        );
        $stmt->execute([$user['id'], $limit, $offset]);
        json_response($stmt->fetchAll());
    }

    // ── POST /api/bookings ─────────────────────────────────────────────────
    if ($method === 'POST' && $action === '') {
        $user = authenticate();
        rate_limit('booking_' . $user['id'], 900, 15, 'Too many booking requests. Please try again later.');
        $body = get_json_body();
        $spaceId     = $body['spaceId'] ?? '';
        $bookingDate = $body['bookingDate'] ?? '';
        $startTime   = $body['startTime'] ?? '';
        $endTime     = $body['endTime'] ?? '';
        $notes       = sanitize($body['notes'] ?? '');

        if (!$spaceId || !$bookingDate || !$startTime || !$endTime) {
            json_error('Space, date, start time, and end time are required');
        }
        if ($bookingDate < date('Y-m-d')) {
            json_error('Cannot create bookings for past dates');
        }

        // Enforce booking limits per plan
        $planStmt = db()->prepare(
            'SELECT mp.name, mp.features FROM users u
             LEFT JOIN membership_plans mp ON mp.id = u.membership_plan_id
             WHERE u.id = ?'
        );
        $planStmt->execute([$user['id']]);
        $planRow = $planStmt->fetch();
        $planName = $planRow['name'] ?? 'Explorer';
        $features = $planRow['features'] ?? '[]';
        if (is_string($features)) $features = json_decode($features, true) ?: [];

        $dailyLimit = 1;
        foreach ($features as $f) {
            if (preg_match('/(\d+)\s*booking/i', $f, $m)) { $dailyLimit = (int)$m[1]; break; }
            if (preg_match('/unlimited/i', $f) && preg_match('/booking/i', $f)) { $dailyLimit = 9999; break; }
        }

        $countStmt = db()->prepare(
            'SELECT COUNT(*) as cnt FROM bookings WHERE user_id = ? AND booking_date = ? AND status NOT IN (\'cancelled\')'
        );
        $countStmt->execute([$user['id'], $bookingDate]);
        $cnt = (int)$countStmt->fetch()['cnt'];
        if ($cnt >= $dailyLimit) {
            json_error("Your $planName plan allows $dailyLimit booking(s) per day. Upgrade your plan for more.", 403);
        }

        // Check conflicts
        $conflicts = db()->prepare(
            'SELECT id FROM bookings
             WHERE space_id = ? AND booking_date = ? AND status NOT IN (\'cancelled\')
             AND (start_time < ? AND end_time > ?)'
        );
        $conflicts->execute([$spaceId, $bookingDate, $endTime, $startTime]);
        if ($conflicts->fetch()) json_error('Time slot not available', 409);

        // Calculate amount
        $spaceStmt = db()->prepare('SELECT hourly_rate FROM spaces WHERE id = ?');
        $spaceStmt->execute([$spaceId]);
        $space = $spaceStmt->fetch();
        $startSec = strtotime("2000-01-01 $startTime");
        $endSec   = strtotime("2000-01-01 $endTime");
        if ($endSec <= $startSec) $endSec += 86400;
        $hours = ($endSec - $startSec) / 3600;
        $totalAmount = $space['hourly_rate'] * $hours;

        $qrCode = uuid_v4();
        $bookingId = uuid_v4();

        $ins = db()->prepare(
            'INSERT INTO bookings (id, user_id, space_id, booking_date, start_time, end_time, total_amount, notes, qr_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([$bookingId, $user['id'], $spaceId, $bookingDate, $startTime, $endTime, $totalAmount, $notes, $qrCode]);

        $sel = db()->prepare('SELECT * FROM bookings WHERE id = ?');
        $sel->execute([$bookingId]);
        $booking = $sel->fetch();

        // Send email
        $uInfo = db()->prepare('SELECT email, first_name FROM users WHERE id = ?');
        $uInfo->execute([$user['id']]);
        $ui = $uInfo->fetch();
        $sInfo = db()->prepare('SELECT name FROM spaces WHERE id = ?');
        $sInfo->execute([$spaceId]);
        $si = $sInfo->fetch();
        if ($ui && $si) {
            email_booking_confirmation($ui['email'], $ui['first_name'], $si['name'], $bookingDate, $startTime, $endTime, $totalAmount);
        }

        json_response($booking, 201);
    }

    // ── Routes with booking ID: /api/bookings/:id/... ──────────────────────
    $bookingId = $action;

    // ── PUT /api/bookings/:id/reschedule ───────────────────────────────────
    if ($method === 'PUT' && $subAction === 'reschedule') {
        $user = authenticate();
        $body = get_json_body();
        $bookingDate = $body['bookingDate'] ?? '';
        $startTime   = $body['startTime'] ?? '';
        $endTime     = $body['endTime'] ?? '';
        if (!$bookingDate || !$startTime || !$endTime) json_error('bookingDate, startTime, and endTime are required');

        $stmt = db()->prepare(
            'SELECT b.*, s.name as space_name, s.hourly_rate
             FROM bookings b JOIN spaces s ON s.id = b.space_id
             WHERE b.id = ? AND b.user_id = ?'
        );
        $stmt->execute([$bookingId, $user['id']]);
        $booking = $stmt->fetch();
        if (!$booking) json_error('Booking not found', 404);
        if (!in_array($booking['status'], ['confirmed', 'pending'])) json_error('Only pending or confirmed bookings can be rescheduled');

        $conflicts = db()->prepare(
            'SELECT id FROM bookings WHERE space_id = ? AND booking_date = ? AND id != ? AND status NOT IN (\'cancelled\') AND (start_time < ? AND end_time > ?)'
        );
        $conflicts->execute([$booking['space_id'], $bookingDate, $bookingId, $endTime, $startTime]);
        if ($conflicts->fetch()) json_error('That time slot is not available', 409);

        $rStartSec = strtotime("2000-01-01 $startTime");
        $rEndSec   = strtotime("2000-01-01 $endTime");
        if ($rEndSec <= $rStartSec) $rEndSec += 86400;
        $hours = ($rEndSec - $rStartSec) / 3600;
        $totalAmount = $booking['hourly_rate'] * $hours;

        $upd = db()->prepare(
            'UPDATE bookings SET booking_date=?, start_time=?, end_time=?, total_amount=?, reminder_sent=0, updated_at=NOW() WHERE id=?'
        );
        $upd->execute([$bookingDate, $startTime, $endTime, $totalAmount, $bookingId]);

        $sel = db()->prepare('SELECT * FROM bookings WHERE id = ?');
        $sel->execute([$bookingId]);

        $uInfo = db()->prepare('SELECT email, first_name FROM users WHERE id=?');
        $uInfo->execute([$user['id']]);
        $ui = $uInfo->fetch();
        if ($ui) {
            email_booking_rescheduled($ui['email'], $ui['first_name'], $booking['space_name'], $booking['booking_date'], $bookingDate, $startTime, $endTime);
        }

        json_response($sel->fetch());
    }

    // ── GET /api/bookings/:id/qr ───────────────────────────────────────────
    if ($method === 'GET' && $subAction === 'qr') {
        $user = authenticate();
        $stmt = db()->prepare('SELECT qr_code, user_id FROM bookings WHERE id = ?');
        $stmt->execute([$bookingId]);
        $row = $stmt->fetch();
        if (!$row) json_error('Booking not found', 404);
        if ($row['user_id'] !== $user['id']) json_error('Not your booking', 403);

        $qrUrl = BASE_URL . 'api/qr/' . urlencode($row['qr_code']);
        json_response(['qr' => $qrUrl, 'code' => $row['qr_code']]);
    }

    // ── PUT /api/bookings/:id/cancel ───────────────────────────────────────
    if ($method === 'PUT' && $subAction === 'cancel') {
        $user = authenticate();
        $stmt = db()->prepare(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status IN (\'pending\',\'confirmed\')'
        );
        $stmt->execute([$bookingId, $user['id']]);
        $booking = $stmt->fetch();
        if (!$booking) json_error('Booking not found or cannot be cancelled', 404);

        $upd = db()->prepare('UPDATE bookings SET status = \'cancelled\', updated_at = NOW() WHERE id = ?');
        $upd->execute([$bookingId]);

        $uInfo = db()->prepare('SELECT email, first_name FROM users WHERE id = ?');
        $uInfo->execute([$user['id']]);
        $ui = $uInfo->fetch();
        $sInfo = db()->prepare('SELECT name FROM spaces WHERE id = ?');
        $sInfo->execute([$booking['space_id']]);
        $si = $sInfo->fetch();
        if ($ui && $si) {
            email_booking_cancelled($ui['email'], $ui['first_name'], $si['name'], $booking['booking_date'], $booking['start_time'], $booking['end_time']);
        }

        $booking['status'] = 'cancelled';
        json_response($booking);
    }

    // ── POST /api/bookings/:id/checkin ─────────────────────────────────────
    if ($method === 'POST' && $subAction === 'checkin') {
        $user = authenticate();
        $stmt = db()->prepare(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = \'confirmed\''
        );
        $stmt->execute([$bookingId, $user['id']]);
        $booking = $stmt->fetch();
        if (!$booking) json_error('Booking not found', 404);

        $upd = db()->prepare('UPDATE bookings SET status = \'checked_in\', checked_in_at = NOW(), updated_at = NOW() WHERE id = ?');
        $upd->execute([$bookingId]);

        $log = db()->prepare('INSERT INTO qr_logs (id, user_id, booking_id, action, verified) VALUES (UUID(), ?, ?, \'check_in\', 1)');
        $log->execute([$user['id'], $bookingId]);

        $sel = db()->prepare('SELECT * FROM bookings WHERE id = ?');
        $sel->execute([$bookingId]);
        json_response($sel->fetch());
    }

    // ── GET /api/bookings/:id/members ──────────────────────────────────────
    if ($method === 'GET' && $subAction === 'members') {
        authenticate();
        $stmt = db()->prepare('SELECT * FROM booking_members WHERE booking_id = ? ORDER BY added_at');
        $stmt->execute([$bookingId]);
        json_response($stmt->fetchAll());
    }

    // ── POST /api/bookings/:id/members ─────────────────────────────────────
    if ($method === 'POST' && $subAction === 'members') {
        $user = authenticate();
        $body = get_json_body();
        $members = $body['members'] ?? [];
        if (!is_array($members) || count($members) === 0) json_error('Provide an array of members with name and optional email');

        $own = db()->prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?');
        $own->execute([$bookingId, $user['id']]);
        if (!$own->fetch()) json_error('Booking not found', 404);

        $added = [];
        foreach (array_slice($members, 0, 10) as $m) {
            $name = sanitize($m['name'] ?? '');
            if (!$name) continue;
            $email = sanitize_email($m['email'] ?? '') ?: null;
            try {
                $ins = db()->prepare(
                    'INSERT IGNORE INTO booking_members (booking_id, member_name, member_email) VALUES (?, ?, ?)'
                );
                $ins->execute([$bookingId, $name, $email]);
                if ($ins->rowCount() > 0) {
                    $lastId = db()->lastInsertId();
                    $sel = db()->prepare('SELECT * FROM booking_members WHERE id = ?');
                    $sel->execute([$lastId]);
                    $added[] = $sel->fetch();
                }
            } catch (Exception $e) { /* skip duplicates */ }
        }
        json_response(['added' => $added, 'count' => count($added)]);
    }

    // ── DELETE /api/bookings/:id/members/:memberId ─────────────────────────
    if ($method === 'DELETE' && $subAction === 'members') {
        $user = authenticate();
        $memberId = $seg[3] ?? '';
        $own = db()->prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?');
        $own->execute([$bookingId, $user['id']]);
        if (!$own->fetch()) json_error('Booking not found', 404);

        $del = db()->prepare('DELETE FROM booking_members WHERE id = ? AND booking_id = ?');
        $del->execute([$memberId, $bookingId]);
        json_response(['message' => 'Member removed']);
    }

    json_error('Not found', 404);
}
