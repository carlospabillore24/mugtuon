async function renderAchievementsPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading achievements...</div>`,
        'Achievements & Badges', 'Track your progress and unlock rewards'
    );

    let allAchievements = [];
    let myAchievements = [];
    try {
        [allAchievements, myAchievements] = await Promise.all([
            API.get('/achievements').catch(() => []),
            API.get('/achievements/mine').catch(() => []),
        ]);
    } catch(e) {}

    const earnedIds = new Set(myAchievements.map(a => a.id));
    const earnedCount = earnedIds.size;
    const totalCount = allAchievements.length || 1;
    const completionPct = Math.round((earnedCount / totalCount) * 100);

    const categories = {};
    for (const a of allAchievements) {
        const cat = a.category || 'General';
        if (!categories[cat]) categories[cat] = [];
        const earned = earnedIds.has(a.id);
        const earnedData = earned ? myAchievements.find(m => m.id === a.id) : null;
        categories[cat].push({ ...a, earned, earned_at: earnedData?.earned_at });
    }

    const catIcons = { study: '📚', streak: '🔥', social: '👥', booking: '📅', General: '⭐' };

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Badges Earned</span>
                    <span class="dashboard-stat-card__icon">🏆</span>
                </div>
                <div class="dashboard-stat-card__value">${earnedCount}</div>
                <div class="dashboard-stat-card__change">of ${allAchievements.length} total</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Completion</span>
                    <span class="dashboard-stat-card__icon">📊</span>
                </div>
                <div class="dashboard-stat-card__value">${completionPct}%</div>
                <div class="dashboard-stat-card__change">${allAchievements.length - earnedCount} remaining</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Categories</span>
                    <span class="dashboard-stat-card__icon">📂</span>
                </div>
                <div class="dashboard-stat-card__value">${Object.keys(categories).length}</div>
                <div class="dashboard-stat-card__change">Badge categories</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Latest Badge</span>
                    <span class="dashboard-stat-card__icon">✨</span>
                </div>
                <div class="dashboard-stat-card__value" style="font-size:var(--text-lg)">${myAchievements.length > 0 ? (myAchievements[0].icon || '🏅') : '—'}</div>
                <div class="dashboard-stat-card__change">${myAchievements.length > 0 ? myAchievements[0].name : 'None yet'}</div>
            </div>
        </div>

        <div class="dashboard-card" style="margin-bottom:var(--space-6)">
            <div class="dashboard-card__body">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
                    <span style="font-weight:var(--weight-semibold)">Overall Progress</span>
                    <span style="font-size:var(--text-sm);color:var(--color-text-muted)">${earnedCount} / ${allAchievements.length}</span>
                </div>
                <div class="progress" style="height:12px"><div class="progress__bar" style="width:${completionPct}%"></div></div>
            </div>
        </div>

        <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6);flex-wrap:wrap">
            <button class="btn btn--accent btn--sm achiev-filter active" onclick="filterAchievements('all',this)">All</button>
            <button class="btn btn--outline btn--sm achiev-filter" onclick="filterAchievements('earned',this)">Earned</button>
            <button class="btn btn--outline btn--sm achiev-filter" onclick="filterAchievements('locked',this)">Locked</button>
        </div>

        ${Object.entries(categories).map(([cat, items]) => `
            <div class="dashboard-card" style="margin-bottom:var(--space-6)">
                <div class="dashboard-card__header">
                    <h3 class="dashboard-card__title">${catIcons[cat] || '⭐'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
                    <span class="badge badge--primary">${items.filter(a => a.earned).length}/${items.length}</span>
                </div>
                <div class="dashboard-card__body" style="padding:0">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1px;background:var(--color-border-light)">
                        ${items.map(a => `
                            <div class="achiev-item" data-earned="${a.earned}" style="padding:var(--space-4) var(--space-5);background:var(--color-bg);display:flex;align-items:center;gap:var(--space-4);${!a.earned ? 'opacity:0.5' : ''}">
                                <div style="width:44px;height:44px;border-radius:var(--radius-md);background:${a.earned ? 'var(--color-accent)' : 'var(--color-surface)'};display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;${a.earned ? 'color:white' : ''}">
                                    ${a.icon || '🏅'}
                                </div>
                                <div style="flex:1;min-width:0">
                                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">${a.name}</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${a.description || ''}</div>
                                    ${a.earned && a.earned_at ? `<div style="font-size:11px;color:var(--color-success);margin-top:2px">Earned ${new Date(a.earned_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</div>` : ''}
                                </div>
                                <div style="flex-shrink:0;text-align:right">
                                    <div style="font-size:var(--text-xs);font-weight:var(--weight-semibold);color:${a.earned ? 'var(--color-success)' : 'var(--color-text-muted)'}">
                                        ${a.earned ? '✓ Earned' : '🔒 Locked'}
                                    </div>
                                    ${a.xp_reward ? `<div style="font-size:11px;color:var(--color-accent)">+${a.xp_reward} XP</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('')}

        ${allAchievements.length === 0 ? `
            <div class="dashboard-card">
                <div class="dashboard-card__body" style="text-align:center;padding:var(--space-10)">
                    <div style="font-size:48px;margin-bottom:var(--space-4)">🏆</div>
                    <h3 style="margin-bottom:var(--space-2)">No achievements available yet</h3>
                    <p style="color:var(--color-text-muted);font-size:var(--text-sm)">Keep studying and achievements will appear here as they're added!</p>
                </div>
            </div>
        ` : ''}
    `;

    app.innerHTML = renderAppLayout(content, 'Achievements & Badges', 'Track your progress and unlock rewards');
}

function filterAchievements(filter, btn) {
    document.querySelectorAll('.achiev-filter').forEach(b => {
        b.classList.remove('active');
        b.className = b.className.replace('btn--accent', 'btn--outline');
    });
    btn.classList.add('active');
    btn.className = btn.className.replace('btn--outline', 'btn--accent');

    document.querySelectorAll('.achiev-item').forEach(el => {
        const earned = el.dataset.earned === 'true';
        if (filter === 'all') el.style.display = '';
        else if (filter === 'earned') el.style.display = earned ? '' : 'none';
        else el.style.display = earned ? 'none' : '';
    });
}
