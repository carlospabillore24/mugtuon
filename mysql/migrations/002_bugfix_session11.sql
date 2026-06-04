-- Session 11 bug fixes
-- B5: Fix "First Steps" achievement criteria (sessions_10 → sessions_1)
UPDATE achievements SET criteria = 'sessions_1' WHERE name = 'First Steps' AND criteria = 'sessions_10';

-- B9: Add index on bookings.qr_code for QR verify lookups
CREATE INDEX IF NOT EXISTS idx_bookings_qr_code ON bookings (qr_code);
