<?php
/**
 * Payment routes: list, create, subscribe to membership plan
 */

function route_payments(string $method, array $seg): void {
    $action = $seg[1] ?? '';

    // ── GET /api/payments ──────────────────────────────────────────────────
    if ($method === 'GET' && $action === '') {
        $user = authenticate();
        $stmt = db()->prepare(
            'SELECT p.*, b.booking_date, b.start_time, b.end_time
             FROM payments p LEFT JOIN bookings b ON b.id = p.booking_id
             WHERE p.user_id = ? ORDER BY p.created_at DESC'
        );
        $stmt->execute([$user['id']]);
        json_response($stmt->fetchAll());
    }

    // ── POST /api/payments ─────────────────────────────────────────────────
    if ($method === 'POST' && $action === '') {
        $user = authenticate();
        rate_limit('payment_' . $user['id'], 900, 10, 'Too many payment requests. Please try again later.');
        $body = get_json_body();

        $amount = (float)($body['amount'] ?? 0);
        if ($amount <= 0 || $amount > 100000) {
            json_error('Invalid payment amount');
        }

        $bookingId = $body['bookingId'] ?? null;
        if ($bookingId) {
            $bk = db()->prepare('SELECT id, total_amount FROM bookings WHERE id = ? AND user_id = ?');
            $bk->execute([$bookingId, $user['id']]);
            if (!$bk->fetch()) json_error('Booking not found', 404);
        }

        $paymentId = uuid_v4();
        $stmt = db()->prepare(
            'INSERT INTO payments (id, user_id, booking_id, amount, payment_method, reference_number, description, status, paid_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, \'completed\', NOW())'
        );
        $stmt->execute([
            $paymentId, $user['id'], $bookingId,
            $amount, $body['paymentMethod'] ?? 'gcash',
            $body['referenceNumber'] ?? null, $body['description'] ?? null
        ]);
        $sel = db()->prepare('SELECT * FROM payments WHERE id = ?');
        $sel->execute([$paymentId]);
        json_response($sel->fetch(), 201);
    }

    // ── POST /api/payments/subscribe ───────────────────────────────────────
    if ($method === 'POST' && $action === 'subscribe') {
        $user = authenticate();
        $body = get_json_body();
        $planId = $body['planId'] ?? '';
        if (!$planId) json_error('Plan ID is required');

        $planStmt = db()->prepare(
            'SELECT id, name, price, billing_period, description, features, badge_text, button_text
             FROM membership_plans WHERE id = ? AND is_active = 1'
        );
        $planStmt->execute([$planId]);
        $plan = $planStmt->fetch();
        if (!$plan) json_error('Plan not found', 404);

        $pdo = db();
        $pdo->beginTransaction();

        try {
            // Dynamic billing interval
            $intervals = ['yearly' => '1 YEAR', 'quarterly' => '3 MONTH', 'monthly' => '1 MONTH'];
            $interval = $intervals[$plan['billing_period']] ?? '1 MONTH';

            $upd = $pdo->prepare(
                "UPDATE users SET membership_plan_id = ?, membership_expires_at = DATE_ADD(NOW(), INTERVAL $interval), membership_cancelled_at = NULL WHERE id = ?"
            );
            $upd->execute([$planId, $user['id']]);

            $payment = null;
            $proofImage = $body['proofImage'] ?? null;
            if ($proofImage && preg_match('/^data:image\/(png|jpe?g|webp|gif);base64,/', $proofImage, $pm)) {
                $ext = $pm[1] === 'jpeg' ? 'jpg' : $pm[1];
                $decoded = base64_decode(preg_replace('/^data:image\/[^;]+;base64,/', '', $proofImage));
                if ($decoded && strlen($decoded) <= 3 * 1024 * 1024) {
                    $fn = $user['id'] . '_' . time() . '.' . $ext;
                    $dir = __DIR__ . '/../../public/uploads/proofs/';
                    if (!is_dir($dir)) @mkdir($dir, 0755, true);
                    file_put_contents($dir . $fn, $decoded);
                    $proofImage = 'uploads/proofs/' . $fn;
                }
            }

            if ((float)$plan['price'] > 0) {
                $paymentMethod = $body['paymentMethod'] ?? 'gcash';
                // Validate against payment_settings
                try {
                    $psStmt = $pdo->query('SELECT method FROM payment_settings WHERE is_enabled = 1');
                    $validMethods = array_column($psStmt->fetchAll(), 'method');
                    if (!empty($validMethods) && !in_array($paymentMethod, $validMethods)) {
                        $paymentMethod = $validMethods[0];
                    }
                } catch (Exception $e) { /* ignore */ }

                $paymentId = uuid_v4();
                $pIns = $pdo->prepare(
                    'INSERT INTO payments (id, user_id, amount, payment_method, reference_number, description, type, status, paid_at, proof_image)
                     VALUES (?, ?, ?, ?, ?, ?, \'membership\', \'completed\', NOW(), ?)'
                );
                $pIns->execute([
                    $paymentId, $user['id'], $plan['price'], $paymentMethod,
                    $body['referenceNumber'] ?? null,
                    $plan['name'] . ' plan subscription',
                    $proofImage
                ]);
                $pSel = $pdo->prepare('SELECT * FROM payments WHERE id = ?');
                $pSel->execute([$paymentId]);
                $payment = $pSel->fetch();
            }

            $pdo->commit();

            // Send confirmation email
            $uInfo = db()->prepare('SELECT email, first_name, membership_expires_at FROM users WHERE id = ?');
            $uInfo->execute([$user['id']]);
            $ui = $uInfo->fetch();
            if ($ui) {
                email_subscription_confirmation($ui['email'], $ui['first_name'], $plan['name'], (float)$plan['price'], $ui['membership_expires_at']);
            }

            // Decode features for response
            $plan['features'] = is_string($plan['features']) ? json_decode($plan['features'], true) : $plan['features'];

            json_response(['success' => true, 'plan' => $plan, 'payment' => $payment]);

        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    json_error('Not found', 404);
}
