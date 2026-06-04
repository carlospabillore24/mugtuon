function renderSidebar() {
    const user = Store.get('user');
    if (!user) return '';
    const currentPath = Router.currentPath || '/dashboard';

    const sidebarLink = (href, icon, label) =>
        `<a href="${href}" data-link class="sidebar__link ${currentPath === href ? 'active' : ''}">
            <span class="sidebar__link-icon">${icon}</span>
            <span>${label}</span>
        </a>`;

    const adminLinks = Store.isStaff ? `
        <div class="sidebar__section">
            <div class="sidebar__section-label">Administration</div>
            ${sidebarLink('/admin', '📊', 'Admin Dashboard')}
            ${sidebarLink('/admin/users', '👥', 'User Management')}
            ${sidebarLink('/admin/bookings', '📋', 'All Bookings')}
            ${sidebarLink('/admin/spaces', '🏢', 'Spaces')}
            ${sidebarLink('/admin/plans', '💎', 'Pricing Plans')}
            ${sidebarLink('/admin/analytics', '📈', 'Analytics')}
            ${sidebarLink('/admin/payments', '💳', 'Payments')}
            ${sidebarLink('/admin/payment-settings', '⚙️', 'Payment Settings')}
            ${sidebarLink('/admin/contact', '✉️', 'Contact Messages')}
            ${sidebarLink('/admin/achievements', '🏅', 'Achievements')}
            ${sidebarLink('/admin/announcements', '📢', 'Announcements')}
            ${sidebarLink('/admin/audit', '📜', 'Audit Log')}
            ${sidebarLink('/admin/site-settings', '⚙️', 'Site Settings')}
            <div id="admin-notif-badge" style="margin-top:var(--space-3);padding:0 var(--space-4)"></div>
        </div>
    ` : '';

    return `
    <aside class="sidebar" id="sidebar">
        <div class="sidebar__header">
            <img src="images/logo-icon.png" alt="MugTuon" style="width:32px;height:32px;border-radius:50%;object-fit:cover">
            <span class="sidebar__logo">MugTuon</span>
        </div>

        <nav class="sidebar__nav" aria-label="Main navigation">
            <div class="sidebar__section">
                <div class="sidebar__section-label">Main</div>
                ${sidebarLink('/dashboard', '🏠', 'Dashboard')}
                ${sidebarLink('/bookings', '📅', 'Bookings')}
                ${sidebarLink('/leaderboard', '🏆', 'Leaderboard')}
                ${sidebarLink('/achievements', '🏅', 'Achievements')}
                ${sidebarLink('/analytics', '📊', 'My Analytics')}
            </div>

            <div id="user-announcements-sidebar" style="padding:0 var(--space-4)"></div>

            <div class="sidebar__section">
                <div class="sidebar__section-label">Account</div>
                ${sidebarLink('/profile', '👤', 'Profile')}
                ${sidebarLink('/subscription', '💎', 'Subscription')}
            </div>

            ${adminLinks}
        </nav>

        <div class="sidebar__footer">
            <div class="sidebar__user" onclick="Router.navigate('/profile')">
                ${user.avatar_url
                ? `<img src="${user.avatar_url}" alt="Avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover">`
                : `<div class="avatar avatar--sm">${Helpers.getInitials(user.first_name, user.last_name)}</div>`}
                <div class="sidebar__user-info">
                    <div class="sidebar__user-name">${user.first_name} ${user.last_name}</div>
                    <div class="sidebar__user-role">${user.role}</div>
                </div>
            </div>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3)">
                <button class="btn btn--ghost btn--sm" style="flex:1" onclick="toggleTheme()" title="Toggle dark mode">
                    ${document.documentElement.dataset.theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                </button>
                <button class="btn btn--ghost btn--sm" style="flex:1" onclick="Store.logout(); Router.navigate('/')" aria-label="Sign out">
                    Sign out
                </button>
            </div>
        </div>
    </aside>
    `;
}

function loadAdminNotifications() {
    if (!Store.isStaff) return;
    (async () => {
        try {
            const [contactData, paymentsData] = await Promise.all([
                API.get('/admin/contact?unread=true&limit=1').catch(() => ({ total: 0 })),
                API.get('/admin/payments?limit=1').catch(() => ({ summary: { pending_count: 0 } })),
            ]);
            const unread = parseInt(contactData.total) || 0;
            const pending = parseInt(paymentsData.summary?.pending_count) || 0;
            const el = document.getElementById('admin-notif-badge');
            if (!el) return;
            const items = [];
            if (unread > 0) items.push(`<a href="/admin/contact" data-link style="font-size:var(--text-xs);color:var(--color-warning)">✉️ ${unread} unread message${unread > 1 ? 's' : ''}</a>`);
            if (pending > 0) items.push(`<a href="/admin/payments" data-link style="font-size:var(--text-xs);color:var(--color-warning)">💳 ${pending} pending payment${pending > 1 ? 's' : ''}</a>`);
            el.innerHTML = items.length > 0 ? items.join('<br>') : '';
        } catch(e) {}
    })();
}

function loadUserAnnouncements() {
    if (!Store.isLoggedIn) return;
    (async () => {
        try {
            const announcements = await API.get('/analytics/announcements');
            const el = document.getElementById('user-announcements-sidebar');
            if (!el || !announcements.length) { if (el) el.innerHTML = ''; return; }
            const priorityIcon = { info: '📢', warning: '⚠️', urgent: '🚨' };
            const priorityBg = { info: 'var(--color-accent-light, rgba(54,114,103,0.08))', warning: 'rgba(255,193,7,0.1)', urgent: 'rgba(220,53,69,0.1)' };
            el.innerHTML = announcements.slice(0, 3).map(a => `
                <div style="background:${priorityBg[a.priority]||priorityBg.info};border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-2);font-size:var(--text-xs)">
                    <div style="font-weight:var(--weight-semibold);margin-bottom:2px">${priorityIcon[a.priority]||'📢'} ${Helpers.esc(a.title)}</div>
                    <div style="color:var(--color-text-muted);line-height:1.4">${Helpers.esc(a.message).substring(0, 100)}${a.message.length > 100 ? '...' : ''}</div>
                </div>
            `).join('');
        } catch(e) {}
    })();
}

function renderAppLayout(pageContent, pageTitle, pageDesc) {
    return `
        ${renderSidebar()}
        <main class="main-content" id="main-content" role="main">
            <div class="page-header">
                <button class="btn btn--icon sidebar-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')" aria-label="Toggle sidebar menu" style="margin-bottom:var(--space-3)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                </button>
                <h1 class="page-header__title">${pageTitle}</h1>
                ${pageDesc ? `<p class="page-header__desc">${pageDesc}</p>` : ''}
            </div>
            <div class="page-body">
                ${pageContent}
            </div>
        </main>
    `;
}
