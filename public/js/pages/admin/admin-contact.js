let _contactPage = 1;
const _contactLimit = 20;

async function renderAdminContactPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading messages...</div>`,
        'Contact Messages', 'View and manage messages from the contact form'
    );
    _contactPage = 1;
    await loadAdminContact(false, app);
}

async function loadAdminContact(unreadOnly, app, page) {
    if (page) _contactPage = page;
    let data = { messages: [], total: 0, unread: 0 };
    try {
        const qs = [`page=${_contactPage}`, `limit=${_contactLimit}`];
        if (unreadOnly) qs.push('unread=true');
        data = await API.get(`/admin/contact?${qs.join('&')}`);
    } catch (e) {}

    const totalPages = Math.ceil(data.total / _contactLimit);

    const content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6);flex-wrap:wrap;gap:var(--space-3)">
            <div style="display:flex;gap:var(--space-3);align-items:center">
                <span class="badge badge--${data.unread > 0 ? 'error' : 'primary'}">${data.unread} unread</span>
                <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);cursor:pointer">
                    <input type="checkbox" id="unreadFilter" onchange="loadAdminContact(this.checked, document.getElementById('app'))"
                           ${unreadOnly ? 'checked' : ''}> Unread only
                </label>
            </div>
            <span style="font-size:var(--text-sm);color:var(--color-text-muted)">${data.total} total messages</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
            ${data.messages.length === 0
                ? `<div class="dashboard-card"><div class="dashboard-card__body" style="text-align:center;color:var(--color-text-muted);padding:var(--space-8)">No messages found.</div></div>`
                : data.messages.map(m => `
                    <div class="dashboard-card" style="${!m.is_read ? 'border-left:3px solid var(--color-accent)' : ''}">
                        <div class="dashboard-card__header">
                            <div>
                                <div style="font-weight:var(--weight-semibold)">${Helpers.esc(m.name)} ${!m.is_read ? '<span class="badge badge--accent" style="font-size:10px;margin-left:6px">NEW</span>' : ''}</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.esc(m.email)} · ${Helpers.esc(m.subject) || 'General Inquiry'} · ${Helpers.formatDate(m.created_at)}</div>
                            </div>
                            <div style="display:flex;gap:var(--space-2)">
                                ${!m.is_read ? `<button class="btn btn--outline btn--sm" onclick="markContactRead(${m.id}, this)">Mark Read</button>` : ''}
                                <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="deleteContactMessage(${m.id}, this)">🗑</button>
                            </div>
                        </div>
                        <div class="dashboard-card__body" style="padding-top:var(--space-3)">
                            <p style="font-size:var(--text-sm);color:var(--color-text-secondary);white-space:pre-line">${Helpers.esc(m.message)}</p>
                            <a href="mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || 'Your inquiry')}" class="btn btn--outline btn--sm" style="margin-top:var(--space-3)">Reply via Email</a>
                        </div>
                    </div>`).join('')}
        </div>

        ${totalPages > 1 ? `
        <div style="display:flex;justify-content:center;align-items:center;gap:var(--space-3);margin-top:var(--space-6)">
            <button class="btn btn--outline btn--sm" onclick="loadAdminContact(${unreadOnly}, document.getElementById('app'), ${_contactPage-1})"
                    ${_contactPage <= 1 ? 'disabled' : ''}>← Prev</button>
            <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Page ${_contactPage} of ${totalPages}</span>
            <button class="btn btn--outline btn--sm" onclick="loadAdminContact(${unreadOnly}, document.getElementById('app'), ${_contactPage+1})"
                    ${_contactPage >= totalPages ? 'disabled' : ''}>Next →</button>
        </div>` : ''}
    `;

    app.innerHTML = renderAppLayout(content, 'Contact Messages', 'View and manage messages from the contact form');
}

async function markContactRead(id, btn) {
    try {
        await API.put(`/admin/contact/${id}/read`);
        btn.closest('.dashboard-card').style.borderLeft = '';
        const badge = btn.closest('.dashboard-card').querySelector('.badge--accent');
        if (badge) badge.remove();
        btn.remove();
        Helpers.showToast('Marked', 'Message marked as read.', 'success');
    } catch (err) { Helpers.showToast('Error', err.message, 'error'); }
}

async function deleteContactMessage(id, btn) {
    if (!await Helpers.confirmAction('Delete Message?', 'Delete this message permanently?', { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/contact/${id}`);
        btn.closest('.dashboard-card').style.transition = 'opacity .2s';
        btn.closest('.dashboard-card').style.opacity = '0';
        setTimeout(() => btn.closest('.dashboard-card').remove(), 200);
        Helpers.showToast('Deleted', 'Message deleted.', 'success');
    } catch (err) { Helpers.showToast('Error', err.message, 'error'); }
}
