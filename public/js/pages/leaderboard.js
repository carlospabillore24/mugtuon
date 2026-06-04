async function renderLeaderboardPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading leaderboard...</div>`,
        'Leaderboard', 'See how you rank against the community'
    );
    await loadLeaderboard('alltime', app);
}

async function loadLeaderboard(period, app) {
    let data = [];
    let community = { totalUsers: 0, totalStudyHours: 0, activeNow: 0, bookingsToday: 0 };
    const currentUser = Store.get('user');

    try {
        [data, community] = await Promise.all([
            API.get(`/users/leaderboard?period=${period}`),
            API.get('/analytics/community').catch(() => community)
        ]);
    } catch(e) { /* use defaults */ }

    const myRank   = data.findIndex(u => u.id === currentUser?.id) + 1;
    const topThree = data.slice(0, 3);
    const rest     = data.slice(3);

    const content = `
        <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6)" id="periodBtns">
            <button class="btn btn--${period==='weekly'?'accent':'outline'} btn--sm" onclick="switchPeriod('weekly')">This Week</button>
            <button class="btn btn--${period==='monthly'?'accent':'outline'} btn--sm" onclick="switchPeriod('monthly')">This Month</button>
            <button class="btn btn--${period==='alltime'?'accent':'outline'} btn--sm" onclick="switchPeriod('alltime')">All Time</button>
        </div>

        ${topThree.length > 0 ? `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-6);margin-bottom:var(--space-8)">
            ${topThree.map((u, i) => `
                <div class="card card--elevated" style="text-align:center;padding:var(--space-8);${i===0?'border:2px solid #ffd700':''}">
                    <div style="font-size:${i===0?'40px':'32px'};margin-bottom:var(--space-3)">${['🥇','🥈','🥉'][i]}</div>
                    ${u.avatar_url
                        ? `<img src="${u.avatar_url}" alt="${Helpers.esc(u.first_name)}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;margin:0 auto var(--space-3)">`
                        : `<div class="avatar avatar--lg" style="margin:0 auto var(--space-3)">${Helpers.getInitials(u.first_name, u.last_name)}</div>`}
                    <h3 style="font-size:var(--text-base);margin-bottom:var(--space-1)">${Helpers.esc(u.first_name)} ${Helpers.esc(u.last_name)}</h3>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-4)">${u.university || '—'}</div>
                    <div style="font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-accent);margin-bottom:var(--space-2)">${(u.xp||0).toLocaleString()} XP</div>
                    <div style="display:flex;justify-content:center;gap:var(--space-4);font-size:var(--text-xs);color:var(--color-text-muted)">
                        <span>${Math.floor((u.total_minutes||0)/60)}h studied</span>
                        <span>🔥 ${u.streak_days||0}d streak</span>
                    </div>
                </div>`).join('')}
        </div>` : ''}

        <div class="dashboard-card">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">Full Rankings</h3>
                <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Top ${data.length} learners</span>
            </div>
            <div class="dashboard-card__body" style="padding:0">
                <div class="leaderboard-list">
                    ${data.map((u, i) => `
                        <div class="leaderboard-item ${u.id === currentUser?.id ? 'leaderboard-item--me' : ''}">
                            <div class="leaderboard-item__rank leaderboard-item__rank--${i<3?i+1:''}">${i+1}</div>
                            ${u.avatar_url
                                ? `<img src="${u.avatar_url}" alt="${Helpers.esc(u.first_name)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">`
                                : `<div class="avatar avatar--sm">${Helpers.getInitials(u.first_name, u.last_name)}</div>`}
                            <div class="leaderboard-item__info">
                                <div class="leaderboard-item__name">${Helpers.esc(u.first_name)} ${Helpers.esc(u.last_name)}${u.id===currentUser?.id?' <span class="badge badge--accent" style="font-size:10px">You</span>':''}</div>
                                <div class="leaderboard-item__meta">${u.university||'—'} &middot; ${Math.floor((u.total_minutes||0)/60)}h &middot; 🔥 ${u.streak_days||0}d</div>
                            </div>
                            <div class="leaderboard-item__score">${(u.xp||0).toLocaleString()} XP</div>
                        </div>`).join('')}
                    ${data.length === 0 ? '<div style="padding:var(--space-6);text-align:center;color:var(--color-text-muted)">No data yet.</div>' : ''}
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);margin-top:var(--space-6)">
            <div class="dashboard-card">
                <div class="dashboard-card__header">
                    <h3 class="dashboard-card__title">Your Position</h3>
                </div>
                <div class="dashboard-card__body" style="text-align:center">
                    ${myRank > 0 ? `
                        <div style="font-size:var(--text-5xl);font-weight:var(--weight-bold);color:var(--color-primary);margin-bottom:var(--space-2)">#${myRank}</div>
                        <div style="color:var(--color-text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4)">
                            ${myRank <= 3 ? 'Top 3! You are crushing it!' : myRank <= 10 ? 'Top 10 — keep going!' : `out of ${data.length} members`}
                        </div>
                        <div class="progress" style="margin-bottom:var(--space-2)"><div class="progress__bar" style="width:${Math.round((1 - myRank/data.length)*100)}%"></div></div>
                        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">
                            ${myRank > 1 && data[myRank-2] ? `${(data[myRank-2].xp - (currentUser?.xp||0)).toLocaleString()} XP to reach #${myRank-1}` : 'You are #1!'}
                        </div>
                    ` : `<div style="color:var(--color-text-muted)">Keep studying to appear on the leaderboard!</div>`}
                </div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-card__header">
                    <h3 class="dashboard-card__title">Community Stats</h3>
                </div>
                <div class="dashboard-card__body">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                        <div class="stat"><div class="stat__value">${community.totalUsers||0}</div><div class="stat__label">Members</div></div>
                        <div class="stat"><div class="stat__value">${community.activeNow||0}</div><div class="stat__label">Studying Now</div></div>
                        <div class="stat"><div class="stat__value">${(community.totalStudyHours||0).toLocaleString()}</div><div class="stat__label">Total Hours</div></div>
                        <div class="stat"><div class="stat__value">${community.bookingsToday||0}</div><div class="stat__label">Bookings Today</div></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Leaderboard', 'See how you rank against the community');
    // Store current period for switchPeriod
    window._currentLbPeriod = period;
}

function switchPeriod(period) {
    const app = document.getElementById('app') || document.querySelector('[data-page]');
    loadLeaderboard(period, app || document.body);
}
