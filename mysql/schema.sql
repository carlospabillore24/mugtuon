-- =============================================================================
-- MugTuon Learning Hub & Cafe  —  MySQL Schema
-- Converted from PostgreSQL. Requires MySQL 8.0+
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1. membership_plans  (referenced by users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_plans (
    id          CHAR(36) NOT NULL DEFAULT (UUID()),
    name        VARCHAR(255) NOT NULL,
    price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    billing_period VARCHAR(50) NOT NULL DEFAULT 'monthly',
    features    JSON DEFAULT NULL,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT DEFAULT NULL,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    badge_text  VARCHAR(255) DEFAULT NULL,
    button_text VARCHAR(255) NOT NULL DEFAULT 'Get Started',
    sort_order  INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                      CHAR(36) NOT NULL DEFAULT (UUID()),
    email                   VARCHAR(255) NOT NULL,
    password_hash           TEXT NOT NULL,
    first_name              VARCHAR(255) DEFAULT NULL,
    last_name               VARCHAR(255) DEFAULT NULL,
    role                    VARCHAR(50) NOT NULL DEFAULT 'student',
    phone                   VARCHAR(50) DEFAULT NULL,
    university              VARCHAR(255) DEFAULT NULL,
    course                  VARCHAR(255) DEFAULT NULL,
    bio                     TEXT DEFAULT NULL,
    avatar_url              LONGTEXT DEFAULT NULL,
    xp                      INT NOT NULL DEFAULT 0,
    streak_days             INT NOT NULL DEFAULT 0,
    is_active               TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at           DATETIME DEFAULT NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    membership_plan_id      CHAR(36) DEFAULT NULL,
    membership_expires_at   DATETIME DEFAULT NULL,
    account_status          VARCHAR(20) NOT NULL DEFAULT 'active',
    membership_cancelled_at DATETIME DEFAULT NULL,
    reset_token             VARCHAR(64) DEFAULT NULL,
    reset_token_expires     DATETIME DEFAULT NULL,
    is_verified             TINYINT(1) NOT NULL DEFAULT 0,
    token_version           INT NOT NULL DEFAULT 0,
    renewal_reminder_sent_at DATETIME DEFAULT NULL,
    verification_token      VARCHAR(64) DEFAULT NULL,
    deleted_at              DATETIME DEFAULT NULL,
    email_booking           TINYINT(1) NOT NULL DEFAULT 1,
    email_reminder          TINYINT(1) NOT NULL DEFAULT 1,
    email_renewal           TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_email (email),
    KEY idx_users_deleted (deleted_at),
    CONSTRAINT fk_users_plan FOREIGN KEY (membership_plan_id)
        REFERENCES membership_plans(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. spaces
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spaces (
    id          CHAR(36) NOT NULL DEFAULT (UUID()),
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(100) NOT NULL,
    capacity    INT NOT NULL DEFAULT 1,
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    floor       VARCHAR(100) DEFAULT NULL,
    amenities   JSON DEFAULT NULL,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT DEFAULT NULL,
    image_url   TEXT DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. bookings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id              CHAR(36) NOT NULL DEFAULT (UUID()),
    user_id         CHAR(36) NOT NULL,
    space_id        CHAR(36) NOT NULL,
    booking_date    DATE NOT NULL,
    start_time      VARCHAR(20) NOT NULL,
    end_time        VARCHAR(20) NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'confirmed',
    total_amount    DECIMAL(10,2) DEFAULT NULL,
    qr_code         VARCHAR(255) DEFAULT NULL,
    notes           TEXT DEFAULT NULL,
    checked_in_at   DATETIME DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    reminder_sent   TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_bookings_user_id (user_id),
    KEY idx_bookings_date_status (booking_date, status),
    KEY idx_bookings_space_date (space_id, booking_date),
    CONSTRAINT fk_bookings_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    CONSTRAINT fk_bookings_space FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. booking_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_members (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    booking_id   CHAR(36) NOT NULL,
    member_name  VARCHAR(100) NOT NULL,
    member_email VARCHAR(255) DEFAULT NULL,
    added_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_booking_member_email (booking_id, member_email),
    CONSTRAINT fk_bm_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id               CHAR(36) NOT NULL DEFAULT (UUID()),
    user_id          CHAR(36) NOT NULL,
    booking_id       CHAR(36) DEFAULT NULL,
    amount           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method   VARCHAR(100) NOT NULL DEFAULT 'gcash',
    type             VARCHAR(50) NOT NULL DEFAULT 'booking',
    description      TEXT DEFAULT NULL,
    reference_number VARCHAR(255) DEFAULT NULL,
    status           VARCHAR(50) NOT NULL DEFAULT 'completed',
    paid_at          DATETIME DEFAULT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    proof_image      LONGTEXT DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_payments_user_id (user_id),
    KEY idx_payments_status (status),
    CONSTRAINT fk_payments_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7. study_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_sessions (
    id               CHAR(36) NOT NULL DEFAULT (UUID()),
    user_id          CHAR(36) NOT NULL,
    booking_id       CHAR(36) DEFAULT NULL,
    session_type     VARCHAR(100) NOT NULL DEFAULT 'deep_work',
    started_at       DATETIME DEFAULT NULL,
    ended_at         DATETIME DEFAULT NULL,
    duration_minutes DECIMAL(10,2) DEFAULT NULL,
    focus_score      INT DEFAULT NULL,
    notes            TEXT DEFAULT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_sessions_user (user_id),
    KEY idx_sessions_ended (user_id, ended_at),
    CONSTRAINT fk_sessions_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_sessions_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8. productivity_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productivity_scores (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       CHAR(36) NOT NULL,
    score_date    DATE NOT NULL DEFAULT (CURDATE()),
    total_minutes DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    focus_score   INT NOT NULL DEFAULT 0,
    xp_earned     INT NOT NULL DEFAULT 0,
    total_xp      INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_prod_user_date (user_id, score_date),
    KEY idx_prod_scores_user (user_id),
    KEY idx_prod_scores_date (score_date),
    CONSTRAINT fk_prod_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 9. achievements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
    id          CHAR(36) NOT NULL DEFAULT (UUID()),
    name        VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    icon        VARCHAR(50) DEFAULT NULL,
    category    VARCHAR(100) NOT NULL DEFAULT 'general',
    xp_reward   INT NOT NULL DEFAULT 0,
    criteria    VARCHAR(255) DEFAULT NULL,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 10. user_achievements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_achievements (
    id             CHAR(36) NOT NULL DEFAULT (UUID()),
    user_id        CHAR(36) NOT NULL,
    achievement_id CHAR(36) NOT NULL,
    earned_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_ach (user_id, achievement_id),
    CONSTRAINT fk_ua_user FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE CASCADE,
    CONSTRAINT fk_ua_ach  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 11. daily_challenges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_challenges (
    id             CHAR(36) NOT NULL DEFAULT (UUID()),
    title          VARCHAR(255) NOT NULL,
    description    TEXT DEFAULT NULL,
    xp_reward      INT NOT NULL DEFAULT 0,
    target_value   INT NOT NULL DEFAULT 1,
    challenge_type VARCHAR(100) DEFAULT NULL,
    active_date    DATE DEFAULT NULL,
    is_active      TINYINT(1) NOT NULL DEFAULT 1,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 12. user_challenges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_challenges (
    id           CHAR(36) NOT NULL DEFAULT (UUID()),
    user_id      CHAR(36) NOT NULL,
    challenge_id CHAR(36) NOT NULL,
    progress     INT NOT NULL DEFAULT 0,
    completed    TINYINT(1) NOT NULL DEFAULT 0,
    date         DATE NOT NULL DEFAULT (CURDATE()),
    xp_awarded   TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_challenge (user_id, challenge_id),
    CONSTRAINT fk_uc_user      FOREIGN KEY (user_id)      REFERENCES users(id)            ON DELETE CASCADE,
    CONSTRAINT fk_uc_challenge FOREIGN KEY (challenge_id)  REFERENCES daily_challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 13. qr_logs (was 14 — notifications table removed, it was unused)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_logs (
    id         CHAR(36) NOT NULL DEFAULT (UUID()),
    user_id    CHAR(36) DEFAULT NULL,
    booking_id CHAR(36) DEFAULT NULL,
    action     VARCHAR(100) DEFAULT NULL,
    verified   TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_qr_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
    CONSTRAINT fk_qr_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 15. contact_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    subject    VARCHAR(100) DEFAULT NULL,
    message    TEXT NOT NULL,
    is_read    TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 16. announcements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    priority    VARCHAR(20) NOT NULL DEFAULT 'info',
    target_role VARCHAR(20) NOT NULL DEFAULT 'all',
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_by  CHAR(36) DEFAULT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at  DATETIME DEFAULT NULL,
    CONSTRAINT fk_announce_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 17. admin_audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    admin_id    CHAR(36) NOT NULL,
    action      VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) DEFAULT NULL,
    target_id   VARCHAR(100) DEFAULT NULL,
    details     TEXT DEFAULT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 18. payment_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_settings (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    method     VARCHAR(50) NOT NULL,
    label      VARCHAR(100) NOT NULL,
    icon       VARCHAR(20) DEFAULT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    details    JSON DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ps_method (method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 19. site_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
    `key`      VARCHAR(100) NOT NULL,
    value      TEXT NOT NULL,
    updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 20. space_types
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS space_types (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    label       VARCHAR(100) NOT NULL,
    badge_color VARCHAR(20) NOT NULL DEFAULT 'primary',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_st_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ── Membership Plans (3) ────────────────────────────────────────────────────

INSERT INTO membership_plans (id, name, price, billing_period, description, features, is_active, is_featured, badge_text, button_text, sort_order) VALUES
(UUID(), 'Explorer', 0.00, 'monthly',
 'Perfect for trying out MugTuon',
 '["1 booking per day","Basic study timer","Community leaderboard","Access to common areas"]',
 1, 0, NULL, 'Get Started', 0),
(UUID(), 'Scholar', 499.00, 'monthly',
 'For regular students who need more flexibility',
 '["5 bookings per day","Advanced study timer","Priority support","Access to all spaces","Focus score analytics","Daily challenges"]',
 1, 1, 'Most Popular', 'Subscribe', 1),
(UUID(), 'Academic', 999.00, 'monthly',
 'For power users and professionals',
 '["Unlimited bookings per day","All Scholar features","Private study rooms","Group booking (up to 10)","Export study data","Premium badges"]',
 1, 0, 'Best Value', 'Subscribe', 2);

-- ── Space Types (4) ─────────────────────────────────────────────────────────

INSERT INTO space_types (name, label, badge_color) VALUES
('desk', 'Hot Desk', 'primary'),
('meeting', 'Meeting Room', 'success'),
('private', 'Private Office', 'warning'),
('event', 'Event Space', 'danger');

-- ── Spaces (18) ─────────────────────────────────────────────────────────────

INSERT INTO spaces (id, name, type, capacity, hourly_rate, floor, amenities, is_active, description) VALUES
(UUID(), 'Open Desk A1', 'desk', 1, 35.00, 'Ground Floor',
 '["WiFi","Power Outlet","Desk Lamp"]', 1, 'Individual hot desk near the window'),
(UUID(), 'Open Desk A2', 'desk', 1, 35.00, 'Ground Floor',
 '["WiFi","Power Outlet","Desk Lamp"]', 1, 'Individual hot desk with garden view'),
(UUID(), 'Open Desk A3', 'desk', 1, 35.00, 'Ground Floor',
 '["WiFi","Power Outlet","Desk Lamp"]', 1, 'Comfortable individual workspace'),
(UUID(), 'Open Desk B1', 'desk', 1, 35.00, 'Ground Floor',
 '["WiFi","Power Outlet"]', 1, 'Quiet zone desk'),
(UUID(), 'Open Desk B2', 'desk', 1, 35.00, 'Ground Floor',
 '["WiFi","Power Outlet"]', 1, 'Quiet zone desk near bookshelf'),
(UUID(), 'Communal Table 1', 'desk', 4, 30.00, 'Ground Floor',
 '["WiFi","Power Strip","Shared Screen"]', 1, 'Large shared table for collaborative work'),
(UUID(), 'Communal Table 2', 'desk', 4, 30.00, 'Ground Floor',
 '["WiFi","Power Strip"]', 1, 'Shared workspace with cafe view'),
(UUID(), 'Study Pod 1', 'private', 1, 60.00, '2nd Floor',
 '["WiFi","Power Outlet","Noise Cancelling","Monitor"]', 1, 'Enclosed pod for focused studying'),
(UUID(), 'Study Pod 2', 'private', 1, 60.00, '2nd Floor',
 '["WiFi","Power Outlet","Noise Cancelling","Monitor"]', 1, 'Private pod with standing desk option'),
(UUID(), 'Study Pod 3', 'private', 1, 60.00, '2nd Floor',
 '["WiFi","Power Outlet","Noise Cancelling"]', 1, 'Cozy private study space'),
(UUID(), 'Private Office A', 'private', 2, 80.00, '2nd Floor',
 '["WiFi","Power Outlet","Monitor","Whiteboard","Air Conditioning"]', 1, 'Small private office for duo work'),
(UUID(), 'Private Office B', 'private', 3, 100.00, '2nd Floor',
 '["WiFi","Power Outlet","Monitor","Whiteboard","Air Conditioning","Printer"]', 1, 'Medium office with full amenities'),
(UUID(), 'Meeting Room Alpha', 'meeting', 6, 120.00, '2nd Floor',
 '["WiFi","Projector","Whiteboard","Air Conditioning","Video Conferencing"]', 1, 'Professional meeting room for small groups'),
(UUID(), 'Meeting Room Beta', 'meeting', 10, 180.00, '2nd Floor',
 '["WiFi","Projector","Whiteboard","Air Conditioning","Video Conferencing","Sound System"]', 1, 'Large meeting room for presentations'),
(UUID(), 'Boardroom', 'meeting', 14, 250.00, '2nd Floor',
 '["WiFi","Projector","Dual Monitors","Air Conditioning","Video Conferencing","Sound System","Catering Available"]', 1, 'Executive boardroom for important meetings'),
(UUID(), 'Event Hall', 'event', 50, 500.00, 'Ground Floor',
 '["WiFi","Stage","Projector","Sound System","Microphones","Air Conditioning","Catering Available"]', 1, 'Large event space for workshops and seminars'),
(UUID(), 'Workshop Room', 'event', 20, 300.00, '2nd Floor',
 '["WiFi","Projector","Whiteboard","Tables","Air Conditioning"]', 1, 'Flexible room for workshops and training'),
(UUID(), 'Rooftop Lounge', 'event', 30, 400.00, 'Rooftop',
 '["WiFi","Open Air","City View","Bar Area","Sound System"]', 1, 'Open-air rooftop space for social events');

-- ── Achievements (7) ────────────────────────────────────────────────────────

INSERT INTO achievements (id, name, description, icon, category, xp_reward, criteria, is_active) VALUES
(UUID(), 'First Steps',       'Complete your first study session',      '🎯', 'milestone', 50,  'sessions_1',    1),
(UUID(), 'Dedicated Learner', 'Complete 25 study sessions',             '📚', 'milestone', 150, 'sessions_25',   1),
(UUID(), 'Study Marathon',    'Study for 10 hours total',               '⏱️', 'time',      100, 'hours_10',      1),
(UUID(), 'Streak Starter',    'Maintain a 3-day study streak',          '🔥', 'streak',    75,  'streak_3',      1),
(UUID(), 'Week Warrior',      'Maintain a 7-day study streak',          '💪', 'streak',    200, 'streak_7',      1),
(UUID(), 'Laser Focus',       'Achieve a focus score of 80+ in a session', '🎯', 'focus', 100, 'focus_80',      1),
(UUID(), 'Early Bird',        'Start a session before 8 AM',            '🌅', 'special',   50,  'early_session', 1);

-- ── Site Settings (4) ───────────────────────────────────────────────────────

INSERT INTO site_settings (`key`, value) VALUES
('contact_email',   'mugtuonlhc@gmail.com'),
('contact_phone',   '+63 976 076 8475'),
('contact_address', '19th St., 2nd Floor - CJB Building, Nazareth, Cagayan de Oro City, Misamis Oriental, Philippines, 9000'),
('site_name',       'MugTuon Learning Hub & Cafe')
ON DUPLICATE KEY UPDATE value = VALUES(value);

-- ── Default Payment Settings ────────────────────────────────────────────────

INSERT INTO payment_settings (method, label, icon, is_enabled, details) VALUES
('gcash',         'GCash',         '📱', 1, '{"number": "", "account_name": "", "note": ""}'),
('bank_transfer', 'Bank Transfer', '🏦', 1, '{"number": "", "account_name": "", "note": ""}'),
('cash',          'Cash',          '💵', 1, '{"instruction": "Pay at the front desk"}')
ON DUPLICATE KEY UPDATE label = VALUES(label);
