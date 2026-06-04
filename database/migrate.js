require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user:     process.env.DB_USER     || 'postgres',
    host:     process.env.DB_HOST     || 'localhost',
    database: process.env.DB_NAME     || 'mugtuon',
    password: process.env.DB_PASSWORD || 'may242001',
    port:     parseInt(process.env.DB_PORT || '5432'),
});

async function migrate() {
    console.log('Running PostgreSQL migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email         TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name    TEXT NOT NULL,
                last_name     TEXT NOT NULL,
                role          TEXT DEFAULT 'student'
                                CHECK(role IN ('student','member','staff','admin')),
                phone         TEXT,
                university    TEXT,
                course        TEXT,
                bio           TEXT,
                avatar_url    TEXT,
                xp            INTEGER DEFAULT 0,
                streak_days   INTEGER DEFAULT 0,
                is_active     BOOLEAN DEFAULT true,
                last_login_at TIMESTAMPTZ,
                created_at    TIMESTAMPTZ DEFAULT NOW(),
                updated_at    TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS spaces (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name        TEXT NOT NULL,
                type        TEXT NOT NULL
                              CHECK(type IN ('study_seat','private_room','coworking','meeting_room')),
                capacity    INTEGER DEFAULT 1,
                hourly_rate NUMERIC(10,2) NOT NULL,
                floor       TEXT,
                amenities   JSONB DEFAULT '[]',
                is_active   BOOLEAN DEFAULT true,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                space_id     UUID NOT NULL REFERENCES spaces(id),
                booking_date DATE NOT NULL,
                start_time   TEXT NOT NULL,
                end_time     TEXT NOT NULL,
                status       TEXT DEFAULT 'confirmed'
                               CHECK(status IN ('pending','confirmed','checked_in','completed','cancelled','no_show')),
                total_amount NUMERIC(10,2),
                qr_code      TEXT,
                notes        TEXT,
                checked_in_at TIMESTAMPTZ,
                created_at   TIMESTAMPTZ DEFAULT NOW(),
                updated_at   TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS study_sessions (
                id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                booking_id       UUID REFERENCES bookings(id),
                session_type     TEXT DEFAULT 'deep_work'
                                   CHECK(session_type IN ('pomodoro','deep_work','short_break')),
                started_at       TIMESTAMPTZ DEFAULT NOW(),
                ended_at         TIMESTAMPTZ,
                duration_minutes NUMERIC(8,2),
                focus_score      INTEGER,
                notes            TEXT,
                created_at       TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS productivity_scores (
                id             SERIAL PRIMARY KEY,
                user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                score_date     DATE NOT NULL DEFAULT CURRENT_DATE,
                total_minutes  NUMERIC(10,2) DEFAULT 0,
                focus_score    INTEGER DEFAULT 0,
                xp_earned      INTEGER DEFAULT 0,
                total_xp       INTEGER DEFAULT 0,
                streak_days    INTEGER DEFAULT 0,
                level          INTEGER DEFAULT 1,
                UNIQUE(user_id, score_date)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name        TEXT NOT NULL,
                description TEXT,
                icon        TEXT,
                category    TEXT DEFAULT 'general',
                xp_reward   INTEGER DEFAULT 0,
                criteria    TEXT,
                is_active   BOOLEAN DEFAULT true,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                achievement_id UUID NOT NULL REFERENCES achievements(id),
                earned_at      TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, achievement_id)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                booking_id       UUID REFERENCES bookings(id),
                amount           NUMERIC(10,2) NOT NULL,
                payment_method   TEXT DEFAULT 'gcash'
                                   CHECK(payment_method IN ('gcash','card','cash','bank_transfer')),
                type             TEXT DEFAULT 'booking'
                                   CHECK(type IN ('booking','membership')),
                description      TEXT,
                reference_number TEXT,
                status           TEXT DEFAULT 'completed'
                                   CHECK(status IN ('completed','pending','failed','refunded')),
                paid_at          TIMESTAMPTZ DEFAULT NOW(),
                created_at       TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title      TEXT NOT NULL,
                message    TEXT,
                type       TEXT DEFAULT 'info',
                is_read    BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS daily_challenges (
                id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title          TEXT NOT NULL,
                description    TEXT,
                xp_reward      INTEGER DEFAULT 0,
                target_value   INTEGER DEFAULT 1,
                challenge_type TEXT,
                active_date    DATE,
                is_active      BOOLEAN DEFAULT true,
                created_at     TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_challenges (
                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                challenge_id UUID NOT NULL REFERENCES daily_challenges(id),
                progress     INTEGER DEFAULT 0,
                completed    BOOLEAN DEFAULT false,
                date         DATE DEFAULT CURRENT_DATE,
                UNIQUE(user_id, challenge_id, date)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS qr_logs (
                id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                booking_id UUID REFERENCES bookings(id),
                action     TEXT,
                verified   BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS membership_plans (
                id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name           TEXT NOT NULL,
                price          NUMERIC(10,2) DEFAULT 0,
                billing_period TEXT DEFAULT 'monthly',
                features       JSONB DEFAULT '[]',
                is_active      BOOLEAN DEFAULT true,
                created_at     TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // Indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_user   ON bookings(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_date   ON bookings(booking_date)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bookings_space  ON bookings(space_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user   ON study_sessions(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_prod_user_date  ON productivity_scores(user_id, score_date)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_user   ON payments(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifs_user     ON notifications(user_id)`);

        await client.query('COMMIT');
        console.log('Migration complete!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
