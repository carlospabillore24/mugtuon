<?php
/**
 * Achievement routes: list all, mine, daily challenges
 */

function route_achievements(string $method, array $seg): void {
    $action = $seg[1] ?? '';

    // ── GET /api/achievements ──────────────────────────────────────────────
    if ($method === 'GET' && $action === '') {
        $stmt = db()->query('SELECT * FROM achievements WHERE is_active = 1 ORDER BY category, name');
        json_response($stmt->fetchAll());
    }

    // ── GET /api/achievements/mine ─────────────────────────────────────────
    if ($method === 'GET' && $action === 'mine') {
        $user = authenticate();
        $stmt = db()->prepare(
            'SELECT a.*, ua.earned_at FROM achievements a
             JOIN user_achievements ua ON ua.achievement_id = a.id
             WHERE ua.user_id = ? ORDER BY ua.earned_at DESC'
        );
        $stmt->execute([$user['id']]);
        json_response($stmt->fetchAll());
    }

    // ── GET /api/achievements/challenges ───────────────────────────────────
    if ($method === 'GET' && $action === 'challenges') {
        $user = authenticate();
        $stmt = db()->prepare(
            'SELECT dc.*, COALESCE(uc.progress, 0) as progress, COALESCE(uc.completed, 0) as completed
             FROM daily_challenges dc
             LEFT JOIN user_challenges uc ON uc.challenge_id = dc.id AND uc.user_id = ?
             WHERE dc.is_active = 1 AND (dc.active_date = CURDATE() OR dc.active_date IS NULL)'
        );
        $stmt->execute([$user['id']]);
        json_response($stmt->fetchAll());
    }

    json_error('Not found', 404);
}
