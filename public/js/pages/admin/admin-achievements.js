let _adminAchievements = [];
let _adminChallenges = [];

async function renderAdminAchievementsPage(app) {
    app.innerHTML = renderAppLayout(
        Helpers.renderSkeleton('table'),
        'Achievements & Challenges', 'Manage badges and daily challenges'
    );
    await loadAdminAchievements(app);
}

async function loadAdminAchievements(app) {
    try {
        [_adminAchievements, _adminChallenges] = await Promise.all([
            API.get('/admin/achievements'),
            API.get('/admin/challenges')
        ]);
    } catch(e) {
        _adminAchievements = [];
        _adminChallenges = [];
    }

    const categories = [...new Set(_adminAchievements.map(a => a.category))];

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total Achievements</span>
                    <span class="dashboard-stat-card__icon">🏅</span>
                </div>
                <div class="dashboard-stat-card__value">${_adminAchievements.length}</div>
                <div class="dashboard-stat-card__change">${_adminAchievements.filter(a=>a.is_active).length} active</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Categories</span>
                    <span class="dashboard-stat-card__icon">📂</span>
                </div>
                <div class="dashboard-stat-card__value">${categories.length}</div>
                <div class="dashboard-stat-card__change">${categories.join(', ') || '—'}</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Daily Challenges</span>
                    <span class="dashboard-stat-card__icon">🎯</span>
                </div>
                <div class="dashboard-stat-card__value">${_adminChallenges.length}</div>
                <div class="dashboard-stat-card__change">${_adminChallenges.filter(c=>c.is_active).length} active</div>
            </div>
        </div>

        <!-- Achievements Section -->
        <div class="dashboard-card" style="margin-bottom:var(--space-6)">
            <div class="dashboard-card__header" style="display:flex;justify-content:space-between;align-items:center">
                <h3 class="dashboard-card__title">Achievements</h3>
                <button class="btn btn--accent btn--sm" onclick="showAchievementModal()">+ New Achievement</button>
            </div>
            <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Icon</th><th>Name</th><th>Category</th><th>Criteria</th>
                            <th>XP</th><th>Active</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${_adminAchievements.length === 0
                            ? '<tr><td colspan="7" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted)">No achievements yet.</td></tr>'
                            : _adminAchievements.map(a => `
                        <tr>
                            <td style="font-size:var(--text-xl)">${a.icon || '🏅'}</td>
                            <td>
                                <div style="font-weight:var(--weight-medium)">${Helpers.esc(a.name)}</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.esc(a.description || '')}</div>
                            </td>
                            <td><span class="badge badge--primary">${a.category}</span></td>
                            <td style="font-size:var(--text-xs);font-family:var(--font-mono)">${Helpers.esc(a.criteria)}</td>
                            <td style="font-weight:var(--weight-medium)">${a.xp_reward}</td>
                            <td>${a.is_active ? '<span class="badge badge--success">Yes</span>' : '<span class="badge badge--error">No</span>'}</td>
                            <td>
                                <div style="display:flex;gap:var(--space-2)">
                                    <button class="btn btn--ghost btn--sm" onclick="showAchievementModal('${a.id}')">Edit</button>
                                    <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="deleteAchievement('${a.id}','${Helpers.esc(a.name)}')">Delete</button>
                                </div>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Challenges Section -->
        <div class="dashboard-card">
            <div class="dashboard-card__header" style="display:flex;justify-content:space-between;align-items:center">
                <h3 class="dashboard-card__title">Daily Challenges</h3>
                <button class="btn btn--accent btn--sm" onclick="showChallengeModal()">+ New Challenge</button>
            </div>
            <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th><th>Type</th><th>Target</th>
                            <th>XP</th><th>Date</th><th>Active</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${_adminChallenges.length === 0
                            ? '<tr><td colspan="7" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted)">No challenges yet.</td></tr>'
                            : _adminChallenges.map(c => `
                        <tr>
                            <td>
                                <div style="font-weight:var(--weight-medium)">${Helpers.esc(c.title)}</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.esc(c.description || '')}</div>
                            </td>
                            <td><span class="badge badge--accent">${c.challenge_type}</span></td>
                            <td style="font-weight:var(--weight-medium)">${c.target_value}</td>
                            <td style="font-weight:var(--weight-medium)">${c.xp_reward}</td>
                            <td style="font-size:var(--text-xs)">${c.active_date ? new Date(c.active_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : 'Always'}</td>
                            <td>${c.is_active ? '<span class="badge badge--success">Yes</span>' : '<span class="badge badge--error">No</span>'}</td>
                            <td>
                                <div style="display:flex;gap:var(--space-2)">
                                    <button class="btn btn--ghost btn--sm" onclick="showChallengeModal('${c.id}')">Edit</button>
                                    <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="deleteChallenge('${c.id}','${Helpers.esc(c.title)}')">Delete</button>
                                </div>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Achievements & Challenges', 'Manage badges and daily challenges');
}

// ── Achievement Modal ────────────────────────────────────────────────────

function showAchievementModal(id) {
    const existing = id ? _adminAchievements.find(a => a.id === id) : null;
    const title = existing ? 'Edit Achievement' : 'New Achievement';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) { modal.classList.remove('active'); setTimeout(() => modal.remove(), 200); } };

    const closeModal = () => { modal.classList.remove('active'); setTimeout(() => modal.remove(), 200); };

    modal.innerHTML = `
        <div class="modal" style="max-width:500px">
            <div class="modal__header">
                <h3>${title}</h3>
                <button class="btn btn--ghost btn--sm" id="achCloseBtn">✕</button>
            </div>
            <div class="modal__body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Name *</label>
                        <input type="text" class="form-input" id="achName" value="${existing ? Helpers.esc(existing.name) : ''}">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Icon</label>
                        <input type="text" class="form-input" id="achIcon" value="${existing ? existing.icon : '🏅'}" style="font-size:var(--text-xl)">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <input type="text" class="form-input" id="achDesc" value="${existing ? Helpers.esc(existing.description||'') : ''}">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Category</label>
                        <select class="form-input" id="achCategory">
                            ${['general','consistency','milestones','focus','community','special'].map(c =>
                                `<option value="${c}" ${existing?.category===c?'selected':''}>${c}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">XP Reward</label>
                        <input type="number" class="form-input" id="achXP" value="${existing ? existing.xp_reward : 50}" min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Criteria *</label>
                    <select class="form-input" id="achCriteria">
                        ${['sessions_10','sessions_25','sessions_50','sessions_100',
                           'hours_10','hours_50','hours_100','hours_500',
                           'streak_3','streak_7','streak_14','streak_30',
                           'focus_80','focus_90','focus_95',
                           'early_session','late_session','group_5'].map(c =>
                            `<option value="${c}" ${existing?.criteria===c?'selected':''}>${c}</option>`
                        ).join('')}
                    </select>
                </div>
                <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);cursor:pointer">
                    <input type="checkbox" id="achActive" ${!existing || existing.is_active ? 'checked' : ''} style="accent-color:var(--color-accent)"> Active
                </label>
            </div>
            <div class="modal__footer" style="display:flex;justify-content:flex-end;gap:var(--space-3);padding:var(--space-4) var(--space-6);border-top:1px solid var(--color-border)">
                <button class="btn btn--ghost" id="achCancelBtn">Cancel</button>
                <button class="btn btn--accent" onclick="saveAchievement('${id||''}')">Save</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#achCloseBtn').onclick = closeModal;
    modal.querySelector('#achCancelBtn').onclick = closeModal;
    requestAnimationFrame(() => modal.classList.add('active'));
}

async function saveAchievement(id) {
    const data = {
        name: document.getElementById('achName').value.trim(),
        description: document.getElementById('achDesc').value.trim(),
        icon: document.getElementById('achIcon').value.trim() || '🏅',
        category: document.getElementById('achCategory').value,
        xp_reward: parseInt(document.getElementById('achXP').value) || 0,
        criteria: document.getElementById('achCriteria').value,
        is_active: document.getElementById('achActive').checked
    };
    if (!data.name || !data.criteria) {
        Helpers.showToast('Error', 'Name and criteria are required.', 'error');
        return;
    }
    try {
        if (id) {
            await API.put(`/admin/achievements/${id}`, data);
        } else {
            await API.post('/admin/achievements', data);
        }
        const m = document.querySelector('.modal-overlay'); if (m) { m.classList.remove('active'); setTimeout(() => m.remove(), 200); }
        Helpers.showToast('Saved', `Achievement "${data.name}" saved.`, 'success');
        loadAdminAchievements(document.getElementById('app'));
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function deleteAchievement(id, name) {
    if (!await Helpers.confirmAction('Delete Achievement?', `Delete achievement "${name}"? This will also remove it from all users.`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/achievements/${id}`);
        Helpers.showToast('Deleted', `Achievement "${name}" deleted.`, 'success');
        loadAdminAchievements(document.getElementById('app'));
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ── Challenge Modal ──────────────────────────────────────────────────────

function showChallengeModal(id) {
    const existing = id ? _adminChallenges.find(c => c.id === id) : null;
    const title = existing ? 'Edit Challenge' : 'New Challenge';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) { modal.classList.remove('active'); setTimeout(() => modal.remove(), 200); } };

    const closeModal = () => { modal.classList.remove('active'); setTimeout(() => modal.remove(), 200); };

    modal.innerHTML = `
        <div class="modal" style="max-width:500px">
            <div class="modal__header">
                <h3>${title}</h3>
                <button class="btn btn--ghost btn--sm" id="chalCloseBtn">✕</button>
            </div>
            <div class="modal__body">
                <div class="form-group">
                    <label class="form-label">Title *</label>
                    <input type="text" class="form-input" id="chalTitle" value="${existing ? Helpers.esc(existing.title) : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <input type="text" class="form-input" id="chalDesc" value="${existing ? Helpers.esc(existing.description||'') : ''}">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3)">
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Type *</label>
                        <select class="form-input" id="chalType">
                            ${['study_time','sessions','focus_score'].map(t =>
                                `<option value="${t}" ${existing?.challenge_type===t?'selected':''}>${t.replace(/_/g,' ')}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Target Value</label>
                        <input type="number" class="form-input" id="chalTarget" value="${existing ? existing.target_value : 1}" min="1">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">XP Reward</label>
                        <input type="number" class="form-input" id="chalXP" value="${existing ? existing.xp_reward : 30}" min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Active Date (blank = always active)</label>
                    <input type="date" class="form-input" id="chalDate" value="${existing?.active_date ? existing.active_date.slice(0,10) : ''}">
                </div>
                <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);cursor:pointer">
                    <input type="checkbox" id="chalActive" ${!existing || existing.is_active ? 'checked' : ''} style="accent-color:var(--color-accent)"> Active
                </label>
            </div>
            <div class="modal__footer" style="display:flex;justify-content:flex-end;gap:var(--space-3);padding:var(--space-4) var(--space-6);border-top:1px solid var(--color-border)">
                <button class="btn btn--ghost" id="chalCancelBtn">Cancel</button>
                <button class="btn btn--accent" onclick="saveChallenge('${id||''}')">Save</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#chalCloseBtn').onclick = closeModal;
    modal.querySelector('#chalCancelBtn').onclick = closeModal;
    requestAnimationFrame(() => modal.classList.add('active'));
}

async function saveChallenge(id) {
    const data = {
        title: document.getElementById('chalTitle').value.trim(),
        description: document.getElementById('chalDesc').value.trim(),
        challenge_type: document.getElementById('chalType').value,
        target_value: parseInt(document.getElementById('chalTarget').value) || 1,
        xp_reward: parseInt(document.getElementById('chalXP').value) || 0,
        active_date: document.getElementById('chalDate').value || null,
        is_active: document.getElementById('chalActive').checked
    };
    if (!data.title || !data.challenge_type) {
        Helpers.showToast('Error', 'Title and type are required.', 'error');
        return;
    }
    try {
        if (id) {
            await API.put(`/admin/challenges/${id}`, data);
        } else {
            await API.post('/admin/challenges', data);
        }
        document.querySelector('.modal-overlay')?.remove();
        Helpers.showToast('Saved', `Challenge "${data.title}" saved.`, 'success');
        loadAdminAchievements(document.getElementById('app'));
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function deleteChallenge(id, title) {
    if (!await Helpers.confirmAction('Delete Challenge?', `Delete challenge "${title}"? This will also remove all user progress.`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/challenges/${id}`);
        Helpers.showToast('Deleted', `Challenge "${title}" deleted.`, 'success');
        loadAdminAchievements(document.getElementById('app'));
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}
