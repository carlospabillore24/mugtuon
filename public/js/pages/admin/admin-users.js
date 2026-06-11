let _adminUsers = [];
let _currentStatusFilter = '';

// ─── Entry point ───────────────────────────────────────────────────────
async function renderAdminUsersPage(app) {
    app.innerHTML = renderAppLayout(
        Helpers.renderSkeleton('table'),
        'User Management', 'Manage platform users and their roles'
    );
    await loadAdminUsers('', '', '', app);
}

// ─── Load & render table ───────────────────────────────────────────────
async function loadAdminUsers(search, role, statusFilter, app) {
    let users = [];
    try {
        const qs = [];
        if (search) qs.push(`search=${encodeURIComponent(search)}`);
        if (role)   qs.push(`role=${role}`);
        qs.push('limit=100');
        users = await API.get(`/admin/users?${qs.join('&')}`);
        _adminUsers = users;
    } catch(e) { users = _adminUsers; }

    // Client-side status filter
    let displayed = statusFilter
        ? users.filter(u => (u.account_status || (u.is_active ? 'active' : 'suspended')) === statusFilter)
        : users;

    // Counts from full list
    const counts = { student:0, member:0, staff:0, admin:0, active:0, suspended:0, banned:0 };
    for (const u of _adminUsers) {
        if (u.role in counts) counts[u.role]++;
        const st = u.account_status || (u.is_active ? 'active' : 'suspended');
        if (st in counts) counts[st]++;
    }

    const statusBadgeColor = { active:'success', suspended:'warning', banned:'error' };

    const rows = displayed.length === 0
        ? `<tr><td colspan="8" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">No users found.</td></tr>`
        : displayed.map(u => {
            const st = u.account_status || (u.is_active ? 'active' : 'suspended');
            return `
            <tr data-userid="${u.id}">
                <td>
                    <div style="display:flex;align-items:center;gap:var(--space-3)">
                        <div class="avatar avatar--sm" style="background:${st==='banned'?'var(--color-error)':st==='suspended'?'var(--color-warning)':'var(--color-primary)'}">
                            ${Helpers.getInitials(u.first_name, u.last_name)}
                        </div>
                        <div>
                            <div style="font-weight:var(--weight-medium)">${Helpers.esc(u.first_name)} ${Helpers.esc(u.last_name)}</div>
                        </div>
                    </div>
                </td>
                <td style="color:var(--color-text-muted);font-size:var(--text-sm)">${Helpers.esc(u.email)}</td>
                <td>
                    <select class="form-input" style="padding:2px 6px;font-size:var(--text-xs);height:auto"
                            onchange="changeUserRole('${u.id}', this.value)">
                        ${['student','member','staff','admin'].map(r =>
                            `<option value="${r}"${u.role===r?' selected':''}>${r}</option>`
                        ).join('')}
                    </select>
                </td>
                <td>
                    <span class="badge badge--${statusBadgeColor[st] || 'success'}" id="ustatus-${u.id}">${st}</span>
                </td>
                <td style="font-size:var(--text-xs);color:${u.plan_name === 'Explorer' ? 'var(--color-text-muted)' : 'var(--color-accent)'};font-weight:var(--weight-medium)">${u.plan_name || 'Explorer'}</td>
                <td style="font-size:var(--text-sm)">${u.created_at
                    ? new Date(u.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})
                    : '—'}</td>
                <td style="color:var(--color-text-muted);font-size:var(--text-sm)">${u.last_login_at
                    ? new Date(u.last_login_at).toLocaleDateString('en-PH',{month:'short',day:'numeric'})
                    : 'Never'}</td>
                <td>
                    <button class="btn btn--ghost btn--sm btn--icon user-menu-trigger"
                            onclick="toggleUserMenu('${u.id}', this)" title="More actions"
                            style="font-size:18px;font-weight:700">⋯</button>
                </td>
            </tr>`;
        }).join('');

    const content = `
        <!-- Filters row -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6);flex-wrap:wrap;gap:var(--space-3)">
            <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
                <input type="text" class="form-input" placeholder="Search users…" style="width:220px"
                       id="userSearchInput" oninput="adminUserSearch(this.value)">
                <select class="form-input" style="width:130px" id="roleFilterSelect" onchange="adminUserRoleFilter(this.value)">
                    <option value="">All Roles</option>
                    <option value="student">Student</option>
                    <option value="member">Member</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                </select>
                <select class="form-input" style="width:145px" id="statusFilterSelect" onchange="adminUserStatusFilter(this.value)">
                    <option value="">All Statuses</option>
                    <option value="active">✅ Active</option>
                    <option value="suspended">⏸ Suspended</option>
                    <option value="banned">🚫 Banned</option>
                </select>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-3)">
                <span style="font-size:var(--text-sm);color:var(--color-text-muted)">
                    ${displayed.length === _adminUsers.length
                        ? `${_adminUsers.length} users`
                        : `${displayed.length} of ${_adminUsers.length} users`}
                </span>
                <button class="btn btn--outline btn--sm" onclick="exportUsersCSV()">Export CSV</button>
            </div>
        </div>

        <!-- Table -->
        <div class="dashboard-card">
            <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                <table class="data-table" id="adminUsersTable">
                    <thead>
                        <tr>
                            <th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Plan</th>
                            <th>Joined</th><th>Last Login</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>

        <!-- Summary cards -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-5);margin-top:var(--space-6)">
            <div class="card card--elevated" style="text-align:center">
                <div style="font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-success)">${counts.active}</div>
                <div style="font-size:var(--text-sm);color:var(--color-text-muted)">Active</div>
            </div>
            <div class="card card--elevated" style="text-align:center">
                <div style="font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-warning)">${counts.suspended}</div>
                <div style="font-size:var(--text-sm);color:var(--color-text-muted)">Suspended</div>
            </div>
            <div class="card card--elevated" style="text-align:center">
                <div style="font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-error)">${counts.banned}</div>
                <div style="font-size:var(--text-sm);color:var(--color-text-muted)">Banned</div>
            </div>
            <div class="card card--elevated" style="text-align:center">
                <div style="font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-primary)">${_adminUsers.length}</div>
                <div style="font-size:var(--text-sm);color:var(--color-text-muted)">Total Users</div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'User Management', 'Manage platform users and their roles');
}

// ─── Filter helpers ────────────────────────────────────────────────────
let _userSearchTimer = null;

function adminUserSearch(val) {
    clearTimeout(_userSearchTimer);
    _userSearchTimer = setTimeout(() => {
        const app = document.getElementById('app');
        loadAdminUsers(val, document.getElementById('roleFilterSelect')?.value || '', _currentStatusFilter, app);
    }, 380);
}

function adminUserRoleFilter(role) {
    const app = document.getElementById('app');
    loadAdminUsers(document.getElementById('userSearchInput')?.value || '', role, _currentStatusFilter, app);
}

function adminUserStatusFilter(status) {
    _currentStatusFilter = status;
    const app = document.getElementById('app');
    loadAdminUsers(
        document.getElementById('userSearchInput')?.value  || '',
        document.getElementById('roleFilterSelect')?.value || '',
        status, app
    );
}

// ─── Change role ───────────────────────────────────────────────────────
async function changeUserRole(userId, newRole) {
    try {
        await API.put(`/admin/users/${userId}/role`, { role: newRole });
        const u = _adminUsers.find(x => x.id == userId);
        if (u) u.role = newRole;
        Helpers.showToast('Role Updated', `User role changed to ${newRole}.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ─── Action dropdown menu ──────────────────────────────────────────────
function toggleUserMenu(userId, btnEl) {
    // Close any other open menus
    document.querySelectorAll('.user-action-menu').forEach(m => {
        if (m.dataset.userid !== String(userId)) m.remove();
    });
    const existing = document.querySelector(`.user-action-menu[data-userid="${userId}"]`);
    if (existing) { existing.remove(); return; }

    const user = _adminUsers.find(u => u.id == userId);
    if (!user) return;
    const st = user.account_status || (user.is_active ? 'active' : 'suspended');

    const actions = [
        { icon:'📊', label:'View Analytics', fn: () => openUserAnalytics(userId),                       danger: false },
        { icon:'🔑', label:'Reset Password', fn: () => adminResetPassword(userId),                      danger: false },
        ...(st !== 'active'    ? [{ icon:'✅', label:'Activate',  fn: () => setUserStatus(userId,'active'),    danger: false }] : []),
        ...(st !== 'suspended' ? [{ icon:'⏸', label:'Suspend',   fn: () => setUserStatus(userId,'suspended'), danger: false }] : []),
        ...(st !== 'banned'    ? [{ icon:'🚫', label:'Ban User',  fn: () => setUserStatus(userId,'banned'),    danger: true  }] : []),
        { icon:'🗑', label:'Delete User', fn: () => deleteAdminUser(userId, `${user.first_name} ${user.last_name}`), danger: true },
    ];

    const menu = document.createElement('div');
    menu.className = 'user-action-menu';
    menu.dataset.userid = String(userId);
    Object.assign(menu.style, {
        position:'fixed', background:'var(--color-bg)',
        border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)',
        boxShadow:'var(--shadow-lg)', zIndex:'600', minWidth:'170px',
        padding:'4px 0', fontSize:'var(--text-sm)'
    });

    menu.innerHTML = actions.map((a, i) => `
        <button data-idx="${i}" style="
            display:flex;align-items:center;gap:10px;width:100%;padding:9px 16px;
            background:none;border:none;cursor:pointer;text-align:left;white-space:nowrap;
            color:${a.danger ? 'var(--color-error)' : 'inherit'};font-size:var(--text-sm);
            transition:background .1s"
            onmouseover="this.style.background='var(--color-surface)'"
            onmouseout="this.style.background='none'">
            <span>${a.icon}</span><span>${a.label}</span>
        </button>
    `).join('');

    // Position: open below the button, right-aligned
    const rect = btnEl.getBoundingClientRect();
    const menuW = 172;
    menu.style.top  = `${rect.bottom + 4}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.right - menuW, window.innerWidth - menuW - 8))}px`;

    actions.forEach((a, i) => {
        menu.querySelector(`[data-idx="${i}"]`).addEventListener('click', () => {
            menu.remove();
            a.fn();
        });
    });

    document.body.appendChild(menu);

    // Close on outside click
    setTimeout(() => {
        const closeOutside = (e) => {
            if (!menu.contains(e.target) && e.target !== btnEl) {
                menu.remove();
                document.removeEventListener('click', closeOutside);
            }
        };
        document.addEventListener('click', closeOutside);
    }, 0);
}

// ─── Set account status ────────────────────────────────────────────────
async function setUserStatus(userId, status) {
    const user = _adminUsers.find(u => u.id == userId);
    if (!user) return;
    if (status === 'banned') {
        if (!await Helpers.confirmAction('Ban User?', `Ban ${user.first_name} ${user.last_name}? They will be blocked from logging in.`, { confirmText: 'Ban User', type: 'danger' })) return;
    }
    try {
        const updated = await API.put(`/admin/users/${userId}/status`, { status });
        user.is_active      = updated.is_active;
        user.account_status = updated.account_status;
        // Update badge in-place
        const badge = document.getElementById(`ustatus-${userId}`);
        if (badge) {
            const colors = { active:'success', suspended:'warning', banned:'error' };
            badge.className   = `badge badge--${colors[status] || 'success'}`;
            badge.textContent = status;
        }
        // Tint avatar
        const avatarEl = document.querySelector(`tr[data-userid="${userId}"] .avatar`);
        if (avatarEl) {
            avatarEl.style.background = status === 'banned' ? 'var(--color-error)'
                : status === 'suspended' ? 'var(--color-warning)' : 'var(--color-primary)';
        }
        Helpers.showToast('Status Updated', `${user.first_name}'s account is now ${status}.`, 'success');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ─── Delete user ───────────────────────────────────────────────────────
async function deleteAdminUser(userId, name) {
    if (!await Helpers.confirmAction('Deactivate User?', `Deactivate ${name}? Their account will be disabled and they won't be able to log in. Their data will be preserved.`, { confirmText: 'Deactivate', type: 'danger' })) return;
    try {
        await API.delete(`/admin/users/${userId}`);
        _adminUsers = _adminUsers.filter(u => u.id != userId);
        const row = document.querySelector(`tr[data-userid="${userId}"]`);
        if (row) {
            row.style.transition = 'opacity .25s';
            row.style.opacity = '0';
            setTimeout(() => row.remove(), 250);
        }
        Helpers.showToast('Deactivated', `${name}'s account has been deactivated.`, 'success');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ─── Admin Reset Password ─────────────────────────────────────────────
async function adminResetPassword(userId) {
    const user = _adminUsers.find(u => u.id == userId);
    if (!user) return;

    try {
        const data = await API.post(`/admin/users/${userId}/reset-password`);
        const fullLink = `${window.location.origin}${data.link}`;

        // Show modal with copyable link
        let modal = document.getElementById('reset-link-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reset-link-modal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1100;display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:520px;box-shadow:var(--shadow-xl)" onclick="event.stopPropagation()">
                <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                    <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">🔑 Password Reset Link</h3>
                    <button class="btn btn--ghost btn--sm" onclick="document.getElementById('reset-link-modal').style.display='none'">✕</button>
                </div>
                <div style="padding:var(--space-6)">
                    <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4)">
                        A reset link has been generated for <strong>${user.first_name} ${user.last_name}</strong> (${user.email}). Share this link with them — it expires in 1 hour.
                    </p>
                    <div style="display:flex;gap:var(--space-2)">
                        <input type="text" class="form-input" value="${fullLink}" readonly id="resetLinkInput"
                               style="font-size:var(--text-xs);flex:1" onclick="this.select()">
                        <button class="btn btn--accent btn--sm" onclick="navigator.clipboard.writeText('${fullLink}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)">Copy</button>
                    </div>
                </div>
            </div>`;
        modal.style.display = 'flex';
        modal.onclick = () => { modal.style.display = 'none'; };
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ─── User Analytics Modal ──────────────────────────────────────────────
async function openUserAnalytics(userId) {
    const user = _adminUsers.find(u => u.id == userId);
    if (!user) return;
    _ensureAnalyticsModal();
    _setAnalyticsHeader(user);
    document.getElementById('uan-body').innerHTML =
        `<div style="text-align:center;padding:var(--space-10);color:var(--color-text-muted)">⏳ Loading analytics…</div>`;
    document.getElementById('user-analytics-modal').style.display = 'flex';

    try {
        const data = await API.get(`/admin/users/${userId}/analytics`);
        _renderAnalyticsData(data, userId);
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
        document.getElementById('user-analytics-modal').style.display = 'none';
    }
}

function closeUserAnalyticsModal() {
    const m = document.getElementById('user-analytics-modal');
    if (m) m.style.display = 'none';
}

function _ensureAnalyticsModal() {
    if (document.getElementById('user-analytics-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'user-analytics-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:none;align-items:center;justify-content:center;padding:var(--space-4)';
    modal.innerHTML = `
        <div style="background:var(--color-bg);border-radius:var(--radius-lg);
                    width:100%;max-width:660px;max-height:88vh;overflow-y:auto;box-shadow:var(--shadow-xl)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:var(--space-6) var(--space-6) 0">
                <div>
                    <h2 id="uan-name" style="font-size:var(--text-xl);font-weight:700;margin:0"></h2>
                    <p id="uan-email" style="color:var(--color-text-muted);font-size:var(--text-sm);margin:4px 0 0"></p>
                </div>
                <button class="btn btn--ghost btn--sm btn--icon" onclick="closeUserAnalyticsModal()" style="flex-shrink:0">✕</button>
            </div>
            <div id="uan-body" style="padding:var(--space-6)"></div>
        </div>`;
    document.body.appendChild(modal);
}

function _setAnalyticsHeader(user) {
    const nameEl  = document.getElementById('uan-name');
    const emailEl = document.getElementById('uan-email');
    if (nameEl)  nameEl.textContent  = `${user.first_name} ${user.last_name}`;
    if (emailEl) emailEl.textContent = user.email;
}

function exportUsersCSV() {
    if (!_adminUsers.length) { Helpers.showToast('No data', 'No users to export.', 'info'); return; }
    const headers = ['Name', 'Email', 'Role', 'Status', 'Plan', 'University', 'Joined', 'Last Login'];
    const rows = _adminUsers.map(u => [
        `"${u.first_name} ${u.last_name}"`, `"${u.email}"`, u.role,
        u.account_status || 'active', `"${u.plan_name || 'Explorer'}"`,
        `"${u.university || ''}"`,
        u.created_at ? u.created_at.slice(0, 10) : '',
        u.last_login_at ? u.last_login_at.slice(0, 10) : 'Never'
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Helpers.showToast('Exported', `${_adminUsers.length} users exported.`, 'success');
}

function _renderAnalyticsData(data, userId) {
    const { user, sessions, bookings, achievements, recentSessions } = data;
    const xp      = parseInt(user.xp) || 0;
    const level   = Helpers.getLevel(xp);
    const xpPct   = Math.round(Helpers.getLevelProgress(xp));
    const xpToNxt = 1000 - (xp % 1000);
    const streak  = user.streak_days || 0;
    const totHrs  = parseFloat(sessions.total_hours) || 0;
    const avgMins = parseFloat(sessions.avg_minutes)  || 0;
    const st      = user.account_status || (user.is_active ? 'active' : 'suspended');
    const stColor = { active:'success', suspended:'warning', banned:'error' };

    _setAnalyticsHeader(user);

    const body = document.getElementById('uan-body');
    if (!body) return;

    body.innerHTML = `
        <!-- Status & meta -->
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2);margin-bottom:var(--space-6)">
            <span class="badge badge--${stColor[st] || 'success'}">${st}</span>
            <span class="badge badge--primary">${user.role}</span>
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">
                Joined ${new Date(user.created_at).toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'})}
            </span>
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">
                ${user.last_login_at
                    ? `Last seen ${new Date(user.last_login_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}`
                    : 'Never logged in'}
            </span>
        </div>

        <!-- XP & Level -->
        <div class="dashboard-card" style="margin-bottom:var(--space-5)">
            <div class="dashboard-card__body">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
                    <div>
                        <span style="font-size:32px;font-weight:800;color:var(--color-accent)">Lv.${level}</span>
                        <span style="font-size:var(--text-sm);color:var(--color-text-muted);margin-left:var(--space-2)">${xp.toLocaleString()} XP</span>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:var(--text-2xl);font-weight:700">🔥 ${streak}</div>
                        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">day streak</div>
                    </div>
                </div>
                <div style="height:10px;background:var(--color-surface);border-radius:5px;overflow:hidden;margin-bottom:4px">
                    <div style="height:100%;width:${xpPct}%;background:var(--color-gold);border-radius:5px"></div>
                </div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${xpToNxt} XP to Level ${level+1}</div>
            </div>
        </div>

        <!-- Stats grid -->
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-4);margin-bottom:var(--space-5)">
            <div class="dashboard-card">
                <div class="dashboard-card__body" style="text-align:center;padding:var(--space-4)">
                    <div style="font-size:32px;font-weight:800;color:var(--color-primary)">${sessions.total_sessions}</div>
                    <div style="font-weight:600">Study Sessions</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">
                        ${totHrs.toFixed(1)} hrs · avg ${Math.round(avgMins)} min
                    </div>
                </div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-card__body" style="text-align:center;padding:var(--space-4)">
                    <div style="font-size:32px;font-weight:800;color:var(--color-accent)">${totHrs.toFixed(1)}</div>
                    <div style="font-weight:600">Hours Studied</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">avg ${Math.round(avgMins)} min/session</div>
                </div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-card__body" style="text-align:center;padding:var(--space-4)">
                    <div style="font-size:32px;font-weight:800">${bookings.total}</div>
                    <div style="font-weight:600">Bookings</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${bookings.confirmed} confirmed · ${bookings.cancelled} cancelled</div>
                </div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-card__body" style="text-align:center;padding:var(--space-4)">
                    <div style="font-size:32px;font-weight:800;color:var(--color-warning)">🏆 ${achievements.total}</div>
                    <div style="font-weight:600">Achievements</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">badges earned</div>
                </div>
            </div>
        </div>

        <!-- Status controls -->
        <div class="dashboard-card" style="margin-bottom:var(--space-5)">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">Account Actions</h3>
            </div>
            <div class="dashboard-card__body">
                <div style="display:flex;flex-wrap:wrap;gap:var(--space-3)">
                    ${st !== 'active'    ? `<button class="btn btn--accent btn--sm"  onclick="closeUserAnalyticsModal();setUserStatus('${userId}','active')">✅ Activate Account</button>` : ''}
                    ${st !== 'suspended' ? `<button class="btn btn--secondary btn--sm" onclick="closeUserAnalyticsModal();setUserStatus('${userId}','suspended')">⏸ Suspend Account</button>` : ''}
                    ${st !== 'banned'    ? `<button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="closeUserAnalyticsModal();setUserStatus('${userId}','banned')">🚫 Ban Account</button>` : ''}
                    <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="closeUserAnalyticsModal();deleteAdminUser('${userId}','${user.first_name} ${user.last_name}')">🗑 Delete Account</button>
                </div>
            </div>
        </div>

        <!-- Recent sessions -->
        <div class="dashboard-card">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">Recent Study Sessions</h3>
            </div>
            ${recentSessions.length === 0
                ? `<div class="dashboard-card__body" style="text-align:center;color:var(--color-text-muted)">No sessions recorded yet.</div>`
                : `<div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                    <table class="data-table">
                        <thead><tr><th>Date</th><th>Duration</th><th>Status</th></tr></thead>
                        <tbody>
                            ${recentSessions.map(s => {
                                const mins = Math.max(0, Math.round(parseFloat(s.minutes) || 0));
                                const h = Math.floor(mins/60), m = mins%60;
                                return `<tr>
                                    <td>${new Date(s.started_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'2-digit'})}</td>
                                    <td>${h > 0 ? `${h}h ${m}m` : `${m}m`}</td>
                                    <td><span class="badge badge--${s.ended_at ? 'success' : 'warning'}">${s.ended_at ? 'completed' : 'active'}</span></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`
            }
        </div>
    `;
}
