<?php
/**
 * Analytics routes: weekly, monthly, summary, community, announcements
 */

function route_analytics(string $method, array $seg): void {
    $action = $seg[1] ?? '';

    // ── GET /api/analytics/weekly ──────────────────────────────────────────
    if ($method === 'GET' && $action === 'weekly') {
        $user = authenticate();
        $stmt = db()->prepare(
            'SELECT score_date, total_minutes, focus_score, xp_earned
             FROM productivity_scores
             WHERE user_id = ? AND score_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             ORDER BY score_date'
        );
        $stmt->execute([$user['id']]);
        json_response($stmt->fetchAll());
    }

    // ── GET /api/analytics/monthly ─────────────────────────────────────────
    if ($method === 'GET' && $action === 'monthly') {
        $user = authenticate();
        $stmt = db()->prepare(
            'SELECT score_date, total_minutes, focus_score, xp_earned
             FROM productivity_scores
             WHERE user_id = ? AND score_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
             ORDER BY score_date'
        );
        $stmt->execute([$user['id']]);
        json_response($stmt->fetchAll());
    }

    // ── GET /api/analytics/summary ─────────────────────────────────────────
    if ($method === 'GET' && $action === 'summary') {
        $user = authenticate();
        $stmt = db()->prepare(
            'SELECT
                COALESCE(SUM(total_minutes), 0) as total_study_minutes,
                COALESCE(AVG(focus_score), 0) as avg_focus_score,
                COALESCE((SELECT streak_days FROM users WHERE id = ?), 0) as best_streak,
                COALESCE(SUM(xp_earned), 0) as total_xp,
                COUNT(*) as active_days
             FROM productivity_scores WHERE user_id = ?'
        );
        $stmt->execute([$user['id'], $user['id']]);
        json_response($stmt->fetch());
    }

    // ── GET /api/analytics/community ───────────────────────────────────────
    if ($method === 'GET' && $action === 'community') {
        $s1 = db()->query('SELECT COUNT(DISTINCT user_id) as total_users, COALESCE(SUM(total_minutes),0) as total_hours FROM productivity_scores');
        $totals = $s1->fetch();
        $s2 = db()->query('SELECT COUNT(*) as active_now FROM study_sessions WHERE ended_at IS NULL');
        $active = $s2->fetch();
        $s3 = db()->query("SELECT COUNT(*) as bookings_today FROM bookings WHERE booking_date = CURDATE() AND status != 'cancelled'");
        $today = $s3->fetch();

        json_response([
            'totalUsers'      => (int)$totals['total_users'],
            'totalStudyHours' => (int) floor($totals['total_hours'] / 60),
            'activeNow'       => (int)$active['active_now'],
            'bookingsToday'   => (int)$today['bookings_today'],
        ]);
    }

    // ── GET /api/analytics/announcements ───────────────────────────────────
    if ($method === 'GET' && $action === 'announcements') {
        $user = authenticate();
        $userRole = $user['role'] ?? 'student';
        try {
            $stmt = db()->prepare(
                'SELECT id, title, message, priority, created_at FROM announcements
                 WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())
                   AND (target_role = \'all\' OR target_role = ?)
                 ORDER BY created_at DESC LIMIT 10'
            );
            $stmt->execute([$userRole]);
            json_response($stmt->fetchAll());
        } catch (Exception $e) {
            json_response([]);
        }
    }

    json_error('Not found', 404);
}
