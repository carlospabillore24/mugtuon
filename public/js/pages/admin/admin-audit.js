let _auditPage = 1;
const _auditLimit = 50;

async function renderAdminAuditPage(app) {
    _auditPage = 1;
    await loadAuditLog(app);
}

async function loadAuditLog(app, page) {
    if (page) _auditPage = page;
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading audit log...</div>`,
        'Audit Log', 'Track all admin actions'
    );

    let data = { logs: [], total: 0, page: _auditPage, limit: _auditLimit };
    try {
        data = await API.get(`/admin/audit-log?page=${_auditPage}&limit=${_auditLimit}`);
    } catch(e) {}

    const totalPages = Math.ceil((data.total || 1) / _auditLimit);
    const actionIcons = {
        change_role: '🔄', change_status: '🔒', delete_user: '🗑',
        booking_status: '📅', edit_payment: '💳', reset_password: '🔑'
    };

    const content = `
        <div class="dashboard-card">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">Admin Actions</h3>
                <span class="badge badge--primary">${data.total} total</span>
            </div>
            <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Admin</th><th>Action</th><th>Target</th><th>Details</th><th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.logs.length === 0
                            ? `<tr><td colspan="5" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted)">No actions logged yet.</td></tr>`
                            : data.logs.map(l => `
                                <tr>
                                    <td style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${Helpers.esc(l.first_name || '?')} ${Helpers.esc(l.last_name || '')}</td>
                                    <td><span style="font-size:var(--text-sm)">${actionIcons[l.action] || '📋'} ${Helpers.esc(l.action.replace(/_/g, ' '))}</span></td>
                                    <td style="font-size:var(--text-xs);color:var(--color-text-muted)">${l.target_type ? `${Helpers.esc(l.target_type)} #${Helpers.esc((l.target_id || '').slice(0,8))}` : '—'}</td>
                                    <td style="font-size:var(--text-xs);color:var(--color-text-secondary)">${Helpers.esc(l.details || '—')}</td>
                                    <td style="font-size:var(--text-xs);color:var(--color-text-muted);white-space:nowrap">${l.created_at ? new Date(l.created_at).toLocaleString('en-PH', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
            ${totalPages > 1 ? `
            <div style="display:flex;justify-content:center;align-items:center;gap:var(--space-3);padding:var(--space-4);border-top:1px solid var(--color-border)">
                <button class="btn btn--outline btn--sm" onclick="loadAuditLog(document.getElementById('app'),${_auditPage-1})" ${_auditPage<=1?'disabled':''}>Prev</button>
                <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Page ${_auditPage} of ${totalPages}</span>
                <button class="btn btn--outline btn--sm" onclick="loadAuditLog(document.getElementById('app'),${_auditPage+1})" ${_auditPage>=totalPages?'disabled':''}>Next</button>
            </div>` : ''}
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Audit Log', 'Track all admin actions');
}
