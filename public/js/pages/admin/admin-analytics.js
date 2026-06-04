async function renderAdminAnalyticsPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading analytics...</div>`,
        'Platform Analytics',
        'Deep insights into platform performance and user engagement'
    );

    let data = {
        userRoles: [], monthlySessions: [], weeklySessions: [],
        avgFocus: 0, totalXP: 0, totalUsers: 0, spaces: [],
        achievementsEarned: 0, achievementsXP: 0
    };

    try {
        data = await API.get('/admin/analytics');
    } catch(e) {
        Helpers.showToast('Error', 'Failed to load analytics', 'error');
    }

    const totalRoleUsers = data.userRoles.reduce((s, r) => s + parseInt(r.count), 0) || 1;

    // Monthly sessions chart — last 12 months in calendar order
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last12Months.push(monthNames[d.getMonth()]);
    }
    const monthMap = {};
    for (const m of data.monthlySessions) monthMap[m.month] = m.count;
    const monthlyValues = last12Months.map(m => monthMap[m] || 0);
    const maxMonthly = Math.max(...monthlyValues, 1);
    const normalizedMonthly = monthlyValues.map(v => Math.round((v / maxMonthly) * 100));

    // Weekly sessions chart — Mon to Sun
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const dayMap = {};
    for (const d of data.weeklySessions) dayMap[d.day.trim()] = d.count;
    const weeklyValues = days.map(d => dayMap[d] || 0);
    const maxWeekly = Math.max(...weeklyValues, 1);
    const normalizedWeekly = weeklyValues.map(v => Math.round((v / maxWeekly) * 100));

    // Space utilization
    const totalBookings = data.spaces.reduce((s, sp) => s + sp.booking_count, 0) || 1;

    const roleColors = {
        admin: 'var(--color-error)', staff: 'var(--color-warm)',
        member: 'var(--color-accent)', student: 'var(--color-primary)'
    };
    const roleLabels = { admin: 'Admin', staff: 'Staff', member: 'Members', student: 'Students' };

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total Users</span>
                    <span class="dashboard-stat-card__icon">👥</span>
                </div>
                <div class="dashboard-stat-card__value">${totalRoleUsers.toLocaleString()}</div>
                <div class="dashboard-stat-card__change">${((data.userRoles.find(r => r.role === 'student') || {}).count || 0) * 1 + ((data.userRoles.find(r => r.role === 'member') || {}).count || 0) * 1} active learners</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Avg Focus Score</span>
                    <span class="dashboard-stat-card__icon">🎯</span>
                </div>
                <div class="dashboard-stat-card__value">${data.avgFocus}</div>
                <div class="dashboard-stat-card__change">Platform-wide</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total XP Earned</span>
                    <span class="dashboard-stat-card__icon">⭐</span>
                </div>
                <div class="dashboard-stat-card__value">${Number(data.totalXP).toLocaleString()}</div>
                <div class="dashboard-stat-card__change">Across all users</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Achievements</span>
                    <span class="dashboard-stat-card__icon">🏆</span>
                </div>
                <div class="dashboard-stat-card__value">${data.achievementsEarned}</div>
                <div class="dashboard-stat-card__change">Badges earned</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Study Sessions — Last 12 Months</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${Helpers.renderBarChart(normalizedMonthly, last12Months, { height: '260px' })}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Sessions This Week</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${Helpers.renderBarChart(normalizedWeekly, days, { height: '200px', color: 'var(--color-primary)' })}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Space Utilization</h3>
                    </div>
                    <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Space</th>
                                    <th>Type</th>
                                    <th>Bookings</th>
                                    <th>Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.spaces.length === 0
                                    ? `<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);padding:var(--space-6)">No booking data yet</td></tr>`
                                    : data.spaces.map(s => {
                                        const pct = Math.round((s.booking_count / totalBookings) * 100);
                                        return `
                                        <tr>
                                            <td style="font-weight:var(--weight-medium)">${s.name}</td>
                                            <td><span class="badge badge--primary">${s.type.replace('_', ' ')}</span></td>
                                            <td>${s.booking_count}</td>
                                            <td>
                                                <div style="display:flex;align-items:center;gap:var(--space-2)">
                                                    <div class="progress" style="width:80px"><div class="progress__bar" style="width:${pct}%"></div></div>
                                                    <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${pct}%</span>
                                                </div>
                                            </td>
                                        </tr>`;
                                    }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">User Breakdown</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${data.userRoles.map(r => {
                            const pct = Math.round((parseInt(r.count) / totalRoleUsers) * 100);
                            const color = roleColors[r.role] || 'var(--color-accent)';
                            const label = roleLabels[r.role] || r.role;
                            return `
                            <div style="margin-bottom:var(--space-4)">
                                <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
                                    <span style="font-size:var(--text-sm)">${label}</span>
                                    <span style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${parseInt(r.count).toLocaleString()} (${pct}%)</span>
                                </div>
                                <div class="progress"><div class="progress__bar" style="width:${pct}%;background:${color}"></div></div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Popular Spaces</h3>
                    </div>
                    <div class="dashboard-card__body" style="padding:0">
                        ${data.spaces.slice(0, 4).map((s, i) => `
                            <div style="padding:var(--space-3) var(--space-5);${i < Math.min(3, data.spaces.length - 1) ? 'border-bottom:1px solid var(--color-border-light)' : ''};display:flex;align-items:center;justify-content:space-between">
                                <div>
                                    <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${s.name}</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${s.booking_count} bookings total</div>
                                </div>
                                <span class="badge badge--accent">${Math.round((s.booking_count / totalBookings) * 100)}%</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Gamification Stats</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-xl)">${data.achievementsEarned}</div><div class="stat__label">Achievements Earned</div></div>
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-xl)">${data.totalUsers}</div><div class="stat__label">Total Users</div></div>
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-xl)">${data.avgFocus}</div><div class="stat__label">Avg Focus Score</div></div>
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-xl)">${Number(data.totalXP).toLocaleString()}</div><div class="stat__label">Total XP</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Platform Analytics', 'Deep insights into platform performance and user engagement');
}
