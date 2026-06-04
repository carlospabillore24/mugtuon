let _adminAnnouncements = [];

async function renderAdminAnnouncementsPage(app) {
    app.innerHTML = renderAppLayout(
        Helpers.renderSkeleton('table'),
        'Announcements', 'Broadcast messages to users'
    );
    await loadAdminAnnouncements(app);
}

async function loadAdminAnnouncements(app) {
    try {
        _adminAnnouncements = await API.get('/admin/announcements');
    } catch(e) { _adminAnnouncements = []; }

    const active = _adminAnnouncements.filter(a => a.is_active && (!a.expires_at || new Date(a.expires_at) > new Date()));
    const priorityColors = { info: 'primary', warning: 'warning', urgent: 'error' };

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total Announcements</span>
                    <span class="dashboard-stat-card__icon">📢</span>
                </div>
                <div class="dashboard-stat-card__value">${_adminAnnouncements.length}</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Currently Active</span>
                    <span class="dashboard-stat-card__icon">🟢</span>
                </div>
                <div class="dashboard-stat-card__value">${active.length}</div>
            </div>
        </div>

        <div class="dashboard-card">
            <div class="dashboard-card__header" style="display:flex;justify-content:space-between;align-items:center">
                <h3 class="dashboard-card__title">All Announcements</h3>
                <button class="btn btn--accent btn--sm" onclick="showAnnouncementModal()">+ New Announcement</button>
            </div>
            <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Title</th><th>Priority</th><th>Target</th>
                            <th>Author</th><th>Created</th><th>Expires</th><th>Active</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${_adminAnnouncements.length === 0
                            ? '<tr><td colspan="8" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted)">No announcements yet.</td></tr>'
                            : _adminAnnouncements.map(a => `
                        <tr>
                            <td>
                                <div style="font-weight:var(--weight-medium)">${Helpers.esc(a.title)}</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-muted);max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Helpers.esc(a.message)}</div>
                            </td>
                            <td><span class="badge badge--${priorityColors[a.priority]||'primary'}">${a.priority}</span></td>
                            <td style="font-size:var(--text-sm)">${a.target_role === 'all' ? 'Everyone' : a.target_role}</td>
                            <td style="font-size:var(--text-sm)">${Helpers.esc(a.author_name || '—')}</td>
                            <td style="font-size:var(--text-xs)">${new Date(a.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}</td>
                            <td style="font-size:var(--text-xs)">${a.expires_at ? new Date(a.expires_at).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : 'Never'}</td>
                            <td>${a.is_active ? '<span class="badge badge--success">Yes</span>' : '<span class="badge badge--error">No</span>'}</td>
                            <td>
                                <div style="display:flex;gap:var(--space-2)">
                                    <button class="btn btn--ghost btn--sm" onclick="showAnnouncementModal(${a.id})">Edit</button>
                                    <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="deleteAnnouncement(${a.id},'${Helpers.esc(a.title).replace(/'/g,"\\'")}')">Delete</button>
                                </div>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Announcements', 'Broadcast messages to users');
}

function showAnnouncementModal(id) {
    const existing = id ? _adminAnnouncements.find(a => a.id === id) : null;
    const title = existing ? 'Edit Announcement' : 'New Announcement';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const closeModal = () => { modal.classList.remove('active'); setTimeout(() => modal.remove(), 200); };
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    modal.innerHTML = `
        <div class="modal" style="max-width:540px">
            <div class="modal__header">
                <h3>${title}</h3>
                <button class="btn btn--ghost btn--sm" id="annCloseBtn">✕</button>
            </div>
            <div class="modal__body">
                <div class="form-group">
                    <label class="form-label">Title *</label>
                    <input type="text" class="form-input" id="annTitle" value="${existing ? Helpers.esc(existing.title) : ''}" placeholder="Announcement title">
                </div>
                <div class="form-group">
                    <label class="form-label">Message *</label>
                    <textarea class="form-input" id="annMessage" rows="4" placeholder="Write your announcement...">${existing ? Helpers.esc(existing.message) : ''}</textarea>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3)">
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Priority</label>
                        <select class="form-input" id="annPriority">
                            ${['info','warning','urgent'].map(p =>
                                `<option value="${p}" ${existing?.priority===p?'selected':''}>${p}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Target Audience</label>
                        <select class="form-input" id="annTarget">
                            ${['all','student','member','staff','admin'].map(r =>
                                `<option value="${r}" ${existing?.target_role===r?'selected':''}>${r === 'all' ? 'Everyone' : r}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Expires (optional)</label>
                        <input type="date" class="form-input" id="annExpires" value="${existing?.expires_at ? existing.expires_at.slice(0,10) : ''}">
                    </div>
                </div>
                <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);cursor:pointer;margin-top:var(--space-3)">
                    <input type="checkbox" id="annActive" ${!existing || existing.is_active ? 'checked' : ''} style="accent-color:var(--color-accent)"> Active
                </label>
            </div>
            <div class="modal__footer" style="display:flex;justify-content:flex-end;gap:var(--space-3);padding:var(--space-4) var(--space-6);border-top:1px solid var(--color-border)">
                <button class="btn btn--ghost" id="annCancelBtn">Cancel</button>
                <button class="btn btn--accent" onclick="saveAnnouncement(${id||0})">Save</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#annCloseBtn').onclick = closeModal;
    modal.querySelector('#annCancelBtn').onclick = closeModal;
    requestAnimationFrame(() => modal.classList.add('active'));
}

async function saveAnnouncement(id) {
    const data = {
        title: document.getElementById('annTitle').value.trim(),
        message: document.getElementById('annMessage').value.trim(),
        priority: document.getElementById('annPriority').value,
        target_role: document.getElementById('annTarget').value,
        expires_at: document.getElementById('annExpires').value || null,
        is_active: document.getElementById('annActive').checked
    };
    if (!data.title || !data.message) {
        Helpers.showToast('Error', 'Title and message are required.', 'error');
        return;
    }
    try {
        if (id) {
            await API.put(`/admin/announcements/${id}`, data);
        } else {
            await API.post('/admin/announcements', data);
        }
        const m = document.querySelector('.modal-overlay'); if (m) { m.classList.remove('active'); setTimeout(() => m.remove(), 200); }
        Helpers.showToast('Saved', `Announcement "${data.title}" saved.`, 'success');
        loadAdminAnnouncements(document.getElementById('app'));
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function deleteAnnouncement(id, title) {
    if (!await Helpers.confirmAction('Delete Announcement?', `Delete announcement "${title}"?`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/announcements/${id}`);
        Helpers.showToast('Deleted', `Announcement deleted.`, 'success');
        loadAdminAnnouncements(document.getElementById('app'));
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}
