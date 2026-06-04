<?php
/**
 * Minimal self-contained JWT library (HS256 only, no Composer).
 */

class JWT {

    /**
     * Encode a payload into a JWT string.
     */
    public static function encode(array $payload, string $secret, int $expireSeconds = 604800): string {
        $header = self::base64url(['alg' => 'HS256', 'typ' => 'JWT']);

        if ($expireSeconds > 0 && !isset($payload['exp'])) {
            $payload['iat'] = time();
            $payload['exp'] = time() + $expireSeconds;
        }

        $payloadB64 = self::base64url($payload);
        $signature  = self::sign("$header.$payloadB64", $secret);

        return "$header.$payloadB64.$signature";
    }

    /**
     * Decode and verify a JWT string. Returns the payload array.
     * Throws RuntimeException on invalid/expired tokens.
     */
    public static function decode(string $token, string $secret): array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('Invalid token structure');
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;

        // Verify signature
        $expected = self::sign("$headerB64.$payloadB64", $secret);
        if (!hash_equals($expected, $signatureB64)) {
            throw new RuntimeException('Invalid signature');
        }

        // Decode payload
        $payload = json_decode(self::base64urlDecode($payloadB64), true);
        if (!$payload) {
            throw new RuntimeException('Invalid payload');
        }

        // Check expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            throw new RuntimeException('Token expired');
        }

        return $payload;
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private static function base64url(array $data): string {
        return rtrim(strtr(base64_encode(json_encode($data)), '+/', '-_'), '=');
    }

    private static function base64urlDecode(string $input): string {
        $remainder = strlen($input) % 4;
        if ($remainder) {
            $input .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($input, '-_', '+/'));
    }

    private static function sign(string $data, string $secret): string {
        $hash = hash_hmac('sha256', $data, $secret, true);
        return rtrim(strtr(base64_encode($hash), '+/', '-_'), '=');
    }
}
