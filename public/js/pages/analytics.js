async function renderAnalyticsPage(app) {
    app.innerHTML = renderAppLayout(
        Helpers.renderSkeleton('dashboard'),
        'Productivity Analytics', 'Track your study patterns and performance'
    );

    let weekly = [], monthly = [], summary = {}, history = [];
    try {
        [weekly, monthly, summary, history] = await Promise.all([
            API.get('/analytics/weekly').catch(() => []),
            API.get('/analytics/monthly').catch(() => []),
            API.get('/analytics/summary').catch(() => ({})),
            API.get('/sessions/history?limit=10').catch(() => []),
        ]);
    } catch(e) {}

    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

    // Build weekly bar chart
    const dayMap = {};
    for (const d of weekly) {
        const dow  = new Date(d.score_date).getDay();
        const name = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow];
        dayMap[name] = { mins: parseFloat(d.total_minutes||0), focus: parseInt(d.focus_score||0) };
    }
    const weeklyMins  = days.map(d => dayMap[d]?.mins  || 0);
    const weeklyFocus = days.map(d => dayMap[d]?.focus || 0);
    const maxMins  = Math.max(...weeklyMins, 1);
    const weeklyBars  = weeklyMins.map(v => Math.round((v/maxMins)*100));
    const focusBars   = weeklyFocus.map(v => Math.round(v));

    // Monthly chart (last 30 days, group by week)
    const monthlyBars = monthly.slice(-30).map(d => Math.round(parseFloat(d.total_minutes||0)/60*10)/10);
    const monthlyMax  = Math.max(...monthlyBars, 1);
    const monthlyNorm = monthlyBars.map(v => Math.round((v/monthlyMax)*100));

    const totalHours     = Math.floor(parseFloat(summary.total_study_minutes||0)/60);
    const avgFocus       = Math.round(parseFloat(summary.avg_focus_score||0));
    const bestStreak     = parseInt(summary.best_streak||0);
    const totalXp        = parseInt(summary.total_xp||0);
    const activeDays     = parseInt(summary.active_days||0);
    const weeklyHours    = weeklyMins.reduce((a,b)=>a+b,0)/60;
    const dayNames       = days;

    // Productivity by day
    const prodByDay = days.map(d => ({
        day: d,
        val: dayMap[d] ? Math.round((dayMap[d].mins/maxMins)*100) : 0
    }));

    // Best study day this week
    const bestDayIdx = weeklyMins.indexOf(Math.max(...weeklyMins));
    const bestDay    = weeklyMins[bestDayIdx] > 0 ? days[bestDayIdx] : '—';

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">This Week</span>
                    <span class="dashboard-stat-card__icon">⏱</span>
                </div>
                <div class="dashboard-stat-card__value">${weeklyHours.toFixed(1)}h</div>
                <div class="dashboard-stat-card__change">${activeDays} active days total</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Avg Focus</span>
                    <span class="dashboard-stat-card__icon">🎯</span>
                </div>
                <div class="dashboard-stat-card__value">${avgFocus}%</div>
                <div class="dashboard-stat-card__change">Lifetime average</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total Study</span>
                    <span class="dashboard-stat-card__icon">📊</span>
                </div>
                <div class="dashboard-stat-card__value">${totalHours}h</div>
                <div class="dashboard-stat-card__change">All time</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Best Day</span>
                    <span class="dashboard-stat-card__icon">⭐</span>
                </div>
                <div class="dashboard-stat-card__value">${bestDay}</div>
                <div class="dashboard-stat-card__change">${weeklyMins[bestDayIdx]>0?Math.round(weeklyMins[bestDayIdx]/60*10)/10+'h':'No data'}</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Study Hours — This Week</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${Helpers.renderBarChart(weeklyBars, days)}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Focus Score — This Week</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${Helpers.renderBarChart(focusBars, days, { height:'180px', color:'var(--color-primary)' })}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Session History</h3>
                    </div>
                    <div class="dashboard-card__body" style="padding:0">
                        <table class="data-table">
                            <thead>
                                <tr><th>Date</th><th>Type</th><th>Duration</th><th>Focus</th></tr>
                            </thead>
                            <tbody>
                                ${history.length === 0
                                    ? `<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);padding:var(--space-4)">No sessions yet. Start studying!</td></tr>`
                                    : history.map(s => {
                                        const d = new Date(s.started_at);
                                        const dur = s.duration_minutes ? `${Math.floor(s.duration_minutes/60)}h ${Math.round(s.duration_minutes%60)}m` : '—';
                                        return `<tr>
                                            <td>${d.toLocaleDateString('en-PH',{month:'short',day:'numeric'})}</td>
                                            <td><span class="badge badge--${s.session_type==='pomodoro'?'accent':'primary'}">${s.session_type||'—'}</span></td>
                                            <td>${dur}</td>
                                            <td>${s.focus_score||'—'}</td>
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
                        <h3 class="dashboard-card__title">Study Insights</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
                            <div style="padding:var(--space-4);background:var(--color-bg);border-radius:var(--radius-md);border-left:3px solid var(--color-accent)">
                                <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold);margin-bottom:var(--space-2)">Peak Performance</div>
                                <div style="font-size:var(--text-sm);color:var(--color-text-secondary)">${bestDay !== '—' ? `Your best day this week is <b>${bestDay}</b>. Try to maintain this momentum!` : 'Start tracking sessions to get personalized insights.'}</div>
                            </div>
                            <div style="padding:var(--space-4);background:var(--color-bg);border-radius:var(--radius-md);border-left:3px solid var(--color-primary)">
                                <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold);margin-bottom:var(--space-2)">Focus Trend</div>
                                <div style="font-size:var(--text-sm);color:var(--color-text-secondary)">${avgFocus >= 85 ? 'Excellent focus! You are consistently above 85% — keep using Deep Work mode.' : avgFocus > 0 ? `Your average focus is ${avgFocus}%. Try the Pomodoro technique to boost it above 85%.` : 'Complete study sessions to track your focus score.'}</div>
                            </div>
                            <div style="padding:var(--space-4);background:var(--color-bg);border-radius:var(--radius-md);border-left:3px solid var(--color-warning)">
                                <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold);margin-bottom:var(--space-2)">Streak Status</div>
                                <div style="font-size:var(--text-sm);color:var(--color-text-secondary)">${bestStreak >= 7 ? `Best streak: ${bestStreak} days. Users with 7+ day streaks score 40% higher on focus.` : `Best streak so far: ${bestStreak} days. Aim for 7 consecutive days to unlock Streak Master!`}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Productivity by Day</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${prodByDay.map(({ day, val }) => `
                            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
                                <span style="width:30px;font-size:var(--text-xs);color:var(--color-text-muted)">${day}</span>
                                <div class="progress" style="flex:1"><div class="progress__bar" style="width:${val}%"></div></div>
                                <span style="width:30px;text-align:right;font-size:var(--text-xs);font-weight:var(--weight-medium)">${val}%</span>
                            </div>`).join('')}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Lifetime Summary</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                            <div class="stat"><div class="stat__value">${totalHours}h</div><div class="stat__label">Total Study</div></div>
                            <div class="stat"><div class="stat__value">${activeDays}</div><div class="stat__label">Active Days</div></div>
                            <div class="stat"><div class="stat__value">${avgFocus}</div><div class="stat__label">Avg Focus</div></div>
                            <div class="stat"><div class="stat__value">${totalXp.toLocaleString()}</div><div class="stat__label">XP Earned</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Productivity Analytics', 'Track your study patterns and performance');
}
