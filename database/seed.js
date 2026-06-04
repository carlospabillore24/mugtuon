require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
    user:     process.env.DB_USER     || "postgres",
    host:     process.env.DB_HOST     || "localhost",
    database: process.env.DB_NAME     || "mugtuon",
    password: process.env.DB_PASSWORD || "may242001",
    port:     parseInt(process.env.DB_PORT || "5432"),
});

async function seed() {
    console.log("Seeding database...");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const passwordHash = await bcrypt.hash("password123", 12);

        // Users
        const userRows = await client.query(`
            INSERT INTO users (email, password_hash, first_name, last_name, role, university, xp, streak_days)
            VALUES
                ('admin@mugtuon.com',  $1,'Admin', 'MugTuon','admin',  NULL,         1200,5),
                ('staff@mugtuon.com',  $1,'Maria', 'Lim',    'staff',  NULL,         800, 3),
                ('carlos@example.com', $1,'Carlos','Mendoza', 'member','UP Cebu',   8420,45),
                ('ana@example.com',    $1,'Ana',   'Santos',  'member','UST',        7850,38),
                ('miguel@example.com', $1,'Miguel','Torres',  'student','Ateneo',   7210,32),
                ('sofia@example.com',  $1,'Sofia', 'Garcia',  'member','DLSU',      6890,28),
                ('james@example.com',  $1,'James', 'Cruz',    'student','UP Diliman',6540,25),
                ('angela@example.com', $1,'Angela','Tan',     'member','UST',        5980,20)
            ON CONFLICT (email) DO UPDATE SET
                password_hash=EXCLUDED.password_hash,
                xp=EXCLUDED.xp,
                streak_days=EXCLUDED.streak_days
            RETURNING id, email
        `, [passwordHash]);

        const userIds = {};
        for (const u of userRows.rows) userIds[u.email] = u.id;
        console.log("  Users:", userRows.rows.length);

        // Spaces
        const spaceRows = await client.query(`
            INSERT INTO spaces (name,type,capacity,hourly_rate,floor,amenities) VALUES
                ('Study Seat A1',   'study_seat',  1, 50, '1st Floor','["WiFi","Power Outlet"]'),
                ('Study Seat A2',   'study_seat',  1, 50, '1st Floor','["WiFi","Power Outlet"]'),
                ('Study Seat B1',   'study_seat',  1, 50, '2nd Floor','["WiFi","Power Outlet","Monitor"]'),
                ('Private Room A',  'private_room',4,200, '2nd Floor','["WiFi","Whiteboard","TV"]'),
                ('Private Room B',  'private_room',6,300, '2nd Floor','["WiFi","Whiteboard","TV","AC"]'),
                ('Coworking Desk 1','coworking',   1, 75, '1st Floor','["WiFi","Dual Monitor","Standing Desk"]')
            ON CONFLICT DO NOTHING RETURNING id,name
        `);
        const spaceIds = {};
        for (const s of spaceRows.rows) spaceIds[s.name] = s.id;
        if (Object.keys(spaceIds).length === 0) {
            const ex = await client.query("SELECT id,name FROM spaces");
            for (const s of ex.rows) spaceIds[s.name] = s.id;
        }
        console.log("  Spaces seeded.");

        // Achievements
        await client.query(`
            INSERT INTO achievements (name,description,icon,category,xp_reward,criteria) VALUES
                ('Early Bird',   'Start a session before 8 AM',   '🌅','consistency', 50,'early_session'),
                ('Night Owl',    'Study past 10 PM',               '🦉','consistency', 50,'late_session'),
                ('Streak Master','Maintain a 7-day study streak',  '🔥','streak',     250,'streak_7'),
                ('Bookworm',     'Complete 50 study sessions',     '📚','sessions',   500,'sessions_50'),
                ('100 Hours',    'Log 100 hours of study time',    '💯','time',      1000,'hours_100'),
                ('Focus King',   'Achieve a 95+ focus score',      '👑','focus',      200,'focus_95'),
                ('Social',       'Join 5 group study sessions',    '🤝','community',  150,'group_5')
            ON CONFLICT DO NOTHING
        `);
        console.log("  Achievements seeded.");

        // Daily Challenges
        await client.query(`
            INSERT INTO daily_challenges (title,description,xp_reward,target_value,challenge_type) VALUES
                ('Study for 2 hours',    'Complete at least 2 hours of study time today', 50,120,'study_time'),
                ('Complete 3 Pomodoros', 'Finish 3 full Pomodoro sessions',               30,  3,'sessions'),
                ('Achieve 90+ Focus',    'Reach a focus score of 90 or higher',           75, 90,'focus_score')
            ON CONFLICT DO NOTHING
        `);
        console.log("  Challenges seeded.");

        // Bookings
        const today    = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now()+86400000).toISOString().split("T")[0];
        // Insert bookings one by one to avoid param type inference issues
        const bookingData = [
            [userIds["carlos@example.com"], spaceIds["Study Seat A1"],    today,    '14:00','17:00','confirmed',  150],
            [userIds["ana@example.com"],    spaceIds["Private Room A"],   today,    '10:00','12:00','confirmed',  400],
            [userIds["miguel@example.com"], spaceIds["Coworking Desk 1"], today,    '09:00','18:00','checked_in', 675],
            [userIds["sofia@example.com"],  spaceIds["Study Seat B1"],    today,    '13:00','16:00','confirmed',  150],
            [userIds["james@example.com"],  spaceIds["Private Room B"],   today,    '15:00','17:00','confirmed',  600],
            [userIds["carlos@example.com"], spaceIds["Private Room B"],   tomorrow, '10:00','12:00','confirmed',  600],
            [userIds["angela@example.com"], spaceIds["Study Seat A2"],    tomorrow, '14:00','16:00','confirmed',  100],
        ];
        for (const [uid, sid, bd, st, et, status, amt] of bookingData) {
            await client.query(
                `INSERT INTO bookings(user_id,space_id,booking_date,start_time,end_time,status,total_amount)
                 VALUES($1,$2,$3,$4,$5,$6,$7)`,
                [uid, sid, bd, st, et, status, amt]
            );
        }
        console.log("  Bookings seeded.");

        // Study Sessions + Productivity Scores (14 days of data)
        const emails = ["carlos@example.com","ana@example.com","miguel@example.com","sofia@example.com","james@example.com"];
        for (let d=0; d<14; d++) {
            const date = new Date();
            date.setDate(date.getDate()-d);
            const ds = date.toISOString().split("T")[0];
            for (const email of emails) {
                const dur   = 60+Math.floor(Math.random()*120);
                const focus = 70+Math.floor(Math.random()*25);
                const xp    = Math.floor(dur*2+focus);
                const type  = Math.random()>0.5?"pomodoro":"deep_work";
                const h     = 10+Math.floor(Math.random()*6);
                const endH  = Math.min(22, h+Math.ceil(dur/60));
                await client.query(
                    `INSERT INTO study_sessions(user_id,session_type,started_at,ended_at,duration_minutes,focus_score)
                     VALUES($1,$2,$3,$4,$5,$6)`,
                    [userIds[email], type,
                     ds+"T"+String(h).padStart(2,"0")+":00:00Z",
                     ds+"T"+String(endH).padStart(2,"0")+":00:00Z",
                     dur, focus]
                );
                await client.query(
                    `INSERT INTO productivity_scores(user_id,score_date,total_minutes,focus_score,xp_earned,total_xp,streak_days,level)
                     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
                     ON CONFLICT(user_id,score_date) DO UPDATE SET
                         total_minutes = productivity_scores.total_minutes + EXCLUDED.total_minutes,
                         focus_score   = GREATEST(productivity_scores.focus_score, EXCLUDED.focus_score),
                         xp_earned     = productivity_scores.xp_earned + EXCLUDED.xp_earned,
                         total_xp      = productivity_scores.total_xp + EXCLUDED.total_xp`,
                    [userIds[email], ds, dur, focus, xp, xp, Math.max(1,14-d), Math.max(1,Math.floor(xp/500))]
                );
            }
        }
        console.log("  Sessions & productivity scores seeded.");

        // Payments
        await client.query(`
            INSERT INTO payments(user_id,amount,payment_method,type,status) VALUES
                ($1,499,'gcash','membership','completed'),
                ($2,150,'gcash','booking',   'completed'),
                ($3,999,'card', 'membership','completed'),
                ($4,600,'cash', 'booking',   'pending'),
                ($5,675,'gcash','booking',   'completed')
        `, [
            userIds["ana@example.com"],    userIds["carlos@example.com"],
            userIds["sofia@example.com"],  userIds["james@example.com"],
            userIds["miguel@example.com"]
        ]);
        console.log("  Payments seeded.");

        await client.query("COMMIT");
        console.log("\nDatabase seeded successfully!");
    } catch(err) {
        await client.query("ROLLBACK");
        console.error("Seed failed:", err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}
seed();
