-- MugTuon Learning Hub & Cafe - Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────
-- USERS
-- ─────────────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'member', 'staff', 'admin')),
    phone VARCHAR(20),
    bio TEXT,
    university VARCHAR(255),
    course VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- MEMBERSHIPS
-- ─────────────────────────────────────
CREATE TABLE membership_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_annual DECIMAL(10,2),
    features JSONB DEFAULT '[]',
    max_bookings_per_day INT DEFAULT 1,
    max_hours_per_day INT DEFAULT 4,
    has_private_rooms BOOLEAN DEFAULT false,
    has_priority_booking BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES membership_plans(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- SPACES & SEATS
-- ─────────────────────────────────────
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('study_seat', 'private_room', 'coworking', 'meeting_room')),
    description TEXT,
    capacity INT NOT NULL DEFAULT 1,
    floor VARCHAR(20),
    amenities JSONB DEFAULT '[]',
    hourly_rate DECIMAL(10,2),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')),
    total_amount DECIMAL(10,2),
    notes TEXT,
    qr_code TEXT,
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- STUDY SESSIONS
-- ─────────────────────────────────────
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id),
    session_type VARCHAR(20) DEFAULT 'deep_work' CHECK (session_type IN ('pomodoro', 'deep_work', 'casual', 'group')),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INT,
    focus_score INT CHECK (focus_score BETWEEN 0 AND 100),
    breaks_taken INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- PRODUCTIVITY SCORES
-- ─────────────────────────────────────
CREATE TABLE productivity_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score_date DATE NOT NULL,
    total_minutes INT DEFAULT 0,
    focus_score INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    xp_earned INT DEFAULT 0,
    level INT DEFAULT 1,
    total_xp INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, score_date)
);

-- ─────────────────────────────────────
-- ACHIEVEMENTS
-- ─────────────────────────────────────
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(30) CHECK (category IN ('study', 'streak', 'social', 'booking', 'milestone')),
    xp_reward INT DEFAULT 0,
    requirement_type VARCHAR(30),
    requirement_value INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- ─────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id),
    membership_id UUID REFERENCES user_memberships(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PHP',
    payment_method VARCHAR(30) DEFAULT 'gcash' CHECK (payment_method IN ('gcash', 'cash', 'card', 'bank_transfer')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    reference_number VARCHAR(100),
    description TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('booking', 'payment', 'achievement', 'streak', 'system', 'community')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- QR LOGS
-- ─────────────────────────────────────
CREATE TABLE qr_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('check_in', 'check_out', 'verify')),
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    location VARCHAR(100),
    verified BOOLEAN DEFAULT false
);

-- ─────────────────────────────────────
-- DAILY CHALLENGES
-- ─────────────────────────────────────
CREATE TABLE daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(30) CHECK (challenge_type IN ('study_time', 'focus_score', 'sessions', 'streak')),
    target_value INT NOT NULL,
    xp_reward INT DEFAULT 50,
    active_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES daily_challenges(id),
    progress INT DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, challenge_id)
);

-- ─────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_space ON bookings(space_id);
CREATE INDEX idx_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_scores_user_date ON productivity_scores(user_id, score_date);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_qr_logs_user ON qr_logs(user_id);
