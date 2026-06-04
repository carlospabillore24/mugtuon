require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user:     process.env.DB_USER     || 'postgres',
    host:     process.env.DB_HOST     || 'localhost',
    database: process.env.DB_NAME     || 'mugtuon',
    password: process.env.DB_PASSWORD || 'may242001',
    port:     parseInt(process.env.DB_PORT || '5432'),
});

async function seedPlans() {
    console.log('Seeding membership plans...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add columns introduced after the initial migration
        await client.query(`ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS description  TEXT`);
        await client.query(`ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS is_featured  BOOLEAN DEFAULT false`);
        await client.query(`ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS badge_text   TEXT`);
        await client.query(`ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS button_text  TEXT DEFAULT 'Get Started'`);
        await client.query(`ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS sort_order   INT DEFAULT 0`);

        // Clear existing plans and re-insert cleanly
        await client.query(`DELETE FROM membership_plans`);

        const plans = [
            {
                name:           'Explorer',
                price:          0,
                billing_period: 'monthly',
                description:    'Try MugTuon risk-free',
                features:       ['1 booking per day', 'Basic study timer', 'Community leaderboard', '2 hours max per session', 'Basic productivity stats'],
                is_featured:    false,
                badge_text:     null,
                button_text:    'Get Started',
                sort_order:     1,
            },
            {
                name:           'Scholar',
                price:          499,
                billing_period: 'monthly',
                description:    'For serious students',
                features:       ['5 bookings per day', 'All timer modes', 'AI-powered analytics', 'Priority booking', '8 hours max per day', 'Achievement badges', 'Study group features'],
                is_featured:    true,
                badge_text:     'Most Popular',
                button_text:    'Start Free Trial',
                sort_order:     2,
            },
            {
                name:           'Pro',
                price:          999,
                billing_period: 'monthly',
                description:    'For professionals & teams',
                features:       ['Unlimited bookings', 'Private rooms access', 'Advanced analytics & reports', 'Priority support', 'Unlimited hours', 'Custom study plans', 'API access'],
                is_featured:    false,
                badge_text:     null,
                button_text:    'Contact Sales',
                sort_order:     3,
            },
        ];

        for (const p of plans) {
            await client.query(
                `INSERT INTO membership_plans
                    (name, price, billing_period, description, features, is_featured, badge_text, button_text, sort_order, is_active)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
                [p.name, p.price, p.billing_period, p.description,
                 JSON.stringify(p.features), p.is_featured, p.badge_text, p.button_text, p.sort_order]
            );
        }

        await client.query('COMMIT');
        console.log('  3 membership plans seeded successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seed failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seedPlans();
