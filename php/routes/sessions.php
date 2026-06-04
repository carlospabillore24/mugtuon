<?php
/**
 * Study session routes: start, end (with XP/streak/achievement/challenge processing), active, history
 */

function route_sessions(string $method, array $seg): void {
    $action = $seg[1] ?? '';
    $subAction = $seg[2] ?? '';

    // ── POST /api/sessions/start ───────────────────────────────────────────
    if ($method === 'POST' && $action === 'start') {
        $user = authenticate();
        rate_limit('session_' . $user['id'], 900, 20, 'Too many session requests. Please try again later.');
        $body = get_json_body();
        $sessionType = $body['sessionType'] ?? 'deep_work';
        $bookingId   = $body['bookingId'] ?? null;

        $sessionId = uuid_v4();
        $stmt = db()->prepare(
            'INSERT INTO study_sessions (id, user_id, booking_id, session_type, started_at)
             VALUES (?, ?, ?, ?, NOW())'
        );
        $stmt->execute([$sessionId, $user['id'], $bookingId ?: null, $sessionType]);

        $sel = db()->prepare('SELECT * FROM study_sessions WHERE id = ?');
        $sel->execute([$sessionId]);
        json_response($sel->fetch(), 201);
    }

    // ── PUT /api/sessions/:id/end ──────────────────────────────────────────
    if ($method === 'PUT' && $subAction === 'end') {
        $sessionId = $action;
        $user = authenticate();
        $body = get_json_body();
        $focusScore = $body['focusScore'] ?? null;

        // End the session
        $upd = db()->prepare(
            'UPDATE study_sessions
             SET ended_at = NOW(),
                 duration_minutes = TIMESTAMPDIFF(SECOND, started_at, NOW()) / 60,
                 focus_score = ?
             WHERE id = ? AND user_id = ? AND ended_at IS NULL'
        );
        $upd->execute([$focusScore, $sessionId, $user['id']]);
        if ($upd->rowCount() === 0) json_error('Active session not found', 404);

        $sel = db()->prepare('SELECT * FROM study_sessions WHERE id = ?');
        $sel->execute([$sessionId]);
        $session = $sel->fetch();
        $userId = $user['id'];

        // ── 1. Calculate XP ────────────────────────────────────────────────
        $xpEarned = (int) floor($session['duration_minutes'] * 2 + ($session['focus_score'] ?? 50));

        // Write to productivity_scores (daily aggregate)
        $ps = db()->prepare(
            'INSERT INTO productivity_scores (user_id, score_date, total_minutes, focus_score, xp_earned, total_xp)
             VALUES (?, CURDATE(), ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 total_minutes = total_minutes + VALUES(total_minutes),
                 focus_score = GREATEST(focus_score, VALUES(focus_score)),
                 xp_earned = xp_earned + VALUES(xp_earned),
                 total_xp = total_xp + VALUES(total_xp)'
        );
        $ps->execute([$userId, $session['duration_minutes'], $session['focus_score'] ?? 50, $xpEarned, $xpEarned]);

        // Write XP to users table
        $xpUpd = db()->prepare('UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?');
        $xpUpd->execute([$xpEarned, $userId]);

        // ── 2. Update streak ───────────────────────────────────────────────
        _update_streak($userId);

        // ── 3. Update daily challenge progress ─────────────────────────────
        _update_challenge_progress($userId, $session);

        // ── 4. Check & award achievements ──────────────────────────────────
        $newBadges = _check_and_award_achievements($userId, $session);

        // ── 5. Award challenge bonus XP ────────────────────────────────────
        $challengeXP = _award_challenge_xp($userId);

        $totalBonusXP = array_reduce($newBadges, fn($s, $b) => $s + ($b['xp_reward'] ?? 0), 0) + $challengeXP;
        if ($totalBonusXP > 0) {
            $xpUpd = db()->prepare('UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?');
            $xpUpd->execute([$totalBonusXP, $userId]);
        }

        json_response(array_merge($session, [
            'xp_earned'     => $xpEarned,
            'bonus_xp'      => $totalBonusXP,
            'badges_earned'  => array_map(fn($b) => ['name' => $b['name'], 'icon' => $b['icon'], 'xp' => $b['xp_reward']], $newBadges),
        ]));
    }

    // ── GET /api/sessions/active ───────────────────────────────────────────
    if ($method === 'GET' && $action === 'active') {
        $user = authenticate();
        $stmt = db()->prepare('SELECT * FROM study_sessions WHERE user_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1');
        $stmt->execute([$user['id']]);
        $result = $stmt->fetch();
        json_response($result ?: null);
    }

    // ── GET /api/sessions/history ──────────────────────────────────────────
    if ($method === 'GET' && $action === 'history') {
        $user = authenticate();
        $limit  = (int)($_GET['limit'] ?? 20);
        $offset = (int)($_GET['offset'] ?? 0);
        $stmt = db()->prepare(
            'SELECT id, session_type, started_at, ended_at, duration_minutes, focus_score, notes
             FROM study_sessions WHERE user_id = ? AND ended_at IS NOT NULL
             ORDER BY started_at DESC LIMIT ? OFFSET ?'
        );
        $stmt->execute([$user['id'], $limit, $offset]);
        json_response($stmt->fetchAll());
    }

    json_error('Not found', 404);
}

// ═══════════════════════════════════════════════════════════════════════════
// STREAK LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function _update_streak(string $userId): void {
    try {
        $stmt = db()->prepare(
            'SELECT CAST(COUNT(*) AS SIGNED) as cnt FROM study_sessions
             WHERE user_id = ? AND ended_at IS NOT NULL AND DATE(ended_at) = CURDATE()'
        );
        $stmt->execute([$userId]);
        $todayCount = (int)$stmt->fetch()['cnt'];

        if ($todayCount <= 1) {
            $yStmt = db()->prepare(
                'SELECT CAST(COUNT(*) AS SIGNED) as cnt FROM study_sessions
                 WHERE user_id = ? AND ended_at IS NOT NULL AND DATE(ended_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)'
            );
            $yStmt->execute([$userId]);
            $yCount = (int)$yStmt->fetch()['cnt'];

            if ($yCount > 0) {
                $upd = db()->prepare('UPDATE users SET streak_days = COALESCE(streak_days, 0) + 1 WHERE id = ?');
            } else {
                $upd = db()->prepare('UPDATE users SET streak_days = 1 WHERE id = ?');
            }
            $upd->execute([$userId]);
        }
    } catch (Exception $e) {
        error_log('[Streak] ' . $e->getMessage());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY CHALLENGE PROGRESS
// ═══════════════════════════════════════════════════════════════════════════

function _update_challenge_progress(string $userId, array $session): void {
    try {
        $stmt = db()->query(
            'SELECT * FROM daily_challenges
             WHERE is_active = 1 AND (active_date = CURDATE() OR active_date IS NULL)'
        );
        $challenges = $stmt->fetchAll();

        foreach ($challenges as $ch) {
            $progressIncrement = 0;

            if ($ch['challenge_type'] === 'study_time') {
                $progressIncrement = (int) round($session['duration_minutes']);
            } elseif ($ch['challenge_type'] === 'sessions') {
                $progressIncrement = 1;
            } elseif ($ch['challenge_type'] === 'focus_score') {
                $progressIncrement = (int)($session['focus_score'] ?? 0);
            }

            if ($progressIncrement <= 0) continue;

            $progInt   = (int) round($progressIncrement);
            $targetInt = (int) round($ch['target_value']);
            $isComplete = $progInt >= $targetInt ? 1 : 0;

            if ($ch['challenge_type'] === 'focus_score') {
                // For focus score: progress = highest score achieved
                $ins = db()->prepare(
                    'INSERT INTO user_challenges (id, user_id, challenge_id, progress, completed)
                     VALUES (UUID(), ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                         progress = GREATEST(progress, VALUES(progress)),
                         completed = GREATEST(progress, VALUES(progress)) >= ?'
                );
                $ins->execute([$userId, $ch['id'], $progInt, $isComplete, $targetInt]);
            } else {
                // cumulative progress
                $ins = db()->prepare(
                    'INSERT INTO user_challenges (id, user_id, challenge_id, progress, completed)
                     VALUES (UUID(), ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                         progress = progress + VALUES(progress),
                         completed = (progress + VALUES(progress)) >= ?'
                );
                $ins->execute([$userId, $ch['id'], $progInt, $isComplete, $targetInt]);
            }
        }
    } catch (Exception $e) {
        error_log('[Challenges] ' . $e->getMessage());
    }
}

function _award_challenge_xp(string $userId): int {
    try {
        $stmt = db()->prepare(
            'SELECT dc.xp_reward, uc.challenge_id
             FROM user_challenges uc
             JOIN daily_challenges dc ON dc.id = uc.challenge_id
             WHERE uc.user_id = ? AND uc.completed = 1 AND COALESCE(uc.xp_awarded, 0) = 0'
        );
        $stmt->execute([$userId]);
        $completed = $stmt->fetchAll();

        $totalXP = 0;
        foreach ($completed as $c) {
            $totalXP += (int)($c['xp_reward'] ?? 0);
            $upd = db()->prepare('UPDATE user_challenges SET xp_awarded = 1 WHERE user_id = ? AND challenge_id = ?');
            $upd->execute([$userId, $c['challenge_id']]);
        }
        return $totalXP;
    } catch (Exception $e) {
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT AUTO-AWARDING
// ═══════════════════════════════════════════════════════════════════════════

function _check_and_award_achievements(string $userId, array $session): array {
    $awarded = [];
    try {
        $stmt = db()->prepare(
            'SELECT a.* FROM achievements a
             WHERE a.is_active = 1
               AND a.id NOT IN (SELECT achievement_id FROM user_achievements WHERE user_id = ?)'
        );
        $stmt->execute([$userId]);
        $unearned = $stmt->fetchAll();
        if (empty($unearned)) return $awarded;

        // Gather stats
        $s1 = db()->prepare('SELECT CAST(COUNT(*) AS SIGNED) as total_sessions, COALESCE(SUM(duration_minutes),0) as total_minutes FROM study_sessions WHERE user_id = ? AND ended_at IS NOT NULL');
        $s1->execute([$userId]);
        $sessionStats = $s1->fetch();

        $s2 = db()->prepare('SELECT xp, streak_days FROM users WHERE id = ?');
        $s2->execute([$userId]);
        $userRow = $s2->fetch();

        $s3 = db()->prepare('SELECT CAST(COUNT(DISTINCT bm.booking_id) AS SIGNED) as group_count FROM booking_members bm JOIN bookings b ON b.id = bm.booking_id WHERE b.user_id = ?');
        $s3->execute([$userId]);
        $groupStats = $s3->fetch();

        $stats = [
            'totalSessions' => (int)($sessionStats['total_sessions'] ?? 0),
            'totalHours'    => ((float)($sessionStats['total_minutes'] ?? 0)) / 60,
            'streak'        => (int)($userRow['streak_days'] ?? 0),
            'sessionFocus'  => (int)($session['focus_score'] ?? 0),
            'sessionHour'   => $session['started_at'] ? (int)date('G', strtotime($session['started_at'])) : 12,
            'sessionEndHour'=> (int)date('G'),
            'groupBookings' => (int)($groupStats['group_count'] ?? 0),
        ];

        foreach ($unearned as $ach) {
            if (_check_criteria($ach['criteria'] ?? '', $stats)) {
                $ins = db()->prepare(
                    'INSERT IGNORE INTO user_achievements (id, user_id, achievement_id, earned_at)
                     VALUES (UUID(), ?, ?, NOW())'
                );
                $ins->execute([$userId, $ach['id']]);
                $awarded[] = $ach;
            }
        }
    } catch (Exception $e) {
        error_log('[Achievements] ' . $e->getMessage());
    }
    return $awarded;
}

function _check_criteria(string $criteria, array $stats): bool {
    switch ($criteria) {
        case 'sessions_1':    return $stats['totalSessions'] >= 1;
        case 'sessions_10':   return $stats['totalSessions'] >= 10;
        case 'sessions_25':   return $stats['totalSessions'] >= 25;
        case 'sessions_50':   return $stats['totalSessions'] >= 50;
        case 'sessions_100':  return $stats['totalSessions'] >= 100;
        case 'hours_10':      return $stats['totalHours'] >= 10;
        case 'hours_50':      return $stats['totalHours'] >= 50;
        case 'hours_100':     return $stats['totalHours'] >= 100;
        case 'hours_500':     return $stats['totalHours'] >= 500;
        case 'streak_3':      return $stats['streak'] >= 3;
        case 'streak_7':      return $stats['streak'] >= 7;
        case 'streak_14':     return $stats['streak'] >= 14;
        case 'streak_30':     return $stats['streak'] >= 30;
        case 'focus_80':      return $stats['sessionFocus'] >= 80;
        case 'focus_90':      return $stats['sessionFocus'] >= 90;
        case 'focus_95':      return $stats['sessionFocus'] >= 95;
        case 'early_session': return $stats['sessionHour'] < 8;
        case 'late_session':  return $stats['sessionEndHour'] >= 22;
        case 'group_5':       return $stats['groupBookings'] >= 5;
        default:              return false;
    }
}
