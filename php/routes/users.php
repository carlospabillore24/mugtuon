<?php
/**
 * User routes: profile, stats, subscription, avatar, password, email prefs, leaderboard, data export
 */

function _check_and_downgrade_expired(string $userId): void {
    try {
        $stmt = db()->prepare(
            'UPDATE users SET membership_plan_id = NULL, membership_expires_at = NULL, membership_cancelled_at = NULL
             WHERE id = ? AND membership_plan_id IS NOT NULL AND membership_expires_at IS NOT NULL AND membership_expires_at < NOW()'
        );
        $stmt->execute([$userId]);
    } catch (Exception $e) { /* ignore */ }
}

function _check_renewal_reminder(string $userId): void {
    try {
        $stmt = db()->prepare(
            'SELECT u.email, u.first_name, u.membership_expires_at, u.renewal_reminder_sent_at,
                    mp.name as plan_name, COALESCE(u.email_renewal, 1) as email_renewal
             FROM users u LEFT JOIN membership_plans mp ON mp.id = u.membership_plan_id
             WHERE u.id = ? AND u.membership_plan_id IS NOT NULL
               AND u.membership_expires_at IS NOT NULL
               AND u.membership_expires_at > NOW()
               AND u.membership_expires_at <= DATE_ADD(NOW(), INTERVAL 3 DAY)
               AND COALESCE(u.email_renewal, 1) = 1
               AND (u.renewal_reminder_sent_at IS NULL OR u.renewal_reminder_sent_at < DATE_SUB(NOW(), INTERVAL 2 DAY))'
        );
        $stmt->execute([$userId]);
        $u = $stmt->fetch();
        if ($u) {
            email_renewal_reminder($u['email'], $u['first_name'], $u['plan_name'], $u['membership_expires_at']);
            $upd = db()->prepare('UPDATE users SET renewal_reminder_sent_at = NOW() WHERE id = ?');
            $upd->execute([$userId]);
        }
    } catch (Exception $e) { /* ignore */ }
}

function route_users(string $method, array $seg): void {
    $action = $seg[1] ?? '';

    switch ("$method:$action") {

        // ── GET /api/users/profile ─────────────────────────────────────────
        case 'GET:profile':
            $user = authenticate();
            $stmt = db()->prepare(
                'SELECT id, email, first_name, last_name, role, phone, university, course,
                        bio, avatar_url, xp, streak_days, is_active, created_at,
                        COALESCE(is_verified, 1) as is_verified,
                        COALESCE(email_booking, 1) as email_booking,
                        COALESCE(email_reminder, 1) as email_reminder,
                        COALESCE(email_renewal, 1) as email_renewal
                 FROM users WHERE id = ?'
            );
            $stmt->execute([$user['id']]);
            json_response($stmt->fetch());
            break;

        // ── PUT /api/users/profile ─────────────────────────────────────────
        case 'PUT:profile':
            $user = authenticate();
            $body = get_json_body();
            $stmt = db()->prepare(
                'UPDATE users SET first_name=?, last_name=?, phone=?, bio=?, university=?, course=?, updated_at=NOW()
                 WHERE id=?'
            );
            $stmt->execute([
                sanitize($body['firstName'] ?? ''), sanitize($body['lastName'] ?? ''),
                sanitize($body['phone'] ?? ''), sanitize($body['bio'] ?? ''),
                sanitize($body['university'] ?? ''), sanitize($body['course'] ?? ''),
                $user['id']
            ]);
            $sel = db()->prepare('SELECT id, email, first_name, last_name, phone, bio, university, course FROM users WHERE id = ?');
            $sel->execute([$user['id']]);
            json_response($sel->fetch());
            break;

        // ── PUT /api/users/email-preferences ───────────────────────────────
        case 'PUT:email-preferences':
            $user = authenticate();
            $body = get_json_body();
            $stmt = db()->prepare('UPDATE users SET email_booking=?, email_reminder=?, email_renewal=? WHERE id=?');
            $stmt->execute([
                ($body['email_booking'] ?? true) ? 1 : 0,
                ($body['email_reminder'] ?? true) ? 1 : 0,
                ($body['email_renewal'] ?? true) ? 1 : 0,
                $user['id']
            ]);
            json_response(['success' => true]);
            break;

        // ── PUT /api/users/avatar ──────────────────────────────────────────
        case 'PUT:avatar':
            $user = authenticate();
            $body = get_json_body();
            $avatar = $body['avatar'] ?? '';
            if (!$avatar) json_error('Avatar image is required');

            $avatarUrl = $avatar;
            if (preg_match('/^data:image\/(png|jpe?g|webp|gif);base64,/', $avatar, $m)) {
                $ext = $m[1] === 'jpeg' ? 'jpg' : $m[1];
                $decoded = base64_decode(preg_replace('/^data:image\/[^;]+;base64,/', '', $avatar));
                if (!$decoded || strlen($decoded) > 2 * 1024 * 1024) json_error('Image too large (max 2MB)');
                $filename = $user['id'] . '_' . time() . '.' . $ext;
                $uploadDir = __DIR__ . '/../../public/uploads/avatars/';
                if (!is_dir($uploadDir)) @mkdir($uploadDir, 0755, true);
                file_put_contents($uploadDir . $filename, $decoded);
                $avatarUrl = 'uploads/avatars/' . $filename;
            }

            $stmt = db()->prepare('UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?');
            $stmt->execute([$avatarUrl, $user['id']]);
            json_response(['success' => true, 'avatar_url' => $avatarUrl]);
            break;

        // ── GET /api/users/leaderboard ─────────────────────────────────────
        case 'GET:leaderboard':
            $period = $_GET['period'] ?? 'alltime';
            $intervalFilter = '';
            if ($period === 'daily')   $intervalFilter = "AND ps.score_date = CURDATE()";
            if ($period === 'weekly')  $intervalFilter = "AND ps.score_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
            if ($period === 'monthly') $intervalFilter = "AND ps.score_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";

            $stmt = db()->query("
                SELECT u.id, u.first_name, u.last_name, u.avatar_url, u.university,
                       u.xp, u.streak_days,
                       CAST(COALESCE(SUM(ps.total_minutes),0) AS SIGNED) as total_minutes,
                       CAST(COALESCE(AVG(ps.focus_score),0) AS SIGNED) as avg_focus
                FROM users u
                LEFT JOIN productivity_scores ps ON ps.user_id = u.id $intervalFilter
                WHERE u.is_active = 1 AND u.deleted_at IS NULL AND u.role NOT IN ('admin','staff')
                GROUP BY u.id, u.first_name, u.last_name, u.avatar_url, u.university, u.xp, u.streak_days
                ORDER BY u.xp DESC
                LIMIT 50
            ");
            json_response($stmt->fetchAll());
            break;

        // ── GET /api/users/stats ───────────────────────────────────────────
        case 'GET:stats':
            $user = authenticate();
            _check_and_downgrade_expired($user['id']);
            _check_renewal_reminder($user['id']);

            $s1 = db()->prepare(
                'SELECT CAST(COUNT(*) AS SIGNED) as total_sessions,
                        CAST(COALESCE(SUM(duration_minutes),0) AS SIGNED) as total_minutes
                 FROM study_sessions WHERE user_id = ? AND ended_at IS NOT NULL'
            );
            $s1->execute([$user['id']]);
            $sessions = $s1->fetch();

            $s2 = db()->prepare(
                'SELECT u.xp, u.streak_days, u.membership_expires_at,
                        COALESCE(mp.name, \'Explorer\') AS plan_name,
                        COALESCE(mp.price, 0) AS plan_price,
                        mp.badge_text AS plan_badge
                 FROM users u LEFT JOIN membership_plans mp ON mp.id = u.membership_plan_id
                 WHERE u.id = ?'
            );
            $s2->execute([$user['id']]);
            $userRow = $s2->fetch();

            $s3 = db()->prepare('SELECT CAST(COUNT(*) AS SIGNED) as badge_count FROM user_achievements WHERE user_id = ?');
            $s3->execute([$user['id']]);
            $achievements = $s3->fetch();

            $s4 = db()->prepare('SELECT CAST(COUNT(*) AS SIGNED) as total_bookings FROM bookings WHERE user_id = ?');
            $s4->execute([$user['id']]);
            $bookingsCount = $s4->fetch();

            json_response([
                'total_sessions'  => (int)$sessions['total_sessions'],
                'total_minutes'   => (int)$sessions['total_minutes'],
                'xp'              => (int)($userRow['xp'] ?? 0),
                'streak_days'     => (int)($userRow['streak_days'] ?? 0),
                'plan_name'       => $userRow['plan_name'] ?? 'Explorer',
                'plan_price'      => (float)($userRow['plan_price'] ?? 0),
                'plan_badge'      => $userRow['plan_badge'] ?? null,
                'membership_expires_at' => $userRow['membership_expires_at'] ?? null,
                'badge_count'     => (int)$achievements['badge_count'],
                'total_bookings'  => (int)$bookingsCount['total_bookings'],
            ]);
            break;

        // ── GET /api/users/subscription ────────────────────────────────────
        case 'GET:subscription':
            $user = authenticate();
            _check_and_downgrade_expired($user['id']);

            $s1 = db()->prepare(
                'SELECT u.membership_plan_id, u.membership_expires_at, u.membership_cancelled_at,
                        mp.name as plan_name, mp.price as plan_price,
                        mp.description as plan_description, mp.features as plan_features,
                        mp.billing_period, mp.badge_text
                 FROM users u LEFT JOIN membership_plans mp ON mp.id = u.membership_plan_id
                 WHERE u.id = ?'
            );
            $s1->execute([$user['id']]);
            $u = $s1->fetch() ?: [];

            $s2 = db()->prepare(
                'SELECT id, amount, payment_method, reference_number, status, created_at
                 FROM payments WHERE user_id = ? AND type = \'membership\'
                 ORDER BY created_at DESC LIMIT 10'
            );
            $s2->execute([$user['id']]);
            $payments = $s2->fetchAll();

            $features = $u['plan_features'] ?? '[]';
            if (is_string($features)) $features = json_decode($features, true) ?: [];

            json_response([
                'plan' => [
                    'id'             => $u['membership_plan_id'] ?? null,
                    'name'           => $u['plan_name'] ?? 'Explorer',
                    'price'          => (float)($u['plan_price'] ?? 0),
                    'description'    => $u['plan_description'] ?? null,
                    'features'       => $features,
                    'billing_period' => $u['billing_period'] ?? 'monthly',
                    'badge_text'     => $u['badge_text'] ?? null,
                    'expires_at'     => $u['membership_expires_at'] ?? null,
                    'cancelled_at'   => $u['membership_cancelled_at'] ?? null,
                ],
                'payments' => $payments,
            ]);
            break;

        // ── POST /api/users/subscription → sub-routes ──────────────────────
        case 'POST:subscription':
            $sub = $seg[2] ?? '';
            $user = authenticate();

            if ($sub === 'cancel') {
                $stmt = db()->prepare('UPDATE users SET membership_cancelled_at = NOW() WHERE id = ?');
                $stmt->execute([$user['id']]);

                $info = db()->prepare(
                    'SELECT u.email, u.first_name, u.membership_expires_at, mp.name as plan_name
                     FROM users u LEFT JOIN membership_plans mp ON mp.id = u.membership_plan_id
                     WHERE u.id = ?'
                );
                $info->execute([$user['id']]);
                $r = $info->fetch();
                if ($r && $r['plan_name']) {
                    email_subscription_cancelled($r['email'], $r['first_name'], $r['plan_name'], $r['membership_expires_at']);
                }
                json_response(['success' => true]);

            } elseif ($sub === 'reactivate') {
                $stmt = db()->prepare('UPDATE users SET membership_cancelled_at = NULL WHERE id = ?');
                $stmt->execute([$user['id']]);
                json_response(['success' => true]);
            }
            json_error('Not found', 404);
            break;

        // ── PUT /api/users/password ────────────────────────────────────────
        case 'PUT:password':
            $user = authenticate();
            $body = get_json_body();
            $currentPassword = $body['currentPassword'] ?? '';
            $newPassword     = $body['newPassword'] ?? '';
            if (!$currentPassword || !$newPassword) json_error('Current and new password are required');
            $pwErr = validate_password($newPassword);
            if ($pwErr) json_error($pwErr);

            $stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
            $stmt->execute([$user['id']]);
            $row = $stmt->fetch();
            if (!$row) json_error('User not found', 404);
            if (!password_verify($currentPassword, $row['password_hash'])) json_error('Current password is incorrect', 401);

            $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
            $upd = db()->prepare(
                'UPDATE users SET password_hash = ?, token_version = COALESCE(token_version, 0) + 1, updated_at = NOW() WHERE id = ?'
            );
            $upd->execute([$hash, $user['id']]);
            invalidate_token_cache($user['id']);

            // Get updated token version
            $tvStmt = db()->prepare('SELECT email, first_name, COALESCE(token_version, 0) as token_version FROM users WHERE id = ?');
            $tvStmt->execute([$user['id']]);
            $info = $tvStmt->fetch();

            if ($info) email_password_changed($info['email'], $info['first_name']);

            $newToken = JWT::encode(
                ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role'], 'tv' => (int)$info['token_version']],
                JWT_SECRET, JWT_EXPIRES_IN
            );
            set_jwt_cookie($newToken, true);
            json_response(['success' => true]);
            break;

        // ── GET /api/users/export ──────────────────────────────────────────
        case 'GET:export':
            $user = authenticate();
            $uid = $user['id'];

            $p1 = db()->prepare('SELECT id, email, first_name, last_name, university, role, xp, streak_days, COALESCE(is_verified,1) as is_verified, created_at, last_login_at FROM users WHERE id = ?');
            $p1->execute([$uid]);
            $profile = $p1->fetch();

            $p2 = db()->prepare('SELECT b.booking_date, b.start_time, b.end_time, b.status, b.total_amount, b.notes, s.name as space_name FROM bookings b LEFT JOIN spaces s ON s.id = b.space_id WHERE b.user_id = ? ORDER BY b.booking_date DESC');
            $p2->execute([$uid]);
            $bookings = $p2->fetchAll();

            $p3 = db()->prepare('SELECT session_type, started_at, ended_at, duration_minutes, focus_score FROM study_sessions WHERE user_id = ? ORDER BY started_at DESC');
            $p3->execute([$uid]);
            $studySessions = $p3->fetchAll();

            $p4 = db()->prepare('SELECT a.name, a.description, a.category, a.xp_reward, ua.earned_at FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id WHERE ua.user_id = ? ORDER BY ua.earned_at DESC');
            $p4->execute([$uid]);
            $achievements = $p4->fetchAll();

            $p5 = db()->prepare('SELECT type, payment_method, amount, status, reference_number, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC');
            $p5->execute([$uid]);
            $payments = $p5->fetchAll();

            header('Content-Disposition: attachment; filename="mugtuon-my-data.json"');
            json_response([
                'exported_at'     => date('c'),
                'profile'         => $profile ?: new stdClass(),
                'bookings'        => $bookings,
                'study_sessions'  => $studySessions,
                'achievements'    => $achievements,
                'payments'        => $payments,
            ]);
            break;

        default:
            json_error('Not found', 404);
    }
}
