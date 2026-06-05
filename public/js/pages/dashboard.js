async function renderDashboardPage(app) {
    const user = Store.get('user');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Render skeleton first
    const skeleton = Helpers.renderSkeleton('dashboard');
    app.innerHTML = renderAppLayout(skeleton, `Welcome back, ${user.first_name}`, "Here's your productivity overview");

    // Fetch real data
    let stats = { xp: user.xp || 0, streak_days: user.streak_days || 0, total_sessions: 0, total_minutes: 0 };
    let bookings = [];
    let challenges = [];
    let weekly = [];

    try {
        [stats, bookings, challenges, weekly] = await Promise.all([
            API.get('/users/stats').catch(() => stats),
            API.get('/bookings').catch(() => []),
            API.get('/achievements/challenges').catch(() => []),
            API.get('/analytics/weekly').catch(() => []),
        ]);
        // Trigger day-before booking reminder emails (non-blocking, silent)
        API.get('/bookings/upcoming-reminders').catch(() => {});
    } catch(e) { /* use defaults */ }

    const level = Helpers.getLevel(stats.xp || 0);
    const totalMinutes = Math.round(stats.total_minutes || 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const studyDisplay = Helpers.formatDuration(totalMinutes);

    // ── Membership card (pre-computed to avoid nested backtick issues) ──────
    const planName  = Helpers.esc(stats.plan_name || 'Explorer');
    const planPrice = stats.plan_price || 0;
    const planBadge = stats.plan_badge ? Helpers.esc(stats.plan_badge) : null;
    const expiresAt = stats.membership_expires_at;
    const isFree    = planPrice === 0;
    const isPro     = planName === 'Pro';
    const planIcon  = isFree ? '✨' : isPro ? '👑' : '🎓';
    const planColor = isFree ? 'var(--color-text-secondary)' : isPro ? '#b8860b' : 'var(--color-accent)';
    const expiryLine = isFree
        ? '<span style="font-size:var(--text-xs);color:var(--color-text-secondary)">Free forever</span>'
        : expiresAt
            ? '<span style="font-size:var(--text-xs);color:var(--color-text-secondary)">Renews ' + new Date(expiresAt).toLocaleDateString('en-PH', {month:'short',day:'numeric',year:'numeric'}) + '</span>'
            : '';
    const planCTA = isFree
        ? '<a href="/pricing" data-link class="btn btn--accent btn--sm btn--full" style="margin-top:var(--space-4)">Upgrade to Scholar</a>'
        : '<a href="/subscription" data-link class="btn btn--outline btn--sm btn--full" style="margin-top:var(--space-4)">Manage Subscription</a>';
    const priceBadge = !isFree
        ? '<div style="margin-left:auto;text-align:right"><div style="font-weight:700;font-size:var(--text-base);color:var(--color-accent)">&#8369;' + Number(planPrice).toLocaleString() + '</div><div style="font-size:var(--text-xs);color:var(--color-text-secondary)">/month</div></div>'
        : '';
    const membershipCard = `
    <div class="dashboard-card">
        <div class="dashboard-card__header">
            <h3 class="dashboard-card__title">Membership Plan</h3>
            ${planBadge ? '<span class="badge badge--accent">' + planBadge + '</span>' : ''}
        </div>
        <div class="dashboard-card__body">
            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
                <div style="width:44px;height:44px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${planIcon}</div>
                <div>
                    <div style="font-weight:700;font-size:var(--text-lg);color:${planColor}">${planName}</div>
                    ${expiryLine}
                </div>
                ${priceBadge}
            </div>
            ${planCTA}
        </div>
    </div>`;
    const today = new Date().toISOString().split('T')[0];
    const upcomingBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed' && b.booking_date >= today).slice(0, 3);
    const completedChallenges = challenges.filter(c => c.completed).length;

    // Build weekly chart from API data
    const dayMap = {};
    for (const d of weekly) {
        const dow = new Date(d.score_date).getDay();
        const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow];
        dayMap[dayName] = Math.round((d.total_minutes || 0) / 60 * 10) / 10;
    }
    const weeklyBars = days.map(d => dayMap[d] || 0);
    const maxBar = Math.max(...weeklyBars, 1);
    const normalizedBars = weeklyBars.map(v => Math.round((v / maxBar) * 100));

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card" id="xp-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total XP</span>
                    <span class="dashboard-stat-card__icon">⭐</span>
                </div>
                <div class="dashboard-stat-card__value">${(stats.xp || 0).toLocaleString()}</div>
                <div class="dashboard-stat-card__change">Level ${level}</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Study Streak</span>
                    <span class="dashboard-stat-card__icon">🔥</span>
                </div>
                <div class="dashboard-stat-card__value">${stats.streak_days || 0} ${(stats.streak_days || 0) === 1 ? 'day' : 'days'}</div>
                <div class="dashboard-stat-card__change">Keep it up!</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total Study</span>
                    <span class="dashboard-stat-card__icon">⏱</span>
                </div>
                <div class="dashboard-stat-card__value">${studyDisplay}</div>
                <div class="dashboard-stat-card__change">${stats.total_sessions || 0} sessions</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Badges</span>
                    <span class="dashboard-stat-card__icon">🏆</span>
                </div>
                <div class="dashboard-stat-card__value">${stats.badge_count || 0}</div>
                <div class="dashboard-stat-card__change">Achievements</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Weekly Activity</h3>
                        <span class="badge badge--accent">This Week</span>
                    </div>
                    <div class="dashboard-card__body">
                        ${Helpers.renderBarChart(normalizedBars, days)}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Upcoming Bookings</h3>
                        <a href="/bookings" data-link class="btn btn--ghost btn--sm">View All</a>
                    </div>
                    <div class="dashboard-card__body" style="padding:0">
                        ${upcomingBookings.length === 0 ? `
                            <div style="padding:var(--space-6);text-align:center;color:var(--color-text-muted);font-size:var(--text-sm)">
                                No upcoming bookings.<br>
                                <a href="/bookings" data-link class="btn btn--outline btn--sm" style="margin-top:var(--space-3);display:inline-block">Book a Space</a>
                            </div>
                        ` : upcomingBookings.map(b => `
                            <div style="padding:var(--space-4) var(--space-6);border-bottom:1px solid var(--color-border-light);display:flex;align-items:center;justify-content:space-between">
                                <div style="display:flex;align-items:center;gap:var(--space-4)">
                                    <div style="width:40px;height:40px;border-radius:var(--radius-md);background:rgba(0,66,57,0.08);display:flex;align-items:center;justify-content:center">📅</div>
                                    <div>
                                        <div style="font-weight:var(--weight-medium);font-size:var(--text-sm)">${b.space_name || 'Space'}</div>
                                        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : ''}, ${b.start_time} – ${b.end_time}</div>
                                    </div>
                                </div>
                                <span class="badge badge--${b.status === 'confirmed' ? 'success' : b.status === 'checked_in' ? 'accent' : 'primary'}">${b.status}</span>
                            </div>
                        `).join('')}
                        ${upcomingBookings.length > 0 ? `<div style="padding:var(--space-3) var(--space-6);text-align:center"><a href="/bookings" data-link class="btn btn--outline btn--sm">Book a Space</a></div>` : ''}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Daily Challenges</h3>
                        <span class="badge badge--${completedChallenges === challenges.length && challenges.length > 0 ? 'success' : 'warning'}">${completedChallenges}/${challenges.length} Complete</span>
                    </div>
                    <div class="dashboard-card__body" style="padding:var(--space-4) var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)">
                        ${challenges.length === 0 ? `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">No challenges today.</div>` :
                          challenges.map(c => {
                            const pct = Math.min(100, Math.round((c.progress / c.target_value) * 100));
                            const done = c.completed;
                            return `
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
                                    <span style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${done ? '✅' : '⏳'} ${c.title}</span>
                                    <span style="font-size:var(--text-xs);color:var(--color-${done ? 'success' : 'text-muted'})">+${c.xp_reward} XP</span>
                                </div>
                                <div class="progress"><div class="progress__bar${done ? '' : ' progress__bar--warm'}" style="width:${done ? 100 : pct}%"></div></div>
                            </div>`;
                          }).join('')}
                    </div>
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                ${membershipCard}

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Focus Timer</h3>
                    </div>
                    <div class="dashboard-card__body" style="padding:0">
                        ${Timer.renderWidget()}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Progress</h3>
                        <span style="font-size:var(--text-xs);color:var(--color-text-muted)">Level ${level}</span>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="margin-bottom:var(--space-3)">
                            <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-2)">
                                <span>${(stats.xp || 0).toLocaleString()} XP</span>
                                <span>${(level * 1000).toLocaleString()} XP</span>
                            </div>
                            <div class="progress"><div class="progress__bar" style="width:${Helpers.getLevelProgress(stats.xp || 0)}%"></div></div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-top:var(--space-4)">
                            <div class="stat"><div class="stat__value">${studyDisplay}</div><div class="stat__label">Study Time</div></div>
                            <div class="stat"><div class="stat__value">${stats.streak_days || 0}</div><div class="stat__label">Day Streak</div></div>
                            <div class="stat"><div class="stat__value">${stats.total_sessions || 0}</div><div class="stat__label">Sessions</div></div>
                            <div class="stat"><div class="stat__value">${stats.total_bookings || 0}</div><div class="stat__label">Bookings</div></div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Study Insights</h3>
                        <span class="badge badge--accent">Live</span>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
                            <div style="padding:var(--space-3);background:var(--color-bg);border-radius:var(--radius-md)">
                                <div style="font-size:var(--text-sm);font-weight:var(--weight-medium);margin-bottom:var(--space-1)">🧠 Keep Going!</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">You've studied ${studyDisplay} total. ${totalHours < 100 ? `${100 - totalHours} more hours to unlock the 100 Hours badge!` : `You've earned the 100 Hours badge!`}</div>
                            </div>
                            <div style="padding:var(--space-3);background:var(--color-bg);border-radius:var(--radius-md)">
                                <div style="font-size:var(--text-sm);font-weight:var(--weight-medium);margin-bottom:var(--space-1)">📈 Streak Tip</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${stats.streak_days >= 7 ? `Amazing ${stats.streak_days}-day streak! You're in the top tier of learners.` : `You're on a ${stats.streak_days || 0}-day streak. Aim for 7 days to unlock Streak Master!`}</div>
                            </div>
                            <div style="padding:var(--space-3);background:var(--color-bg);border-radius:var(--radius-md)">
                                <div style="font-size:var(--text-sm);font-weight:var(--weight-medium);margin-bottom:var(--space-1)">💡 Next Goal</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Next level at ${(level * 1000).toLocaleString()} XP — you need ${Math.max(0, level * 1000 - (stats.xp || 0))} more XP. Complete daily challenges to level up faster!</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, `Welcome back, ${user.first_name}`, "Here's your productivity overview");
    // Restore timer state — resume() keeps it running across page navigations
    if (typeof Timer !== 'undefined') Timer.resume();

    // ── XP change animation ─────────────────────────────────────────────
    const lastXP = parseInt(sessionStorage.getItem('mugtuon_last_xp') || '0');
    const currentXP = stats.xp || 0;
    if (lastXP > 0 && currentXP > lastXP) {
        const card = document.getElementById('xp-card');
        if (card) card.classList.add('xp-pulse');
    }
    sessionStorage.setItem('mugtuon_last_xp', String(currentXP));

    // ── Onboarding modal for new users ───────────────────────────────────
    if (!localStorage.getItem('mugtuon_onboarded') && stats.total_sessions === 0 && (stats.total_bookings || 0) === 0) {
        const ob = document.createElement('div');
        ob.id = 'onboarding-modal';
        ob.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1200;display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
        ob.innerHTML = `
            <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:480px;box-shadow:var(--shadow-xl);overflow:hidden" onclick="event.stopPropagation()">
                <div style="background:linear-gradient(135deg,var(--color-primary),var(--color-accent));padding:var(--space-10);text-align:center;color:white">
                    <img src="images/logo-icon-dark.png" alt="MugTuon" style="width:72px;height:72px;border-radius:50%;margin-bottom:var(--space-4)">
                    <h2 style="font-size:var(--text-2xl);margin-bottom:var(--space-2)">Welcome to MugTuon!</h2>
                    <p style="opacity:.85;font-size:var(--text-sm)">Your productivity journey starts here.</p>
                </div>
                <div style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-5)">
                    <div style="display:flex;align-items:center;gap:var(--space-4)">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-accent);color:white;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">1</div>
                        <div><div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Start a Focus Timer</div><div style="font-size:var(--text-xs);color:var(--color-text-muted)">Use Pomodoro or Deep Work mode to earn XP</div></div>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--space-4)">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-accent);color:white;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">2</div>
                        <div><div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Book a Study Space</div><div style="font-size:var(--text-xs);color:var(--color-text-muted)">Reserve your spot and check in with QR</div></div>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--space-4)">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-accent);color:white;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">3</div>
                        <div><div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Climb the Leaderboard</div><div style="font-size:var(--text-xs);color:var(--color-text-muted)">Earn XP, unlock badges, and build your streak</div></div>
                    </div>
                    <button class="btn btn--accent btn--lg btn--full" onclick="localStorage.setItem('mugtuon_onboarded','1');document.getElementById('onboarding-modal').remove()">Let's Go!</button>
                </div>
            </div>`;
        ob.onclick = () => { localStorage.setItem('mugtuon_onboarded', '1'); ob.remove(); };
        document.body.appendChild(ob);
    }
}
