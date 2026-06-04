<?php
/**
 * Auth routes: register, login, me, verify-email, forgot/reset password
 */

function route_auth(string $method, array $seg): void {
    // $seg: ['auth', 'login'] etc.
    $action = $seg[1] ?? '';

    switch ("$method:$action") {

        // ── POST /api/auth/register ────────────────────────────────────────
        case 'POST:register':
            $body = get_json_body();
            $email     = sanitize_email($body['email'] ?? '');
            $password  = $body['password'] ?? '';
            $firstName = sanitize($body['firstName'] ?? '');
            $lastName  = sanitize($body['lastName'] ?? '');
            $phone     = sanitize($body['phone'] ?? '');
            $university = sanitize($body['university'] ?? '');
            $course    = sanitize($body['course'] ?? '');

            if (!$email || !$password) json_error('Email and password are required');
            if (!validate_email($email)) json_error('Please enter a valid email address');
            $pwErr = validate_password($password);
            if ($pwErr) json_error($pwErr);

            // Check existing
            $stmt = db()->prepare('SELECT id FROM users WHERE email = ?');
            $stmt->execute([$email]);
            if ($stmt->fetch()) json_error('Email already registered', 409);

            $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
            $verificationToken = bin2hex(random_bytes(32));
            $userId = uuid_v4();

            $stmt = db()->prepare(
                'INSERT INTO users (id, email, password_hash, first_name, last_name, phone, university, course, verification_token, is_verified, token_version)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)'
            );
            $stmt->execute([$userId, $email, $passwordHash, $firstName, $lastName, $phone, $university, $course, $verificationToken]);

            // Fetch created user
            $stmt = db()->prepare('SELECT id, email, first_name, last_name, role FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            $token = JWT::encode(
                ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role'], 'tv' => 0],
                JWT_SECRET, JWT_EXPIRES_IN
            );

            $remember = $body['remember'] ?? true;
            set_jwt_cookie($token, (bool)$remember);

            // Send verification email (non-blocking best effort)
            $verifyLink = base_url() . '/verify-email?token=' . $verificationToken;
            email_welcome_verification($email, $firstName, $verifyLink);

            json_response(['user' => $user], 201);
            break;

        // ── POST /api/auth/login ───────────────────────────────────────────
        case 'POST:login':
            rate_limit('login', 900, 10, 'Too many login attempts. Please try again in 15 minutes.');
            $body = get_json_body();
            $email    = sanitize_email($body['email'] ?? '');
            $password = $body['password'] ?? '';

            $stmt = db()->prepare(
                'SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name,
                        u.role, u.avatar_url, u.xp, u.streak_days,
                        u.membership_plan_id, u.membership_expires_at,
                        COALESCE(u.is_verified, 1) as is_verified,
                        COALESCE(u.token_version, 0) as token_version,
                        mp.name AS plan_name
                 FROM users u
                 LEFT JOIN membership_plans mp ON mp.id = u.membership_plan_id
                 WHERE u.email = ? AND u.is_active = 1 AND u.deleted_at IS NULL'
            );
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user) json_error('Invalid credentials', 401);
            if (!password_verify($password, $user['password_hash'])) json_error('Invalid credentials', 401);

            // Update last login
            $upd = db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
            $upd->execute([$user['id']]);

            $token = JWT::encode(
                ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role'], 'tv' => (int)$user['token_version']],
                JWT_SECRET, JWT_EXPIRES_IN
            );

            $remember = $body['remember'] ?? true;
            set_jwt_cookie($token, (bool)$remember);

            unset($user['password_hash']);
            json_response(['user' => $user]);
            break;

        // ── GET /api/auth/me ───────────────────────────────────────────────
        case 'GET:me':
            $authUser = authenticate();
            $stmt = db()->prepare(
                'SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url,
                        u.phone, u.bio, u.university, u.course, u.created_at,
                        u.xp, u.streak_days, u.membership_plan_id, u.membership_expires_at,
                        mp.name AS plan_name
                 FROM users u
                 LEFT JOIN membership_plans mp ON mp.id = u.membership_plan_id
                 WHERE u.id = ?'
            );
            $stmt->execute([$authUser['id']]);
            json_response($stmt->fetch());
            break;

        // ── GET /api/auth/verify-email ─────────────────────────────────────
        case 'GET:verify-email':
            $token = $_GET['token'] ?? '';
            if (!$token) json_error('Verification token is required');

            $stmt = db()->prepare(
                'SELECT id, email, first_name FROM users WHERE verification_token = ?'
            );
            $stmt->execute([$token]);
            $user = $stmt->fetch();
            if (!$user) json_error('Invalid or already used verification link.');

            $upd = db()->prepare('UPDATE users SET is_verified = 1, verification_token = NULL, updated_at = NOW() WHERE id = ?');
            $upd->execute([$user['id']]);

            json_response(['success' => true, 'name' => $user['first_name']]);
            break;

        // ── POST /api/auth/resend-verification ─────────────────────────────
        case 'POST:resend-verification':
            $authUser = authenticate();
            $newToken = bin2hex(random_bytes(32));

            $stmt = db()->prepare(
                'UPDATE users SET verification_token = ? WHERE id = ? AND (is_verified = 0 OR is_verified IS NULL)'
            );
            $stmt->execute([$newToken, $authUser['id']]);
            if ($stmt->rowCount() === 0) {
                json_response(['success' => true, 'message' => 'Already verified.']);
            }

            $stmt = db()->prepare('SELECT email, first_name FROM users WHERE id = ?');
            $stmt->execute([$authUser['id']]);
            $u = $stmt->fetch();

            $verifyLink = base_url() . '/verify-email?token=' . $newToken;
            email_welcome_verification($u['email'], $u['first_name'], $verifyLink);

            json_response(['success' => true, 'message' => 'Verification email resent.']);
            break;

        // ── POST /api/auth/forgot-password ─────────────────────────────────
        case 'POST:forgot-password':
            rate_limit('reset', 900, 5, 'Too many reset requests. Please try again in 15 minutes.');
            $body = get_json_body();
            $email = sanitize_email($body['email'] ?? '');
            if (!$email) json_error('Email is required');
            if (!validate_email($email)) json_error('Please enter a valid email address');

            $stmt = db()->prepare('SELECT id, email, first_name FROM users WHERE email = ? AND is_active = 1 AND deleted_at IS NULL');
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if ($user) {
                $token   = bin2hex(random_bytes(32));
                $expires = date('Y-m-d H:i:s', time() + 3600);

                $upd = db()->prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?');
                $upd->execute([$token, $expires, $user['id']]);

                $resetLink = base_url() . '/reset-password?token=' . $token;
                email_password_reset($email, $user['first_name'], $resetLink);
            }

            // Always success — don't reveal whether email exists
            json_response(['success' => true, 'message' => 'If an account exists with this email, a password reset link has been sent. Check your inbox or contact your administrator.']);
            break;

        // ── POST /api/auth/reset-password ──────────────────────────────────
        case 'POST:reset-password':
            $body = get_json_body();
            $token       = $body['token'] ?? '';
            $newPassword = $body['newPassword'] ?? '';
            if (!$token || !$newPassword) json_error('Token and new password are required');
            $pwErr = validate_password($newPassword);
            if ($pwErr) json_error($pwErr);

            $stmt = db()->prepare('SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()');
            $stmt->execute([$token]);
            $user = $stmt->fetch();
            if (!$user) json_error('Invalid or expired reset link. Please request a new one.');

            $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
            $upd = db()->prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = ?');
            $upd->execute([$hash, $user['id']]);

            json_response(['success' => true]);
            break;

        // ── POST /api/auth/logout ─────────────────────────────────────────
        case 'POST:logout':
            clear_jwt_cookie();
            json_response(['success' => true]);
            break;

        default:
            json_error('Not found', 404);
    }
}
