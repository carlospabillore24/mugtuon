async function renderAdminDashboardPage(app) {
    app.innerHTML = renderAppLayout(
        Helpers.renderSkeleton('dashboard'),
        'Admin Dashboard', 'Platform overview and key metrics'
    );

    let stats = { users:{total:0,new_monthly:0}, bookings:{total:0,today:0}, revenue:{total:0,monthly:0}, activeSessions:0 };
    let leaderboard = [];
    let recentBookings = [];

    try {
        [stats, leaderboard, recentBookings] = await Promise.all([
            API.get('/admin/stats').catch(() => stats),
            API.get('/users/leaderboard?period=alltime').then(d => d.slice(0,5)).catch(() => []),
            API.get('/admin/bookings?limit=8').then(d => d.bookings || []).catch(() => []),
        ]);
    } catch(e) {}

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total Revenue</span>
                    <span class="dashboard-stat-card__icon">💰</span>
                </div>
                <div class="dashboard-stat-card__value">${Helpers.formatCurrency(stats.revenue?.total||0)}</div>
                <div class="dashboard-stat-card__change">${Helpers.formatCurrency(stats.revenue?.monthly||0)} this month</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total Users</span>
                    <span class="dashboard-stat-card__icon">👥</span>
                </div>
                <div class="dashboard-stat-card__value">${(stats.users?.total||0).toLocaleString()}</div>
                <div class="dashboard-stat-card__change">+${stats.users?.new_monthly||0} this month</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Today's Bookings</span>
                    <span class="dashboard-stat-card__icon">📅</span>
                </div>
                <div class="dashboard-stat-card__value">${stats.bookings?.today||0}</div>
                <div class="dashboard-stat-card__change">${stats.bookings?.total||0} total</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Active Now</span>
                    <span class="dashboard-stat-card__icon">🟢</span>
                </div>
                <div class="dashboard-stat-card__value">${stats.activeSessions||0}</div>
                <div class="dashboard-stat-card__change">Live study sessions</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Recent Bookings</h3>
                        <a href="/admin/bookings" data-link class="btn btn--ghost btn--sm">View All</a>
                    </div>
                    <div class="dashboard-card__body" style="padding:0">
                        ${recentBookings.length === 0
                            ? '<div style="padding:var(--space-4);text-align:center;color:var(--color-text-muted)">No bookings yet.</div>'
                            : recentBookings.map(b => `
                            <div style="padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border-light);display:flex;align-items:center;gap:var(--space-3)">
                                <span style="font-size:var(--text-base)">📅</span>
                                <div style="flex:1;min-width:0">
                                    <div style="font-size:var(--text-sm)">${Helpers.esc(b.space_name||'Space')} — ${Helpers.esc(b.first_name)} ${Helpers.esc(b.last_name)}</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${b.booking_date?new Date(b.booking_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}):''}, ${b.start_time}–${b.end_time}</div>
                                </div>
                                <span class="badge badge--${b.status==='confirmed'?'success':b.status==='checked_in'?'accent':'primary'}">${b.status}</span>
                            </div>`).join('')}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Quick Stats</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:flex;flex-direction:column;gap:var(--space-5)">
                            <div>
                                <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
                                    <span style="font-size:var(--text-sm)">Monthly Revenue</span>
                                    <span style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">${Helpers.formatCurrency(stats.revenue?.monthly||0)}</span>
                                </div>
                                <div class="progress"><div class="progress__bar" style="width:${Math.min(100,Math.round(((stats.revenue?.monthly||0)/(stats.revenue?.total||1))*100))}%"></div></div>
                            </div>
                            <div>
                                <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
                                    <span style="font-size:var(--text-sm)">New Members (30d)</span>
                                    <span style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">${stats.users?.new_monthly||0}</span>
                                </div>
                                <div class="progress"><div class="progress__bar progress__bar--primary" style="width:${Math.min(100,Math.round(((stats.users?.new_monthly||0)/(stats.users?.total||1))*100))}%"></div></div>
                            </div>
                            <div>
                                <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
                                    <span style="font-size:var(--text-sm)">Bookings Today</span>
                                    <span style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">${stats.bookings?.today||0}</span>
                                </div>
                                <div class="progress"><div class="progress__bar progress__bar--warm" style="width:${Math.min(100,Math.round(((stats.bookings?.today||0)/(stats.bookings?.total||1))*100))}%"></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Top Users</h3>
                        <a href="/admin/users" data-link class="btn btn--ghost btn--sm">View All</a>
                    </div>
                    <div class="dashboard-card__body" style="padding:0">
                        <div class="leaderboard-list">
                            ${leaderboard.length === 0
                                ? '<div style="padding:var(--space-4);text-align:center;color:var(--color-text-muted)">No data yet.</div>'
                                : leaderboard.map((u,i) => `
                                <div class="leaderboard-item">
                                    <div class="leaderboard-item__rank leaderboard-item__rank--${i<3?i+1:''}">${i+1}</div>
                                    <div class="avatar avatar--sm">${Helpers.getInitials(u.first_name, u.last_name)}</div>
                                    <div class="leaderboard-item__info">
                                        <div class="leaderboard-item__name">${Helpers.esc(u.first_name)} ${Helpers.esc(u.last_name)}</div>
                                        <div class="leaderboard-item__meta">${Helpers.esc(u.university||'—')}</div>
                                    </div>
                                    <div class="leaderboard-item__score">${(u.xp||0).toLocaleString()} XP</div>
                                </div>`).join('')}
                        </div>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Revenue Summary</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                            <div class="stat"><div class="stat__value">${Helpers.formatCurrency(stats.revenue?.total||0)}</div><div class="stat__label">All Time</div></div>
                            <div class="stat"><div class="stat__value">${Helpers.formatCurrency(stats.revenue?.monthly||0)}</div><div class="stat__label">This Month</div></div>
                            <div class="stat"><div class="stat__value">${stats.bookings?.total||0}</div><div class="stat__label">Total Bookings</div></div>
                            <div class="stat"><div class="stat__value">${stats.users?.total||0}</div><div class="stat__label">Total Users</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Admin Dashboard', 'Platform overview and key metrics');
}
