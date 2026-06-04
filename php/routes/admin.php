<?php
/**
 * Admin routes: all admin CRUD operations
 * Every handler requires authenticate() + authorize(['admin','staff'])
 */

function route_admin(string $method, array $seg): void {
    // Authenticate + authorize for all admin routes
    $user = authenticate();
    authorize($user, ['admin', 'staff']);

    $action    = $seg[1] ?? '';
    $subId     = $seg[2] ?? '';
    $subAction = $seg[3] ?? '';

    // ════════════════════════════════════════════════════════════════════════
    // STATS
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'stats') {
        $s1 = db()->query("SELECT COUNT(*) as total, SUM(created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as new_monthly FROM users");
        $users = $s1->fetch();
        $s2 = db()->query("SELECT COUNT(*) as total, SUM(booking_date = CURDATE()) as today FROM bookings WHERE status != 'cancelled'");
        $bookings = $s2->fetch();
        $s3 = db()->query("SELECT COALESCE(SUM(amount),0) as total, COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN amount ELSE 0 END),0) as monthly FROM payments WHERE status = 'completed'");
        $revenue = $s3->fetch();
        $s4 = db()->query("SELECT COUNT(*) as active FROM study_sessions WHERE ended_at IS NULL");
        $sessions = $s4->fetch();

        json_response([
            'users'          => $users,
            'bookings'       => $bookings,
            'revenue'        => $revenue,
            'activeSessions' => (int)$sessions['active'],
        ]);
    }

    // ════════════════════════════════════════════════════════════════════════
    // AUDIT LOG
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'audit-log') {
        $page  = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 50);
        $offset = ($page - 1) * $limit;

        $logsStmt = db()->prepare(
            'SELECT al.*, u.first_name, u.last_name, u.email as admin_email
             FROM admin_audit_log al LEFT JOIN users u ON u.id = al.admin_id
             ORDER BY al.created_at DESC LIMIT ? OFFSET ?'
        );
        $logsStmt->execute([$limit, $offset]);
        $logs = $logsStmt->fetchAll();

        $countStmt = db()->query('SELECT CAST(COUNT(*) AS SIGNED) as total FROM admin_audit_log');
        $total = (int)$countStmt->fetch()['total'];

        json_response(['logs' => $logs, 'total' => $total, 'page' => $page, 'limit' => $limit]);
    }

    // ════════════════════════════════════════════════════════════════════════
    // USERS
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'users' && $subId === '') {
        $page   = (int)($_GET['page'] ?? 1);
        $limit  = (int)($_GET['limit'] ?? 20);
        $role   = $_GET['role'] ?? '';
        $search = $_GET['search'] ?? '';

        $query = "SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active,
                         COALESCE(u.account_status, IF(u.is_active, 'active', 'suspended')) as account_status,
                         u.created_at, u.last_login_at,
                         COALESCE(mp.name, 'Explorer') as plan_name
                  FROM users u LEFT JOIN membership_plans mp ON mp.id = u.membership_plan_id
                  WHERE u.deleted_at IS NULL";
        $params = [];

        if ($role) { $query .= ' AND u.role = ?'; $params[] = $role; }
        if ($search) {
            $s = "%$search%";
            $query .= ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
            $params[] = $s; $params[] = $s; $params[] = $s;
        }

        $query .= ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
        $params[] = $limit;
        $params[] = ($page - 1) * $limit;

        $stmt = db()->prepare($query);
        $stmt->execute($params);
        json_response($stmt->fetchAll());
    }

    // PUT /api/admin/users/:id/role
    if ($method === 'PUT' && $action === 'users' && $subAction === 'role') {
        $body = get_json_body();
        $role = $body['role'] ?? 'student';
        if (!in_array($role, ['student', 'member', 'staff', 'admin'])) json_error('Invalid role');
        $stmt = db()->prepare(
            'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?'
        );
        $stmt->execute([$role, $subId]);
        $sel = db()->prepare('SELECT id, email, first_name, last_name, role FROM users WHERE id = ?');
        $sel->execute([$subId]);
        log_admin_action($user['id'], 'change_role', 'user', $subId, 'Role set to ' . ($body['role'] ?? ''));
        json_response($sel->fetch());
    }

    // PUT /api/admin/users/:id/status
    if ($method === 'PUT' && $action === 'users' && $subAction === 'status') {
        $body = get_json_body();
        $status = $body['status'] ?? '';
        if (!in_array($status, ['active','suspended','banned'])) json_error('Invalid status');
        if ($user['id'] === $subId) json_error('You cannot change your own account status');
        $isActive = $status === 'active' ? 1 : 0;
        $stmt = db()->prepare('UPDATE users SET is_active=?, account_status=?, updated_at=NOW() WHERE id=?');
        $stmt->execute([$isActive, $status, $subId]);
        $sel = db()->prepare('SELECT id, email, first_name, last_name, is_active, account_status FROM users WHERE id = ?');
        $sel->execute([$subId]);
        $row = $sel->fetch();
        if (!$row) json_error('User not found', 404);
        log_admin_action($user['id'], 'change_status', 'user', $subId, "Status set to $status");
        json_response($row);
    }

    // POST /api/admin/users/:id/reset-password
    if ($method === 'POST' && $action === 'users' && $subAction === 'reset-password') {
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + 3600);
        $stmt = db()->prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?');
        $stmt->execute([$token, $expires, $subId]);

        $sel = db()->prepare('SELECT email, first_name FROM users WHERE id = ?');
        $sel->execute([$subId]);
        $u = $sel->fetch();
        if (!$u) json_error('User not found', 404);

        $link = base_url() . '/reset-password?token=' . $token;
        json_response(['token' => $token, 'link' => $link, 'user' => $u]);
    }

    // DELETE /api/admin/users/:id  (soft delete — preserves data)
    if ($method === 'DELETE' && $action === 'users' && $subId !== '' && $subAction === '') {
        if ($user['id'] === $subId) json_error('You cannot delete your own account');
        $check = db()->prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL');
        $check->execute([$subId]);
        if (!$check->fetch()) json_error('User not found', 404);

        $stmt = db()->prepare('UPDATE users SET deleted_at = NOW(), is_active = 0, account_status = \'deleted\' WHERE id = ?');
        $stmt->execute([$subId]);

        log_admin_action($user['id'], 'delete_user', 'user', $subId, 'User soft-deleted');
        json_response(['message' => 'User deleted']);
    }

    // GET /api/admin/users/:id/analytics
    if ($method === 'GET' && $action === 'users' && $subAction === 'analytics') {
        $uid = $subId;
        $s1 = db()->prepare("SELECT id, first_name, last_name, email, role, COALESCE(xp,0) as xp, COALESCE(streak_days,0) as streak_days, is_active, COALESCE(account_status, IF(is_active, 'active', 'suspended')) as account_status, created_at, last_login_at FROM users WHERE id=?");
        $s1->execute([$uid]);
        $userData = $s1->fetch();
        if (!$userData) json_error('User not found', 404);

        $s2 = db()->prepare("SELECT CAST(COUNT(*) AS SIGNED) as total_sessions, ROUND(COALESCE(SUM(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())))/3600, 0), 1) as total_hours, ROUND(COALESCE(AVG(TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW())))/60, 0), 1) as avg_minutes FROM study_sessions WHERE user_id=?");
        $s2->execute([$uid]);
        $sessions = $s2->fetch();

        $s3 = db()->prepare("SELECT CAST(COUNT(*) AS SIGNED) as total, CAST(SUM(status='confirmed') AS SIGNED) as confirmed, CAST(SUM(status='cancelled') AS SIGNED) as cancelled FROM bookings WHERE user_id=?");
        $s3->execute([$uid]);
        $bookings = $s3->fetch();

        $s4 = db()->prepare("SELECT CAST(COUNT(*) AS SIGNED) as total FROM user_achievements WHERE user_id=?");
        $s4->execute([$uid]);
        $achievements = $s4->fetch();

        $s5 = db()->prepare("SELECT started_at, ended_at, TIMESTAMPDIFF(SECOND, started_at, COALESCE(ended_at, NOW()))/60 as minutes FROM study_sessions WHERE user_id=? ORDER BY started_at DESC LIMIT 7");
        $s5->execute([$uid]);
        $recentSessions = $s5->fetchAll();

        json_response([
            'user'           => $userData,
            'sessions'       => $sessions,
            'bookings'       => $bookings,
            'achievements'   => $achievements,
            'recentSessions' => $recentSessions,
        ]);
    }

    // ════════════════════════════════════════════════════════════════════════
    // BOOKINGS
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'bookings' && $subId === '') {
        $date   = $_GET['date'] ?? '';
        $status = $_GET['status'] ?? '';
        $page   = (int)($_GET['page'] ?? 1);
        $limit  = (int)($_GET['limit'] ?? 30);

        $query = 'SELECT b.id, b.booking_date, b.start_time, b.end_time, b.status, b.total_amount,
                         b.notes, b.qr_code, b.checked_in_at, b.created_at,
                         u.first_name, u.last_name, u.email, s.name as space_name
                  FROM bookings b JOIN users u ON u.id = b.user_id JOIN spaces s ON s.id = b.space_id WHERE 1=1';
        $params = [];
        $countQuery = 'SELECT CAST(COUNT(*) AS SIGNED) as total FROM bookings b JOIN users u ON u.id = b.user_id JOIN spaces s ON s.id = b.space_id WHERE 1=1';
        $countParams = [];

        if ($date) {
            $query .= ' AND b.booking_date = ?'; $params[] = $date;
            $countQuery .= ' AND b.booking_date = ?'; $countParams[] = $date;
        }
        if ($status) {
            $query .= ' AND b.status = ?'; $params[] = $status;
            $countQuery .= ' AND b.status = ?'; $countParams[] = $status;
        }
        $query .= ' ORDER BY b.booking_date DESC, b.start_time';
        $query .= ' LIMIT ? OFFSET ?';
        $params[] = $limit;
        $params[] = ($page - 1) * $limit;

        $stmt = db()->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $cStmt = db()->prepare($countQuery);
        $cStmt->execute($countParams);
        $total = (int)$cStmt->fetch()['total'];

        json_response(['bookings' => $rows, 'total' => $total, 'page' => $page, 'limit' => $limit]);
    }

    // PUT /api/admin/bookings/:id/status
    if ($method === 'PUT' && $action === 'bookings' && $subAction === 'status') {
        $body = get_json_body();
        $status = $body['status'] ?? '';
        $valid = ['pending','confirmed','checked_in','completed','cancelled','no_show'];
        if (!in_array($status, $valid)) json_error('Invalid status');

        $sets = ['status = ?', 'updated_at = NOW()'];
        $params = [$status];
        if ($status === 'checked_in') $sets[] = 'checked_in_at = NOW()';
        $params[] = $subId;

        $stmt = db()->prepare('UPDATE bookings SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $stmt->execute($params);

        $sel = db()->prepare('SELECT * FROM bookings WHERE id = ?');
        $sel->execute([$subId]);
        $row = $sel->fetch();
        if (!$row) json_error('Booking not found', 404);

        if ($status === 'checked_in') {
            try {
                db()->prepare('INSERT INTO qr_logs (id, user_id, booking_id, action, verified) VALUES (UUID(), ?, ?, \'check_in\', 1)')
                    ->execute([$row['user_id'], $row['id']]);
            } catch (Exception $e) {}
        }

        log_admin_action($user['id'], 'booking_status', 'booking', $subId, "Status set to $status");
        json_response($row);
    }

    // POST /api/admin/bookings/walkin
    if ($method === 'POST' && $action === 'bookings' && $subId === 'walkin') {
        $body = get_json_body();
        $guestName   = sanitize($body['guestName'] ?? '');
        $guestEmail  = sanitize_email($body['guestEmail'] ?? '');
        $spaceId     = $body['spaceId'] ?? '';
        $bookingDate = $body['bookingDate'] ?? '';
        $startTime   = $body['startTime'] ?? '';
        $endTime     = $body['endTime'] ?? '';
        $notes       = sanitize($body['notes'] ?? '');

        if (!$guestName || !$spaceId || !$bookingDate || !$startTime || !$endTime) {
            json_error('Guest name, space, date, start time, and end time are required');
        }

        $conflicts = db()->prepare("SELECT id FROM bookings WHERE space_id = ? AND booking_date = ? AND status NOT IN ('cancelled') AND (start_time < ? AND end_time > ?)");
        $conflicts->execute([$spaceId, $bookingDate, $endTime, $startTime]);
        if ($conflicts->fetch()) json_error('Time slot not available', 409);

        $spaceStmt = db()->prepare('SELECT hourly_rate, name FROM spaces WHERE id = ?');
        $spaceStmt->execute([$spaceId]);
        $space = $spaceStmt->fetch();
        if (!$space) json_error('Space not found', 404);
        $wStartSec = strtotime("2000-01-01 $startTime");
        $wEndSec   = strtotime("2000-01-01 $endTime");
        if ($wEndSec <= $wStartSec) $wEndSec += 86400;
        $hours = ($wEndSec - $wStartSec) / 3600;
        $totalAmount = $space['hourly_rate'] * $hours;

        $userId = $user['id'];
        if ($guestEmail) {
            $look = db()->prepare('SELECT id FROM users WHERE email = ?');
            $look->execute([$guestEmail]);
            $found = $look->fetch();
            if ($found) $userId = $found['id'];
        }

        $qrCode = uuid_v4();
        $bookingId = uuid_v4();
        $noteTxt = "[Walk-in: $guestName] " . trim($notes);

        $ins = db()->prepare(
            "INSERT INTO bookings (id, user_id, space_id, booking_date, start_time, end_time, total_amount, notes, qr_code, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')"
        );
        $ins->execute([$bookingId, $userId, $spaceId, $bookingDate, $startTime, $endTime, $totalAmount, trim($noteTxt), $qrCode]);

        $sel = db()->prepare('SELECT * FROM bookings WHERE id = ?');
        $sel->execute([$bookingId]);
        log_admin_action($user['id'], 'walkin_booking', 'booking', $bookingId, "Walk-in for $guestName");
        json_response(['booking' => $sel->fetch(), 'space_name' => $space['name']], 201);
    }

    // ════════════════════════════════════════════════════════════════════════
    // REVENUE & ANALYTICS
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'revenue') {
        $stmt = db()->query(
            "SELECT DATE(paid_at) as date, SUM(amount) as total, CAST(COUNT(*) AS SIGNED) as count
             FROM payments WHERE status = 'completed' AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
             GROUP BY DATE(paid_at) ORDER BY date"
        );
        json_response($stmt->fetchAll());
    }

    if ($method === 'GET' && $action === 'analytics' && $subId === '') {
        $s1 = db()->query("SELECT role, CAST(COUNT(*) AS SIGNED) as count FROM users GROUP BY role ORDER BY count DESC");
        $s2 = db()->query("SELECT DATE_FORMAT(started_at, '%b') as month, DATE_FORMAT(started_at, '%Y-%m-01') as month_date, CAST(COUNT(*) AS SIGNED) as count FROM study_sessions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY month_date ORDER BY month_date");
        $s3 = db()->query("SELECT DATE_FORMAT(started_at, '%a') as day, DATE(started_at) as day_date, CAST(COUNT(*) AS SIGNED) as count FROM study_sessions WHERE started_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY day_date ORDER BY day_date");
        $s4 = db()->query("SELECT CAST(COALESCE(ROUND(AVG(focus_score),0),0) AS SIGNED) as avg_focus FROM productivity_scores");
        $s5 = db()->query("SELECT COALESCE(SUM(xp),0) as total_xp, CAST(COUNT(*) AS SIGNED) as total_users FROM users");
        $s6 = db()->query("SELECT s.name, s.type, CAST(COUNT(b.id) AS SIGNED) as booking_count FROM spaces s LEFT JOIN bookings b ON b.space_id = s.id AND b.status != 'cancelled' GROUP BY s.id, s.name, s.type ORDER BY booking_count DESC");
        $s7 = db()->query("SELECT CAST(COUNT(*) AS SIGNED) as total_earned, COALESCE(SUM(a.xp_reward),0) as total_xp_rewarded FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id");

        $totalXP = $s5->fetch();
        $achStats = $s7->fetch();

        json_response([
            'userRoles'        => $s1->fetchAll(),
            'monthlySessions'  => $s2->fetchAll(),
            'weeklySessions'   => $s3->fetchAll(),
            'avgFocus'         => (int)$s4->fetch()['avg_focus'],
            'totalXP'          => $totalXP['total_xp'],
            'totalUsers'       => (int)$totalXP['total_users'],
            'spaces'           => $s6->fetchAll(),
            'achievementsEarned' => (int)$achStats['total_earned'],
            'achievementsXP'   => $achStats['total_xp_rewarded'],
        ]);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PAYMENTS
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'payments' && $subId === '') {
        $page  = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 30);
        $offset = ($page - 1) * $limit;

        $s1 = db()->prepare("SELECT p.id, p.amount, p.payment_method, p.type, p.status, p.created_at, p.reference_number, p.description, (p.proof_image IS NOT NULL) as has_proof, u.first_name, u.last_name, u.email FROM payments p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT ? OFFSET ?");
        $s1->execute([$limit, $offset]);
        $payments = $s1->fetchAll();

        $s2 = db()->query("SELECT CAST(COUNT(*) AS SIGNED) as total FROM payments");
        $total = (int)$s2->fetch()['total'];

        $s3 = db()->query("SELECT DATE(paid_at) as date, COALESCE(SUM(amount),0) as total, CAST(COUNT(*) AS SIGNED) as count FROM payments WHERE status='completed' AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY) GROUP BY DATE(paid_at) ORDER BY date");
        $s4 = db()->query("SELECT type, COALESCE(SUM(amount),0) as total, CAST(COUNT(*) AS SIGNED) as count FROM payments WHERE status='completed' GROUP BY type ORDER BY total DESC");
        $s5 = db()->query("SELECT payment_method, CAST(COUNT(*) AS SIGNED) as count, COALESCE(SUM(amount),0) as total FROM payments WHERE status='completed' GROUP BY payment_method ORDER BY count DESC");
        $s6 = db()->query("SELECT COALESCE(SUM(CASE WHEN status='completed' THEN amount ELSE 0 END),0) as total_revenue, COALESCE(SUM(CASE WHEN status='completed' AND paid_at >= CURDATE() THEN amount ELSE 0 END),0) as today_revenue, COALESCE(SUM(CASE WHEN status='completed' AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN amount ELSE 0 END),0) as monthly_revenue, CAST(SUM(status='pending') AS SIGNED) as pending_count, COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END),0) as pending_amount, CAST(SUM(status='refunded') AS SIGNED) as refunded_count FROM payments");

        json_response([
            'payments'     => $payments,
            'total'        => $total,
            'page'         => $page,
            'limit'        => $limit,
            'dailyRevenue' => $s3->fetchAll(),
            'byType'       => $s4->fetchAll(),
            'byMethod'     => $s5->fetchAll(),
            'summary'      => $s6->fetch(),
        ]);
    }

    // PUT /api/admin/payments/:id
    if ($method === 'PUT' && $action === 'payments' && $subId !== '' && $subAction === '') {
        $body = get_json_body();
        $status = $body['status'] ?? null;
        $validStatuses = ['pending','completed','failed','refunded'];
        if ($status && !in_array($status, $validStatuses)) json_error('Invalid status');

        $stmt = db()->prepare(
            "UPDATE payments SET
                status           = COALESCE(?, status),
                payment_method   = COALESCE(?, payment_method),
                amount           = COALESCE(?, amount),
                reference_number = COALESCE(?, reference_number),
                description      = COALESCE(?, description),
                paid_at          = CASE WHEN ? = 'completed' AND paid_at IS NULL THEN NOW() ELSE paid_at END
             WHERE id = ?"
        );
        $stmt->execute([
            $status, $body['payment_method'] ?? null,
            isset($body['amount']) ? (float)$body['amount'] : null,
            array_key_exists('reference_number', $body) ? $body['reference_number'] : null,
            array_key_exists('description', $body) ? $body['description'] : null,
            $status, $subId
        ]);

        $sel = db()->prepare('SELECT * FROM payments WHERE id = ?');
        $sel->execute([$subId]);
        $row = $sel->fetch();
        if (!$row) json_error('Payment not found', 404);
        json_response($row);
    }

    // GET /api/admin/payments/:id/proof
    if ($method === 'GET' && $action === 'payments' && $subAction === 'proof') {
        $stmt = db()->prepare('SELECT proof_image FROM payments WHERE id = ?');
        $stmt->execute([$subId]);
        $row = $stmt->fetch();
        if (!$row) json_error('Payment not found', 404);
        if (!$row['proof_image']) json_error('No proof image for this payment', 404);
        json_response(['proof_image' => $row['proof_image']]);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PAYMENT SETTINGS
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'payment-settings') {
        $stmt = db()->query('SELECT * FROM payment_settings ORDER BY id');
        json_response($stmt->fetchAll());
    }

    if ($method === 'POST' && $action === 'payment-settings') {
        $body = get_json_body();
        $label = sanitize($body['label'] ?? '');
        if (!$label) json_error('Label is required');
        $methodType = $body['method_type'] ?? 'account';
        $method_name = preg_replace('/[^a-z0-9]+/', '_', strtolower($label));
        $method_name = trim($method_name, '_') . '_' . base_convert(time(), 10, 36);
        $icon = $body['icon'] ?? '💳';
        $defaultDetails = $methodType === 'account'
            ? json_encode(['number' => '', 'account_name' => '', 'note' => ''])
            : json_encode(['instruction' => $body['details']['instruction'] ?? '']);

        $ins = db()->prepare('INSERT INTO payment_settings (method, label, icon, is_enabled, details) VALUES (?, ?, ?, 1, ?)');
        $ins->execute([$method_name, $label, $icon, $defaultDetails]);

        $sel = db()->prepare('SELECT * FROM payment_settings WHERE method = ?');
        $sel->execute([$method_name]);
        json_response($sel->fetch(), 201);
    }

    if ($method === 'DELETE' && $action === 'payment-settings' && $subId !== '') {
        db()->prepare('DELETE FROM payment_settings WHERE method = ?')->execute([$subId]);
        json_response(['message' => 'Payment method deleted']);
    }

    if ($method === 'PUT' && $action === 'payment-settings' && $subId !== '') {
        $body = get_json_body();
        $stmt = db()->prepare(
            'UPDATE payment_settings SET label=?, icon=?, is_enabled=?, details=?, updated_at=NOW() WHERE method=?'
        );
        $stmt->execute([
            sanitize($body['label'] ?? ''), sanitize($body['icon'] ?? ''),
            ($body['is_enabled'] ?? true) ? 1 : 0,
            json_encode($body['details'] ?? new stdClass()),
            $subId
        ]);
        $sel = db()->prepare('SELECT * FROM payment_settings WHERE method = ?');
        $sel->execute([$subId]);
        $row = $sel->fetch();
        if (!$row) json_error('Method not found', 404);
        json_response($row);
    }

    // ════════════════════════════════════════════════════════════════════════
    // MEMBERSHIP PLANS
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'plans') {
        $stmt = db()->query('SELECT * FROM membership_plans ORDER BY sort_order ASC');
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) { if (is_string($r['features'])) $r['features'] = json_decode($r['features'], true) ?: []; }
        json_response($rows);
    }

    if ($method === 'POST' && $action === 'plans') {
        $body = get_json_body();
        $name = $body['name'] ?? '';
        if (!$name) json_error('Name is required');
        $features = $body['features'] ?? [];
        if (!is_array($features)) $features = array_values(array_filter(array_map('trim', explode("\n", $features))));

        $planId = uuid_v4();
        $stmt = db()->prepare(
            'INSERT INTO membership_plans (id, name, price, description, features, is_featured, badge_text, button_text, is_active, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $planId, $name, (float)($body['price'] ?? 0), $body['description'] ?? null,
            json_encode($features), ($body['is_featured'] ?? false) ? 1 : 0,
            $body['badge_text'] ?? null, $body['button_text'] ?? 'Get Started',
            ($body['is_active'] ?? true) ? 1 : 0, (int)($body['sort_order'] ?? 0)
        ]);
        $sel = db()->prepare('SELECT * FROM membership_plans WHERE id = ?');
        $sel->execute([$planId]);
        $row = $sel->fetch();
        if (is_string($row['features'])) $row['features'] = json_decode($row['features'], true) ?: [];
        json_response($row, 201);
    }

    if ($method === 'PUT' && $action === 'plans' && $subId !== '') {
        $body = get_json_body();
        $features = $body['features'] ?? [];
        if (!is_array($features)) $features = array_values(array_filter(array_map('trim', explode("\n", $features))));
        $stmt = db()->prepare(
            'UPDATE membership_plans SET name=?, price=?, description=?, features=?, is_featured=?, badge_text=?, button_text=?, is_active=?, sort_order=? WHERE id=?'
        );
        $stmt->execute([
            $body['name'] ?? '', (float)($body['price'] ?? 0), $body['description'] ?? null,
            json_encode($features), ($body['is_featured'] ?? false) ? 1 : 0,
            $body['badge_text'] ?? null, $body['button_text'] ?? 'Get Started',
            ($body['is_active'] ?? true) ? 1 : 0, (int)($body['sort_order'] ?? 0), $subId
        ]);
        $sel = db()->prepare('SELECT * FROM membership_plans WHERE id = ?');
        $sel->execute([$subId]);
        $row = $sel->fetch();
        if (!$row) json_error('Plan not found', 404);
        if (is_string($row['features'])) $row['features'] = json_decode($row['features'], true) ?: [];
        json_response($row);
    }

    if ($method === 'DELETE' && $action === 'plans' && $subId !== '') {
        $cnt = db()->prepare('SELECT COUNT(*) as c FROM users WHERE membership_plan_id = ?');
        $cnt->execute([$subId]);
        $inUse = (int)$cnt->fetch()['c'];
        if ($inUse > 0) json_error("Cannot delete — $inUse user(s) are on this plan", 409);
        db()->prepare('DELETE FROM membership_plans WHERE id = ?')->execute([$subId]);
        json_response(['message' => 'Plan deleted']);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SPACE TYPES
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'space-types') {
        json_response(db()->query('SELECT * FROM space_types ORDER BY created_at')->fetchAll());
    }

    if ($method === 'POST' && $action === 'space-types') {
        $body = get_json_body();
        $label = trim($body['label'] ?? '');
        if (!$label) json_error('Label is required');
        $name = preg_replace('/[^a-z0-9]+/', '_', strtolower($label));
        $name = trim($name, '_');
        $ins = db()->prepare('INSERT IGNORE INTO space_types (name, label, badge_color) VALUES (?, ?, ?)');
        $ins->execute([$name, $label, $body['badge_color'] ?? 'primary']);
        if ($ins->rowCount() === 0) json_error('Type already exists', 409);
        $sel = db()->prepare('SELECT * FROM space_types WHERE name = ?');
        $sel->execute([$name]);
        json_response($sel->fetch(), 201);
    }

    if ($method === 'DELETE' && $action === 'space-types' && $subId !== '') {
        $type = db()->prepare('SELECT name FROM space_types WHERE id = ?');
        $type->execute([$subId]);
        $row = $type->fetch();
        if (!$row) json_error('Type not found', 404);
        $cnt = db()->prepare('SELECT COUNT(*) as c FROM spaces WHERE type = ?');
        $cnt->execute([$row['name']]);
        $inUse = (int)$cnt->fetch()['c'];
        if ($inUse > 0) json_error("Cannot delete — $inUse space(s) use this type", 409);
        db()->prepare('DELETE FROM space_types WHERE id = ?')->execute([$subId]);
        json_response(['message' => 'Type deleted']);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SPACES
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'spaces' && $subId === '') {
        $stmt = db()->query('SELECT id, name, type, description, capacity, floor, amenities, hourly_rate, image_url, is_active, created_at FROM spaces ORDER BY type, name');
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) { if (is_string($r['amenities'])) $r['amenities'] = json_decode($r['amenities'], true) ?: []; }
        json_response($rows);
    }

    if ($method === 'POST' && $action === 'spaces') {
        $body = get_json_body();
        $name = $body['name'] ?? '';
        $type = $body['type'] ?? '';
        if (!$name || !$type) json_error('Name and type are required');

        $amenities = $body['amenities'] ?? [];
        if (!is_array($amenities)) $amenities = array_values(array_filter(array_map('trim', explode(',', $amenities))));

        $spaceId = uuid_v4();

        $ins = db()->prepare(
            'INSERT INTO spaces (id, name, type, floor, capacity, amenities, hourly_rate, description, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $spaceId, $name, $type,
            $body['floor'] ?? null, (int)($body['capacity'] ?? 1),
            json_encode($amenities), (float)($body['hourly_rate'] ?? 0),
            $body['description'] ?? null, ($body['is_active'] ?? true) ? 1 : 0
        ]);
        $sel = db()->prepare('SELECT * FROM spaces WHERE id = ?');
        $sel->execute([$spaceId]);
        $row = $sel->fetch();
        if (is_string($row['amenities'])) $row['amenities'] = json_decode($row['amenities'], true) ?: [];
        json_response($row, 201);
    }

    if ($method === 'PUT' && $action === 'spaces' && $subId !== '') {
        $body = get_json_body();
        $amenities = $body['amenities'] ?? [];
        if (!is_array($amenities)) $amenities = array_values(array_filter(array_map('trim', explode(',', $amenities))));

        $stmt = db()->prepare(
            'UPDATE spaces SET name=?, type=?, floor=?, capacity=?, amenities=?, hourly_rate=?, description=?, is_active=? WHERE id=?'
        );
        $stmt->execute([
            $body['name'] ?? '', $body['type'] ?? '', $body['floor'] ?? null,
            (int)($body['capacity'] ?? 1), json_encode($amenities),
            (float)($body['hourly_rate'] ?? 0), $body['description'] ?? null,
            ($body['is_active'] ?? true) ? 1 : 0, $subId
        ]);
        $sel = db()->prepare('SELECT * FROM spaces WHERE id = ?');
        $sel->execute([$subId]);
        $row = $sel->fetch();
        if (!$row) json_error('Space not found', 404);
        if (is_string($row['amenities'])) $row['amenities'] = json_decode($row['amenities'], true) ?: [];
        json_response($row);
    }

    if ($method === 'DELETE' && $action === 'spaces' && $subId !== '') {
        $cnt = db()->prepare("SELECT COUNT(*) as c FROM bookings WHERE space_id = ? AND status != 'cancelled'");
        $cnt->execute([$subId]);
        if ((int)$cnt->fetch()['c'] > 0) {
            db()->prepare('UPDATE spaces SET is_active = 0 WHERE id = ?')->execute([$subId]);
            json_response(['message' => 'Space deactivated (has active bookings)']);
        }
        db()->prepare('DELETE FROM spaces WHERE id = ?')->execute([$subId]);
        json_response(['message' => 'Space deleted']);
    }

    // ════════════════════════════════════════════════════════════════════════
    // CONTACT MESSAGES
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'contact' && $subId === '') {
        $page  = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 20);
        $offset = ($page - 1) * $limit;
        $unread = ($_GET['unread'] ?? '') === 'true';
        $where = $unread ? 'WHERE is_read = 0' : '';

        $msgs = db()->prepare("SELECT * FROM contact_messages $where ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $msgs->execute([$limit, $offset]);

        $cStmt = db()->query("SELECT CAST(COUNT(*) AS SIGNED) as total, CAST(SUM(is_read = 0) AS SIGNED) as unread FROM contact_messages");
        $counts = $cStmt->fetch();

        json_response(['messages' => $msgs->fetchAll(), 'total' => (int)$counts['total'], 'unread' => (int)$counts['unread'], 'page' => $page, 'limit' => $limit]);
    }

    if ($method === 'PUT' && $action === 'contact' && $subAction === 'read') {
        db()->prepare('UPDATE contact_messages SET is_read = 1 WHERE id = ?')->execute([$subId]);
        json_response(['success' => true]);
    }

    if ($method === 'DELETE' && $action === 'contact' && $subId !== '' && $subAction === '') {
        db()->prepare('DELETE FROM contact_messages WHERE id = ?')->execute([$subId]);
        json_response(['message' => 'Message deleted']);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ACHIEVEMENTS CRUD
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'achievements') {
        $stmt = db()->query('SELECT * FROM achievements ORDER BY category, name');
        json_response($stmt->fetchAll());
    }

    if ($method === 'POST' && $action === 'achievements') {
        $body = get_json_body();
        $name = $body['name'] ?? '';
        $criteria = $body['criteria'] ?? '';
        if (!$name || !$criteria) json_error('Name and criteria are required');

        $achId = uuid_v4();
        $ins = db()->prepare(
            'INSERT INTO achievements (id, name, description, icon, category, xp_reward, criteria, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $achId, $name, $body['description'] ?? '', $body['icon'] ?? '🏅',
            $body['category'] ?? 'general', (int)($body['xp_reward'] ?? 0),
            $criteria, ($body['is_active'] ?? true) ? 1 : 0
        ]);
        $sel = db()->prepare('SELECT * FROM achievements WHERE id = ?');
        $sel->execute([$achId]);
        log_admin_action($user['id'], 'create_achievement', 'achievement', $achId, $name);
        json_response($sel->fetch());
    }

    if ($method === 'PUT' && $action === 'achievements' && $subId !== '') {
        $body = get_json_body();
        $stmt = db()->prepare(
            'UPDATE achievements SET
                name = COALESCE(?, name), description = COALESCE(?, description),
                icon = COALESCE(?, icon), category = COALESCE(?, category),
                xp_reward = COALESCE(?, xp_reward), criteria = COALESCE(?, criteria),
                is_active = COALESCE(?, is_active)
             WHERE id = ?'
        );
        $stmt->execute([
            $body['name'] ?? null, array_key_exists('description', $body) ? $body['description'] : null,
            $body['icon'] ?? null, $body['category'] ?? null,
            array_key_exists('xp_reward', $body) ? (int)$body['xp_reward'] : null,
            $body['criteria'] ?? null,
            array_key_exists('is_active', $body) ? ($body['is_active'] ? 1 : 0) : null,
            $subId
        ]);
        $sel = db()->prepare('SELECT * FROM achievements WHERE id = ?');
        $sel->execute([$subId]);
        $row = $sel->fetch();
        if (!$row) json_error('Achievement not found', 404);
        log_admin_action($user['id'], 'update_achievement', 'achievement', $subId, $body['name'] ?? '');
        json_response($row);
    }

    if ($method === 'DELETE' && $action === 'achievements' && $subId !== '') {
        db()->prepare('DELETE FROM user_achievements WHERE achievement_id = ?')->execute([$subId]);
        db()->prepare('DELETE FROM achievements WHERE id = ?')->execute([$subId]);
        log_admin_action($user['id'], 'delete_achievement', 'achievement', $subId, '');
        json_response(['message' => 'Achievement deleted']);
    }

    // ════════════════════════════════════════════════════════════════════════
    // DAILY CHALLENGES CRUD
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'challenges') {
        json_response(db()->query('SELECT * FROM daily_challenges ORDER BY created_at DESC')->fetchAll());
    }

    if ($method === 'POST' && $action === 'challenges') {
        $body = get_json_body();
        $title = $body['title'] ?? '';
        $challenge_type = $body['challenge_type'] ?? '';
        if (!$title || !$challenge_type) json_error('Title and challenge_type are required');

        $chId = uuid_v4();
        $ins = db()->prepare(
            'INSERT INTO daily_challenges (id, title, description, xp_reward, target_value, challenge_type, active_date, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $chId, $title, $body['description'] ?? '', (int)($body['xp_reward'] ?? 0),
            (int)($body['target_value'] ?? 1), $challenge_type,
            $body['active_date'] ?? null, ($body['is_active'] ?? true) ? 1 : 0
        ]);
        $sel = db()->prepare('SELECT * FROM daily_challenges WHERE id = ?');
        $sel->execute([$chId]);
        log_admin_action($user['id'], 'create_challenge', 'challenge', $chId, $title);
        json_response($sel->fetch());
    }

    if ($method === 'PUT' && $action === 'challenges' && $subId !== '') {
        $body = get_json_body();
        $stmt = db()->prepare(
            'UPDATE daily_challenges SET
                title = COALESCE(?, title), description = COALESCE(?, description),
                xp_reward = COALESCE(?, xp_reward), target_value = COALESCE(?, target_value),
                challenge_type = COALESCE(?, challenge_type), active_date = ?,
                is_active = COALESCE(?, is_active)
             WHERE id = ?'
        );
        $stmt->execute([
            $body['title'] ?? null, array_key_exists('description', $body) ? $body['description'] : null,
            array_key_exists('xp_reward', $body) ? (int)$body['xp_reward'] : null,
            array_key_exists('target_value', $body) ? (int)$body['target_value'] : null,
            $body['challenge_type'] ?? null,
            array_key_exists('active_date', $body) ? $body['active_date'] : null,
            array_key_exists('is_active', $body) ? ($body['is_active'] ? 1 : 0) : null,
            $subId
        ]);
        $sel = db()->prepare('SELECT * FROM daily_challenges WHERE id = ?');
        $sel->execute([$subId]);
        $row = $sel->fetch();
        if (!$row) json_error('Challenge not found', 404);
        log_admin_action($user['id'], 'update_challenge', 'challenge', $subId, $body['title'] ?? '');
        json_response($row);
    }

    if ($method === 'DELETE' && $action === 'challenges' && $subId !== '') {
        db()->prepare('DELETE FROM user_challenges WHERE challenge_id = ?')->execute([$subId]);
        db()->prepare('DELETE FROM daily_challenges WHERE id = ?')->execute([$subId]);
        log_admin_action($user['id'], 'delete_challenge', 'challenge', $subId, '');
        json_response(['message' => 'Challenge deleted']);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ANNOUNCEMENTS CRUD
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'announcements') {
        $stmt = db()->query(
            "SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) as author_name
             FROM announcements a LEFT JOIN users u ON u.id = a.created_by
             ORDER BY a.created_at DESC"
        );
        json_response($stmt->fetchAll());
    }

    if ($method === 'POST' && $action === 'announcements') {
        $body = get_json_body();
        $title   = sanitize($body['title'] ?? '');
        $message = sanitize($body['message'] ?? '');
        if (!$title || !$message) json_error('Title and message are required');
        $priority = $body['priority'] ?? 'info';
        if (!in_array($priority, ['info', 'warning', 'urgent'])) json_error('Invalid priority');
        $targetRole = $body['target_role'] ?? 'all';
        if (!in_array($targetRole, ['all', 'student', 'member', 'staff', 'admin'])) json_error('Invalid target role');

        $ins = db()->prepare(
            'INSERT INTO announcements (title, message, priority, target_role, is_active, created_by, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $title, $message, $priority,
            $targetRole, ($body['is_active'] ?? true) ? 1 : 0,
            $user['id'], $body['expires_at'] ?? null
        ]);
        $lastId = db()->lastInsertId();
        $sel = db()->prepare('SELECT * FROM announcements WHERE id = ?');
        $sel->execute([$lastId]);
        log_admin_action($user['id'], 'create_announcement', 'announcement', $lastId, $title);
        json_response($sel->fetch());
    }

    if ($method === 'PUT' && $action === 'announcements' && $subId !== '') {
        $body = get_json_body();
        if (isset($body['priority']) && !in_array($body['priority'], ['info', 'warning', 'urgent'])) json_error('Invalid priority');
        if (isset($body['target_role']) && !in_array($body['target_role'], ['all', 'student', 'member', 'staff', 'admin'])) json_error('Invalid target role');
        $stmt = db()->prepare(
            'UPDATE announcements SET
                title = COALESCE(?, title), message = COALESCE(?, message),
                priority = COALESCE(?, priority), target_role = COALESCE(?, target_role),
                is_active = COALESCE(?, is_active), expires_at = ?
             WHERE id = ?'
        );
        $stmt->execute([
            isset($body['title']) ? sanitize($body['title']) : null,
            isset($body['message']) ? sanitize($body['message']) : null,
            $body['priority'] ?? null, $body['target_role'] ?? null,
            array_key_exists('is_active', $body) ? ($body['is_active'] ? 1 : 0) : null,
            array_key_exists('expires_at', $body) ? $body['expires_at'] : null,
            $subId
        ]);
        $sel = db()->prepare('SELECT * FROM announcements WHERE id = ?');
        $sel->execute([$subId]);
        $row = $sel->fetch();
        if (!$row) json_error('Announcement not found', 404);
        log_admin_action($user['id'], 'update_announcement', 'announcement', $subId, $body['title'] ?? '');
        json_response($row);
    }

    if ($method === 'DELETE' && $action === 'announcements' && $subId !== '') {
        db()->prepare('DELETE FROM announcements WHERE id = ?')->execute([$subId]);
        log_admin_action($user['id'], 'delete_announcement', 'announcement', $subId, '');
        json_response(['message' => 'Announcement deleted']);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SITE SETTINGS
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'site-settings') {
        $stmt = db()->query("SELECT `key`, value FROM site_settings ORDER BY `key`");
        $settings = [];
        foreach ($stmt->fetchAll() as $r) $settings[$r['key']] = $r['value'];
        json_response($settings);
    }

    if ($method === 'PUT' && $action === 'site-settings') {
        $body = get_json_body();
        if (empty($body)) json_error('No settings provided');
        foreach ($body as $key => $value) {
            $stmt = db()->prepare(
                "INSERT INTO site_settings (`key`, value, updated_at) VALUES (?, ?, NOW())
                 ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()"
            );
            $stmt->execute([sanitize($key), sanitize((string)$value)]);
        }
        log_admin_action($user['id'], 'update_site_settings', 'site_settings', null, implode(', ', array_keys($body)));
        json_response(['message' => 'Settings updated']);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ERROR LOG (#16)
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'GET' && $action === 'error-log') {
        authorize($user, ['admin']);
        $date = $_GET['date'] ?? date('Y-m-d');
        $file = __DIR__ . '/../../logs/error-' . preg_replace('/[^0-9-]/', '', $date) . '.log';
        $entries = [];
        if (file_exists($file)) {
            $lines = array_filter(array_map('trim', file($file, FILE_IGNORE_NEW_LINES)));
            $lines = array_slice($lines, -100);
            foreach ($lines as $line) {
                $parsed = json_decode($line, true);
                if ($parsed) $entries[] = $parsed;
            }
        }
        $logFiles = glob(__DIR__ . '/../../logs/error-*.log');
        $dates = array_map(function($f) {
            return preg_replace('/.*error-(\d{4}-\d{2}-\d{2})\.log/', '$1', $f);
        }, $logFiles ?: []);
        rsort($dates);
        json_response(['entries' => array_reverse($entries), 'dates' => $dates]);
    }

    // ════════════════════════════════════════════════════════════════════════
    // DB BACKUP (#22)
    // ════════════════════════════════════════════════════════════════════════

    if ($method === 'POST' && $action === 'backup') {
        authorize($user, ['admin']);
        $dir = __DIR__ . '/../../backups';
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        $file = $dir . '/mugtuon_' . date('Y-m-d_His') . '.sql';
        $cmd = sprintf('mysqldump -h %s -u %s %s %s > %s 2>&1',
            escapeshellarg(DB_HOST),
            escapeshellarg(DB_USER),
            DB_PASS ? '-p' . escapeshellarg(DB_PASS) : '',
            escapeshellarg(DB_NAME),
            escapeshellarg($file)
        );
        exec($cmd, $output, $code);
        if ($code !== 0 || !file_exists($file) || filesize($file) === 0) {
            @unlink($file);
            json_error('Backup failed: ' . implode("\n", $output), 500);
        }
        log_admin_action($user['id'], 'db_backup', 'database', null, basename($file));
        json_response(['message' => 'Backup created', 'file' => basename($file), 'size' => filesize($file)]);
    }

    if ($method === 'GET' && $action === 'backups') {
        authorize($user, ['admin']);
        $dir = __DIR__ . '/../../backups';
        $files = glob($dir . '/mugtuon_*.sql');
        $list = array_map(function($f) {
            return ['name' => basename($f), 'size' => filesize($f), 'date' => date('c', filemtime($f))];
        }, $files ?: []);
        usort($list, function($a, $b) { return strcmp($b['date'], $a['date']); });
        json_response($list);
    }

    json_error('Not found', 404);
}
