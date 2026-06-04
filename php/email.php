<?php
/**
 * MugTuon Email Utility
 *
 * Sends branded HTML emails via SMTP socket (TLS on port 587).
 * Falls back to PHP mail() if SMTP is not configured, or logs to error_log.
 *
 * Mirrors all 10 templates from server/utils/email.js.
 */

require_once __DIR__ . '/config.php';

// ── Base HTML wrapper ──────────────────────────────────────────────────────

function email_wrap_html(string $title, string $bodyContent): string {
    return '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:\'Segoe UI\',Tahoma,Geneva,Verdana,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
        <tr><td style="background:#543020;padding:28px 32px;text-align:center">
          <span style="font-size:28px">&#9749;</span>
          <span style="color:#ffffff;font-size:20px;font-weight:700;margin-left:8px;vertical-align:middle">MugTuon</span>
        </td></tr>
        <tr><td style="padding:32px 32px 0;text-align:center">
          <h1 style="margin:0;font-size:22px;color:#1a1a1a;font-weight:700">' . $title . '</h1>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;font-size:15px;line-height:1.6;color:#444444">
          ' . $bodyContent . '
        </td></tr>
        <tr><td style="padding:20px 32px;background:#faf8f5;border-top:1px solid #eee;text-align:center">
          <p style="margin:0;font-size:12px;color:#999">MugTuon Learning Hub &amp; Cafe</p>
          <p style="margin:4px 0 0;font-size:11px;color:#bbb">This is an automated message. Please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>';
}

// ── SMTP socket sender ─────────────────────────────────────────────────────

function smtp_send(string $to, string $subject, string $html): array {
    if (empty(SMTP_HOST) || empty(SMTP_USER)) {
        error_log("[Email Preview] To: $to | Subject: $subject");
        return ['sent' => false, 'reason' => 'SMTP not configured'];
    }

    try {
        $errno = $errstr = null;
        $socket = @fsockopen(SMTP_HOST, SMTP_PORT, $errno, $errstr, 10);
        if (!$socket) throw new Exception("Cannot connect to SMTP: $errstr ($errno)");

        $read = function() use ($socket) {
            $resp = '';
            while ($line = fgets($socket, 512)) {
                $resp .= $line;
                if ($line[3] === ' ') break;
            }
            return $resp;
        };

        $cmd = function(string $command, int $expect) use ($socket, $read) {
            fwrite($socket, $command . "\r\n");
            $resp = $read();
            $code = (int) substr($resp, 0, 3);
            if ($code !== $expect && $code !== 250 && $code !== 334 && $code !== 235) {
                throw new Exception("SMTP error ($code): $resp");
            }
            return $resp;
        };

        $read(); // greeting

        $cmd('EHLO ' . gethostname(), 250);

        // STARTTLS
        $cmd('STARTTLS', 220);
        $crypto = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if (!$crypto) throw new Exception('STARTTLS failed');

        $cmd('EHLO ' . gethostname(), 250);

        // AUTH LOGIN
        $cmd('AUTH LOGIN', 334);
        $cmd(base64_encode(SMTP_USER), 334);
        $cmd(base64_encode(SMTP_PASS), 235);

        $from = SMTP_USER;
        $cmd("MAIL FROM:<$from>", 250);
        $cmd("RCPT TO:<$to>", 250);
        $cmd('DATA', 354);

        // Build message
        $boundary = md5(uniqid());
        $headers  = "From: " . SMTP_FROM . "\r\n";
        $headers .= "To: $to\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=utf-8\r\n";
        $headers .= "Date: " . date('r') . "\r\n";

        $message = $headers . "\r\n" . $html . "\r\n.\r\n";
        fwrite($socket, $message);
        $resp = $read();

        $cmd('QUIT', 221);
        fclose($socket);

        error_log("[Email] Sent to $to: $subject");
        return ['sent' => true];

    } catch (Exception $e) {
        if (isset($socket) && is_resource($socket)) {
            @fwrite($socket, "QUIT\r\n");
            @fclose($socket);
        }
        error_log("[Email] Failed to send to $to: " . $e->getMessage());
        return ['sent' => false, 'reason' => $e->getMessage()];
    }
}

// ── Generic send ───────────────────────────────────────────────────────────

function send_email(string $to, string $subject, string $title, string $body): array {
    $html = email_wrap_html($title ?: $subject, $body);
    return smtp_send($to, $subject, $html);
}

// ── Template helpers (match Node.js Email.xxx) ─────────────────────────────

function email_password_reset(string $to, string $name, string $resetLink): array {
    return send_email($to, 'Reset Your Password — MugTuon', 'Reset Your Password',
        '<p>Hi <strong>' . esc($name) . '</strong>,</p>
         <p>We received a request to reset your password. Click the button below to set a new one:</p>
         <div style="text-align:center;margin:28px 0">
           <a href="' . esc($resetLink) . '" style="display:inline-block;padding:14px 36px;background:#543020;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Reset Password</a>
         </div>
         <p style="font-size:13px;color:#888">This link expires in <strong>1 hour</strong>. If you didn\'t request this, you can safely ignore this email.</p>
         <p style="font-size:12px;color:#aaa;margin-top:20px;word-break:break-all">Link: ' . esc($resetLink) . '</p>');
}

function email_password_changed(string $to, string $name): array {
    return send_email($to, 'Password Changed — MugTuon', 'Password Changed',
        '<p>Hi <strong>' . esc($name) . '</strong>,</p>
         <p>Your password was successfully changed. If you did this, no further action is needed.</p>
         <p>If you <strong>did not</strong> make this change, please reset your password immediately or contact the administrator.</p>');
}

function email_subscription_confirmation(string $to, string $name, string $planName, float $price, string $expiresAt): array {
    $expiry = date('F j, Y', strtotime($expiresAt));
    $priceFormatted = number_format($price, 0);
    return send_email($to, "Subscription Confirmed — $planName Plan", 'Subscription Confirmed!',
        '<p>Hi <strong>' . esc($name) . '</strong>,</p>
         <p>Your subscription to the <strong>' . esc($planName) . '</strong> plan has been activated.</p>
         <table style="width:100%;border-collapse:collapse;margin:20px 0">
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:120px">Plan</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . esc($planName) . '</td></tr>
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Amount</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">&#8369;' . $priceFormatted . '</td></tr>
           <tr><td style="padding:10px 0;color:#888">Valid Until</td><td style="padding:10px 0;font-weight:600">' . $expiry . '</td></tr>
         </table>
         <p>Enjoy your premium features!</p>');
}

function email_booking_confirmation(string $to, string $name, string $spaceName, string $date, string $startTime, string $endTime, float $amount): array {
    $bookingDate = date('l, F j, Y', strtotime($date));
    $amountFormatted = number_format($amount, 0);
    return send_email($to, "Booking Confirmed — $spaceName", 'Booking Confirmed!',
        '<p>Hi <strong>' . esc($name) . '</strong>,</p>
         <p>Your space booking has been confirmed.</p>
         <table style="width:100%;border-collapse:collapse;margin:20px 0">
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:120px">Space</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . esc($spaceName) . '</td></tr>
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Date</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . $bookingDate . '</td></tr>
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Time</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . esc($startTime) . ' — ' . esc($endTime) . '</td></tr>
           <tr><td style="padding:10px 0;color:#888">Amount</td><td style="padding:10px 0;font-weight:600">&#8369;' . $amountFormatted . '</td></tr>
         </table>
         <p>See you there!</p>');
}

function email_booking_cancelled(string $to, string $name, string $spaceName, string $date, string $startTime, string $endTime): array {
    $bookingDate = date('l, F j, Y', strtotime($date));
    return send_email($to, 'Booking Cancelled — MugTuon', 'Booking Cancelled',
        '<p>Hi <strong>' . esc($name) . '</strong>,</p>
         <p>Your booking has been cancelled.</p>
         <table style="width:100%;border-collapse:collapse;margin:20px 0">
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:120px">Space</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . esc($spaceName) . '</td></tr>
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Date</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . $bookingDate . '</td></tr>
           <tr><td style="padding:10px 0;color:#888">Time</td><td style="padding:10px 0;font-weight:600">' . esc($startTime) . ' — ' . esc($endTime) . '</td></tr>
         </table>
         <p>You can rebook anytime from your Bookings page.</p>');
}

function email_welcome_verification(string $to, string $name, string $verifyLink): array {
    return send_email($to, 'Verify Your Email — MugTuon', 'Welcome to MugTuon!',
        '<p>Hi <strong>' . esc($name) . '</strong>, welcome aboard!</p>
         <p>Please verify your email address to unlock all features:</p>
         <div style="text-align:center;margin:28px 0">
           <a href="' . esc($verifyLink) . '" style="display:inline-block;padding:14px 36px;background:#543020;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Verify Email</a>
         </div>
         <p style="font-size:13px;color:#888">This link expires in <strong>24 hours</strong>. If you didn\'t create an account, you can safely ignore this email.</p>
         <p style="font-size:12px;color:#aaa;margin-top:20px;word-break:break-all">Link: ' . esc($verifyLink) . '</p>');
}

function email_renewal_reminder(string $to, string $name, string $planName, string $expiresAt): array {
    $expiry = date('F j, Y', strtotime($expiresAt));
    $daysLeft = max(0, (int) ceil((strtotime($expiresAt) - time()) / 86400));
    $s = $daysLeft !== 1 ? 's' : '';
    return send_email($to, "Your $planName Plan Expires in $daysLeft Day$s — MugTuon", 'Subscription Expiring Soon',
        '<p>Hi <strong>' . esc($name) . '</strong>,</p>
         <p>Your <strong>' . esc($planName) . '</strong> subscription expires on <strong>' . $expiry . '</strong> (' . $daysLeft . ' day' . $s . ' left).</p>
         <p>To keep your premium access, please renew before it expires.</p>
         <div style="text-align:center;margin:28px 0">
           <a href="' . base_url() . '/pricing" style="display:inline-block;padding:14px 36px;background:#543020;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Renew Now</a>
         </div>');
}

function email_booking_reminder(string $to, string $name, string $spaceName, string $date, string $startTime, string $endTime): array {
    $bookingDate = date('l, F j, Y', strtotime($date));
    return send_email($to, "Reminder: Your Booking Tomorrow — $spaceName", 'You have a booking tomorrow!',
        '<p>Hi <strong>' . esc($name) . '</strong>,</p>
         <p>Just a reminder — you have a space booked for tomorrow.</p>
         <table style="width:100%;border-collapse:collapse;margin:20px 0">
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:120px">Space</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . esc($spaceName) . '</td></tr>
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Date</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . $bookingDate . '</td></tr>
           <tr><td style="padding:10px 0;color:#888">Time</td><td style="padding:10px 0;font-weight:600">' . esc($startTime) . ' — ' . esc($endTime) . '</td></tr>
         </table>
         <p>Don\'t forget your QR code — you can find it in the Bookings section of your account.</p>
         <p>See you tomorrow!</p>');
}

function email_booking_rescheduled(string $to, string $name, string $spaceName, string $oldDate, string $newDate, string $startTime, string $endTime): array {
    $fmtOld = date('M j, Y', strtotime($oldDate));
    $fmtNew = date('l, F j, Y', strtotime($newDate));
    return send_email($to, "Booking Rescheduled — $spaceName", 'Booking Rescheduled',
        '<p>Hi <strong>' . esc($name) . '</strong>,</p>
         <p>Your booking has been rescheduled.</p>
         <table style="width:100%;border-collapse:collapse;margin:20px 0">
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:120px">Space</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . esc($spaceName) . '</td></tr>
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Old Date</td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;text-decoration:line-through">' . $fmtOld . '</td></tr>
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">New Date</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . $fmtNew . '</td></tr>
           <tr><td style="padding:10px 0;color:#888">Time</td><td style="padding:10px 0;font-weight:600">' . esc($startTime) . ' — ' . esc($endTime) . '</td></tr>
         </table>');
}

function email_subscription_cancelled(string $to, string $name, string $planName, string $expiresAt): array {
    $expiry = date('F j, Y', strtotime($expiresAt));
    return send_email($to, 'Subscription Cancelled — MugTuon', 'Subscription Cancelled',
        '<p>Hi <strong>' . esc($name) . '</strong>,</p>
         <p>Your <strong>' . esc($planName) . '</strong> subscription has been cancelled. Your plan remains active until <strong>' . $expiry . '</strong>.</p>
         <p>You can reactivate anytime before then from your Subscription page.</p>
         <p>We\'d love to have you back!</p>');
}

function email_contact_admin(string $name, string $email, string $subject, string $message): array {
    $adminEmail = SMTP_USER ?: '';
    if (!$adminEmail) return ['sent' => false, 'reason' => 'No admin email'];
    return send_email($adminEmail, "New Contact Message: $subject", 'New Contact Message',
        '<p>A new message was submitted on the MugTuon website.</p>
         <table style="width:100%;border-collapse:collapse;margin:20px 0">
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;width:100px">From</td><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600">' . esc($name) . '</td></tr>
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Email</td><td style="padding:10px 0;border-bottom:1px solid #eee">' . esc($email) . '</td></tr>
           <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#888">Subject</td><td style="padding:10px 0;border-bottom:1px solid #eee">' . esc($subject) . '</td></tr>
           <tr><td style="padding:10px 0;color:#888;vertical-align:top">Message</td><td style="padding:10px 0">' . nl2br(esc($message)) . '</td></tr>
         </table>');
}

// ── HTML escape shortcut ───────────────────────────────────────────────────
function esc(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}
