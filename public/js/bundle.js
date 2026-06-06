/* MugTuon Bundle — generated 2026-06-06 13:50:53 */

// ── js/utils/store.js ──
const Store = {
    _state: {
        user: JSON.parse(localStorage.getItem('mugtuon_user') || sessionStorage.getItem('mugtuon_user') || 'null'),
        activeSession: null,
        timerRunning: false,
        timerSeconds: 0,
        timerMode: 'pomodoro',
    },

    _listeners: [],

    get(key) {
        return this._state[key];
    },

    set(key, value) {
        this._state[key] = value;
        this._listeners.forEach(fn => fn(key, value));
    },

    subscribe(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(l => l !== fn);
        };
    },

    get isLoggedIn() {
        return !!this._state.user;
    },

    get isAdmin() {
        return this._state.user?.role === 'admin';
    },

    get isStaff() {
        return ['admin', 'staff'].includes(this._state.user?.role);
    },

    login(user, remember = true) {
        this.set('user', user);
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem('mugtuon_user', JSON.stringify(user));
        if (!remember) {
            localStorage.removeItem('mugtuon_user');
        }
    },

    initTheme() {
        const saved = localStorage.getItem('mugtuon_theme');
        if (saved) document.documentElement.dataset.theme = saved;
    },

    logout() {
        if (typeof Timer !== 'undefined') Timer.init();
        const base = (document.querySelector('base')?.getAttribute('href')?.replace(/\/$/, '') || '') + '/api';
        fetch(base + '/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
        this.set('user', null);
        this.set('activeSession', null);
        localStorage.removeItem('mugtuon_user');
        sessionStorage.removeItem('mugtuon_user');
        // Clean up legacy token storage
        localStorage.removeItem('mugtuon_token');
        sessionStorage.removeItem('mugtuon_token');
    }
};

Store.initTheme();

function toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    if (next === 'light') {
        delete document.documentElement.dataset.theme;
        localStorage.removeItem('mugtuon_theme');
    } else {
        document.documentElement.dataset.theme = 'dark';
        localStorage.setItem('mugtuon_theme', 'dark');
    }
    document.querySelectorAll('[onclick="toggleTheme()"]').forEach(btn => {
        const isDark = next === 'dark';
        if (btn.textContent.includes('Light') || btn.textContent.includes('Dark')) {
            btn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
        } else {
            btn.textContent = isDark ? '☀️' : '🌙';
        }
    });
}


// ── js/utils/api.js ──
const API = {
    base: (document.querySelector('base')?.getAttribute('href')?.replace(/\/$/, '') || '') + '/api',

    async request(endpoint, options = {}) {
        const headers = { 'Content-Type': 'application/json' };

        const res = await fetch(`${this.base}${endpoint}`, {
            ...options,
            credentials: 'same-origin',
            headers: { ...headers, ...options.headers }
        });

        if (res.status === 401 && !endpoint.startsWith('/auth/')) {
            Store.logout();
            Router.navigate('/login');
            throw new Error('Session expired');
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    get(endpoint) {
        return this.request(endpoint);
    },

    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
    },

    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};


// ── js/utils/helpers.js ──
const Helpers = {
    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    },

    formatDuration(minutes) {
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    },

    formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    },

    formatCurrency(amount) {
        return `₱${parseFloat(amount).toFixed(2)}`;
    },

    billingLabel(period) {
        const labels = { yearly: '/yr', quarterly: '/qtr', monthly: '/mo' };
        return labels[period] || '/mo';
    },

    getInitials(firstName, lastName) {
        return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
    },

    getLevel(xp) {
        return Math.max(1, Math.floor(xp / 1000) + 1);
    },

    getLevelProgress(xp) {
        return (xp % 1000) / 1000 * 100;
    },

    showToast(title, message, type = 'info') {
        const container = document.getElementById('toasts');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type} toast--entering`;
        toast.innerHTML = `
            <div class="toast__title">${Helpers.esc(title)}</div>
            <div class="toast__message">${Helpers.esc(message)}</div>
        `;
        container.appendChild(toast);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => { toast.classList.remove('toast--entering'); });
        });
        setTimeout(() => {
            toast.classList.add('toast--exiting');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    observeReveal() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.reveal').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                el.style.transition = 'none';
                el.classList.add('visible');
                void el.offsetHeight;
                el.style.transition = '';
            } else {
                observer.observe(el);
            }
        });
        return observer;
    },

    animateCounter(el, target, duration = 1500) {
        let start = 0;
        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    },

    generateMockChartBars(count = 7) {
        return Array.from({ length: count }, () => 20 + Math.random() * 75);
    },

    getPasswordStrength(pw) {
        if (!pw) return { score: 0, label: '', color: '' };
        let score = 0;
        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[^a-zA-Z0-9]/.test(pw)) score++;
        const levels = [
            { label: '', color: '' },
            { label: 'Weak', color: 'var(--color-error)' },
            { label: 'Fair', color: 'var(--color-warning)' },
            { label: 'Good', color: 'var(--color-warning)' },
            { label: 'Strong', color: 'var(--color-success)' },
            { label: 'Very strong', color: 'var(--color-success)' },
        ];
        return { score, ...levels[score] };
    },

    renderPasswordStrength(inputId, containerId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.addEventListener('input', () => {
            const el = document.getElementById(containerId);
            if (!el) return;
            const s = Helpers.getPasswordStrength(input.value);
            if (!input.value) { el.innerHTML = ''; return; }
            el.innerHTML = `<div style="display:flex;align-items:center;gap:var(--space-2);margin-top:4px">
                <div style="flex:1;height:4px;background:var(--color-border);border-radius:2px;overflow:hidden">
                    <div style="height:100%;width:${s.score*20}%;background:${s.color};transition:width .2s"></div>
                </div>
                <span style="font-size:11px;color:${s.color};white-space:nowrap">${s.label}</span>
            </div>`;
        });
    },

    renderSkeleton(type = 'dashboard') {
        const shimmer = 'background:linear-gradient(90deg,var(--color-border) 25%,var(--color-border-light) 50%,var(--color-border) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite';
        const bar = (w, h, mb) => `<div style="height:${h}px;width:${w};border-radius:6px;${shimmer};margin-bottom:${mb || 12}px"></div>`;

        if (type === 'dashboard') {
            return `
            <style>@keyframes shimmer{0%{background-position:200% 0}to{background-position:-200% 0}}</style>
            <div class="dashboard-stats">
                ${[1,2,3,4].map(() => `<div class="dashboard-stat-card" style="min-height:120px">
                    <div class="dashboard-stat-card__header">${bar('50%', 14)}${bar('24px', 24, 0)}</div>
                    ${bar('40%', 32)}${bar('60%', 12)}
                </div>`).join('')}
            </div>
            <div class="dashboard-grid" style="margin-top:var(--space-6)">
                <div class="dashboard-card" style="min-height:300px"><div class="dashboard-card__body">${bar('40%',16)}${bar('100%',200)}</div></div>
                <div class="dashboard-card" style="min-height:300px"><div class="dashboard-card__body">${bar('50%',16)}${bar('100%',200)}</div></div>
            </div>`;
        }
        if (type === 'table') {
            return `
            <style>@keyframes shimmer{0%{background-position:200% 0}to{background-position:-200% 0}}</style>
            <div class="dashboard-card"><div class="dashboard-card__body" style="padding:0">
                ${[1,2,3,4,5].map(() => `<div style="padding:16px 20px;border-bottom:1px solid var(--color-border-light);display:flex;gap:16px;align-items:center">
                    <div style="width:36px;height:36px;border-radius:50%;${shimmer};flex-shrink:0"></div>
                    <div style="flex:1">${bar('60%',14,6)}${bar('40%',10)}</div>
                    ${bar('60px',24,0)}
                </div>`).join('')}
            </div></div>`;
        }
        return `<style>@keyframes shimmer{0%{background-position:200% 0}to{background-position:-200% 0}}</style>
                <div style="padding:var(--space-8)">${bar('50%',20)}${bar('100%',16)}${bar('80%',16)}${bar('100%',200)}</div>`;
    },

    confirmAction(title, message, { confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' } = {}) {
        return new Promise((resolve) => {
            const id = 'confirm-modal-' + Date.now();
            const iconMap = { warning: '⚠️', danger: '🗑️', info: 'ℹ️' };
            const btnClass = type === 'danger' ? 'btn--error' : 'btn--accent';
            const overlay = document.createElement('div');
            overlay.id = id;
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1200;display:flex;align-items:center;justify-content:center;padding:var(--space-4);animation:fadeIn .15s ease';
            overlay.innerHTML = `
                <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:400px;box-shadow:var(--shadow-xl)" onclick="event.stopPropagation()">
                    <div style="padding:var(--space-6);text-align:center">
                        <div style="font-size:32px;margin-bottom:var(--space-3)">${iconMap[type] || '⚠️'}</div>
                        <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold);margin-bottom:var(--space-2)">${Helpers.esc(title)}</h3>
                        <p style="font-size:var(--text-sm);color:var(--color-text-secondary)">${Helpers.esc(message)}</p>
                    </div>
                    <div style="padding:0 var(--space-6) var(--space-6);display:flex;gap:var(--space-3)">
                        <button class="btn btn--outline" style="flex:1" data-action="cancel">${Helpers.esc(cancelText)}</button>
                        <button class="btn ${btnClass}" style="flex:1" data-action="confirm">${Helpers.esc(confirmText)}</button>
                    </div>
                </div>`;
            const close = (result) => { overlay.remove(); resolve(result); };
            overlay.onclick = () => close(false);
            overlay.querySelector('[data-action="cancel"]').onclick = () => close(false);
            overlay.querySelector('[data-action="confirm"]').onclick = () => close(true);
            overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(false); });
            document.body.appendChild(overlay);
            overlay.querySelector('[data-action="confirm"]').focus();
        });
    },

    renderAvatar(url, firstName, lastName, size = 'sm') {
        const initials = Helpers.getInitials(firstName, lastName);
        const sizeMap = { sm: 32, md: 48, lg: 56, xl: 80 };
        const px = sizeMap[size] || 32;
        if (!url) return `<div class="avatar avatar--${size}">${initials}</div>`;
        return `<img src="${Helpers.esc(url)}" alt="Avatar" style="width:${px}px;height:${px}px;border-radius:50%;object-fit:cover" onerror="this.outerHTML=this.getAttribute('data-fallback')" data-fallback="<div class='avatar avatar--${size}'>${initials}</div>">`;
    },

    renderBarChart(bars, labels, options = {}) {
        const color = options.color || 'var(--color-accent)';
        const height = options.height || '240px';
        return `
        <div class="chart-container" style="height:${height}">
            ${bars.map((h, i) => `
                <div class="chart-col">
                    <div class="chart-col__bar-area">
                        <div class="chart-bar" style="height:${h}%;background:${color}"></div>
                    </div>
                    ${labels && labels[i] ? `<span class="chart-col__label">${labels[i]}</span>` : ''}
                </div>
            `).join('')}
        </div>`;
    }
};


// ── js/router.js ──
const Router = {
    routes: {},
    currentPath: null,
    pageTitles: {
        '/': 'Home',
        '/about': 'About',
        '/pricing': 'Pricing',
        '/contact': 'Contact',
        '/login': 'Sign In',
        '/register': 'Create Account',
        '/forgot-password': 'Forgot Password',
        '/reset-password': 'Reset Password',
        '/verify-email': 'Verify Email',
        '/terms': 'Terms of Service',
        '/privacy': 'Privacy Policy',
        '/checkout': 'Checkout',
        '/dashboard': 'Dashboard',
        '/profile': 'Profile',
        '/subscription': 'Subscription',
        '/bookings': 'Bookings',
        '/leaderboard': 'Leaderboard',
        '/achievements': 'Achievements',
        '/analytics': 'My Analytics',
        '/admin': 'Admin Dashboard',
        '/admin/users': 'User Management',
        '/admin/bookings': 'All Bookings',
        '/admin/analytics': 'Analytics',
        '/admin/payments': 'Payments',
        '/admin/spaces': 'Spaces',
        '/admin/plans': 'Pricing Plans',
        '/admin/payment-settings': 'Payment Settings',
        '/admin/contact': 'Contact Messages',
        '/admin/achievements': 'Achievements & Challenges',
        '/admin/announcements': 'Announcements',
        '/admin/audit': 'Audit Log',
        '/admin/site-settings': 'Site Settings',
    },

    register(path, handler) {
        this.routes[path] = handler;
    },

    basePath: (() => {
        const base = document.querySelector('base')?.getAttribute('href') || '';
        return base.replace(/\/$/, '');
    })(),

    navigate(path) {
        if (path === this.currentPath) return;
        history.pushState(null, '', this.basePath + path);
        this.resolve(path);
    },

    getQuery() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [k, v] of params.entries()) result[k] = v;
        return result;
    },

    resolve(path) {
        path = path || (window.location.pathname + window.location.search);
        if (this.basePath && path.startsWith(this.basePath)) {
            path = path.slice(this.basePath.length) || '/';
        }
        this.currentPath = path;

        const pathname = path.split('?')[0];

        const protectedPaths = ['/dashboard', '/profile', '/bookings', '/leaderboard', '/achievements', '/analytics', '/subscription', '/checkout'];
        const adminPaths = ['/admin'];

        if (protectedPaths.some(p => pathname.startsWith(p)) && !Store.isLoggedIn) {
            return this.navigate('/login');
        }
        if (adminPaths.some(p => pathname.startsWith(p)) && !Store.isStaff) {
            return this.navigate('/login');
        }
        if ((pathname === '/login' || pathname === '/register') && Store.isLoggedIn) {
            return this.navigate('/dashboard');
        }

        const loader = document.getElementById('route-loader');
        if (loader) loader.classList.add('active');

        const handler = this.routes[pathname];
        const app = document.getElementById('app');
        app.innerHTML = '';

        const pageTitle = this.pageTitles[pathname];
        document.title = pageTitle ? `${pageTitle} | MugTuon` : 'MugTuon Learning Hub & Cafe';

        if (handler) {
            handler(app);
        } else {
            document.title = 'Page Not Found | MugTuon';
            render404Page(app);
        }
        window.scrollTo(0, 0);

        if (loader) setTimeout(() => loader.classList.remove('active'), 300);

        const mainContent = app.querySelector('.main-content, .page-body') || app;
        if (mainContent && mainContent.getAttribute('tabindex') === null) {
            mainContent.setAttribute('tabindex', '-1');
        }
        if (mainContent) mainContent.focus({ preventScroll: true });
        if (typeof loadAdminNotifications === 'function') setTimeout(loadAdminNotifications, 300);
        if (typeof loadUserAnnouncements === 'function') setTimeout(loadUserAnnouncements, 500);
    },

    init() {
        window.addEventListener('popstate', () => this.resolve());

        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-link]');
            if (link) {
                e.preventDefault();
                this.navigate(link.getAttribute('href'));
            }
        });

        this.resolve();
    }
};


// ── js/components/header.js ──
function renderHeader(isPublic = true) {
    const user = Store.get('user');

    if (!isPublic && user) return '';

    const currentPath = Router.currentPath || '/';
    const link = (href, label) =>
        `<a href="${href}" data-link class="header__link ${currentPath === href ? 'active' : ''}">${label}</a>`;

    return `
    <header class="header" id="mainHeader">
        <div class="header__inner">
            <a href="/" data-link class="header__logo">
                <img src="images/logo-icon.png" alt="MugTuon" class="header__logo-img" style="height:36px;width:36px;border-radius:50%;object-fit:cover">
                <span>MugTuon</span>
            </a>

            <nav class="header__nav" aria-label="Site navigation">
                ${link('/', 'Home')}
                ${link('/spaces', 'Spaces')}
                ${link('/about', 'About')}
                ${link('/pricing', 'Pricing')}
                ${link('/contact', 'Contact')}
            </nav>

            <div class="header__actions">
                <button class="btn btn--ghost btn--sm" onclick="toggleTheme()" title="Toggle dark mode" aria-label="Toggle dark mode" style="font-size:16px;padding:6px 10px">
                    ${document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙'}
                </button>
                ${user ? `
                    <a href="/dashboard" data-link class="btn btn--ghost">Dashboard</a>
                    <button class="btn btn--primary btn--sm" onclick="Store.logout(); Router.navigate('/')">Logout</button>
                ` : `
                    <a href="/login" data-link class="btn btn--ghost">Sign in</a>
                    <a href="/register" data-link class="btn btn--primary">Get Started</a>
                `}
            </div>

            <button class="header__mobile-toggle" onclick="toggleMobileNav()" aria-label="Menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>
        </div>
    </header>

    <div class="mobile-nav" id="mobileNav">
        <a href="/" data-link class="mobile-nav__link" onclick="closeMobileNav()">Home</a>
        <a href="/spaces" data-link class="mobile-nav__link" onclick="closeMobileNav()">Spaces</a>
        <a href="/about" data-link class="mobile-nav__link" onclick="closeMobileNav()">About</a>
        <a href="/pricing" data-link class="mobile-nav__link" onclick="closeMobileNav()">Pricing</a>
        <a href="/contact" data-link class="mobile-nav__link" onclick="closeMobileNav()">Contact</a>
        <hr class="divider">
        ${user ? `
            <a href="/dashboard" data-link class="mobile-nav__link" onclick="closeMobileNav()">Dashboard</a>
            <button class="btn btn--primary btn--full" onclick="Store.logout(); Router.navigate('/'); closeMobileNav()">Logout</button>
        ` : `
            <a href="/login" data-link class="mobile-nav__link" onclick="closeMobileNav()">Sign in</a>
            <a href="/register" data-link class="btn btn--primary btn--full" onclick="closeMobileNav()">Get Started</a>
        `}
    </div>
    `;
}

function toggleMobileNav() {
    document.getElementById('mobileNav').classList.toggle('open');
}

function closeMobileNav() {
    document.getElementById('mobileNav').classList.remove('open');
}

function initHeaderScroll() {
    const header = document.getElementById('mainHeader');
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
}


// ── js/components/footer.js ──
function renderFooter() {
    return `
    <footer class="footer">
        <div class="container">
            <div class="footer__grid">
                <div class="footer__brand">
                    <div class="footer__brand-name" style="display:flex;align-items:center;gap:8px"><img src="images/logo-icon.png" alt="" style="height:28px;width:28px;border-radius:50%;flex-shrink:0">MugTuon</div>
                    <p class="footer__brand-desc">
                        Your premium study hub and coworking space. Track productivity, join the community, and achieve your goals in a focused environment.
                    </p>
                </div>

                <div>
                    <h4 class="footer__col-title">Platform</h4>
                    <ul class="footer__links">
                        <li><a href="/pricing" data-link>Pricing</a></li>
                        <li><a href="/bookings" data-link>Book a Space</a></li>
                        <li><a href="/leaderboard" data-link>Leaderboards</a></li>
                        <li><a href="/about" data-link>About Us</a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="footer__col-title">Features</h4>
                    <ul class="footer__links">
                        <li><a href="/dashboard" data-link>Study Timer</a></li>
                        <li><a href="/analytics" data-link>Productivity Analytics</a></li>
                        <li><a href="/leaderboard" data-link>Community</a></li>
                        <li><a href="/achievements" data-link>Achievements</a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="footer__col-title">Support</h4>
                    <ul class="footer__links">
                        <li><a href="/contact" data-link>Contact Us</a></li>
                        <li><a href="/about" data-link>About Us</a></li>
                        <li><a href="/privacy" data-link>Privacy Policy</a></li>
                        <li><a href="/terms" data-link>Terms of Service</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer__bottom">
                <span>&copy; ${new Date().getFullYear()} MugTuon Learning Hub & Cafe. All rights reserved.</span>
                <span>Built with ☕ and focus</span>
            </div>
        </div>
    </footer>
    `;
}


// ── js/components/sidebar.js ──
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
                ${Helpers.renderAvatar(user.avatar_url, user.first_name, user.last_name, 'sm')}
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


// ── js/components/timer.js ──
const Timer = {
    interval:       null,
    seconds:        0,
    mode:           'pomodoro',
    running:        false,
    sessionId:      null,
    pomodoroLength: 25 * 60,
    breakLength:    5 * 60,

    // ── Focus tracking ──────────────────────────────────────────────────
    _focusedMs:     0,
    _unfocusedMs:   0,
    _lastFocusTick: null,
    _tabVisible:    true,
    _idleTimeout:   null,
    _isIdle:        false,
    _idleThreshold: 60000,  // 60 seconds of no activity = idle

    _initFocusTracking() {
        this._focusedMs     = 0;
        this._unfocusedMs   = 0;
        this._lastFocusTick = Date.now();
        this._tabVisible    = !document.hidden;
        this._isIdle        = false;

        this._onVisChange = () => {
            this._flushFocusTick();
            this._tabVisible = !document.hidden;
            this._lastFocusTick = Date.now();
        };
        this._onActivity = () => {
            if (this._isIdle) {
                this._flushFocusTick();
                this._isIdle = false;
                this._lastFocusTick = Date.now();
            }
            clearTimeout(this._idleTimeout);
            this._idleTimeout = setTimeout(() => {
                if (this.running) {
                    this._flushFocusTick();
                    this._isIdle = true;
                    this._lastFocusTick = Date.now();
                }
            }, this._idleThreshold);
        };

        document.addEventListener('visibilitychange', this._onVisChange);
        document.addEventListener('mousemove', this._onActivity);
        document.addEventListener('keydown', this._onActivity);
        document.addEventListener('click', this._onActivity);
        document.addEventListener('scroll', this._onActivity);
    },

    _flushFocusTick() {
        if (!this._lastFocusTick) return;
        const now = Date.now();
        const elapsed = now - this._lastFocusTick;
        if (this._tabVisible && !this._isIdle) {
            this._focusedMs += elapsed;
        } else {
            this._unfocusedMs += elapsed;
        }
        this._lastFocusTick = now;
    },

    _stopFocusTracking() {
        this._flushFocusTick();
        document.removeEventListener('visibilitychange', this._onVisChange);
        document.removeEventListener('mousemove', this._onActivity);
        document.removeEventListener('keydown', this._onActivity);
        document.removeEventListener('click', this._onActivity);
        document.removeEventListener('scroll', this._onActivity);
        clearTimeout(this._idleTimeout);
    },

    _calculateFocusScore() {
        const total = this._focusedMs + this._unfocusedMs;
        if (total === 0) return 85;
        const raw = Math.round((this._focusedMs / total) * 100);
        return Math.max(10, Math.min(100, raw));
    },

    // ── Storage ─────────────────────────────────────────────────────────
    _save() {
        if (typeof Store === 'undefined' || !Store.isLoggedIn) return;
        try {
            localStorage.setItem('mugtuon_timer', JSON.stringify({
                seconds:   this.seconds,
                mode:      this.mode,
                running:   this.running,
                savedAt:   this.running ? Date.now() : null,
                sessionId: this.sessionId || null,
            }));
        } catch {}
    },

    _restore() {
        try {
            const raw = localStorage.getItem('mugtuon_timer');
            if (!raw) return false;
            const data = JSON.parse(raw);
            this.mode      = data.mode || 'pomodoro';
            this.sessionId = data.sessionId || null;
            if (data.running && data.savedAt) {
                const elapsed = Math.floor((Date.now() - data.savedAt) / 1000);
                this.seconds = Math.max(0, (data.seconds || 0) - elapsed);
            } else {
                this.seconds = data.seconds || this.getModeLength();
            }
            return !!data.running;
        } catch {
            return false;
        }
    },

    // ── resume() — call on EVERY dashboard render (NOT init) ───────────
    resume() {
        if (this.interval !== null) {
            this.updateDisplay();
            return;
        }
        const wasRunning = this._restore();
        if (wasRunning) {
            if (this.seconds <= 0) {
                this.complete();
            } else {
                this._startTicking();
            }
        } else {
            this.updateDisplay();
        }
    },

    // ── init() — call ONLY on logout ────────────────────────────────────
    init() {
        clearInterval(this.interval);
        this.interval  = null;
        this.running   = false;
        this.seconds   = 0;
        this.mode      = 'pomodoro';
        this.sessionId = null;
        try { localStorage.removeItem('mugtuon_timer'); } catch {}
        Store.set('timerRunning', false);
        Store.set('timerSeconds', 0);
        Store.set('timerMode',    'pomodoro');
        this.updateDisplay();
    },

    // ── Core controls ────────────────────────────────────────────────────
    getModeLength() {
        switch (this.mode) {
            case 'pomodoro':    return this.pomodoroLength;
            case 'deep_work':   return 90 * 60;
            case 'short_break': return this.breakLength;
            default:            return this.pomodoroLength;
        }
    },

    async start() {
        if (this.running) return;
        this.running = true;
        this.seconds = this.seconds || this.getModeLength();
        Store.set('timerRunning', true);

        if (this.mode !== 'short_break') {
            this._initFocusTracking();
        }

        if (!this.sessionId && this.mode !== 'short_break' && Store.isLoggedIn) {
            try {
                const session = await API.post('/sessions/start', { sessionType: this.mode });
                this.sessionId = session.id;
            } catch(e) { /* non-blocking */ }
        }

        this._startTicking();
    },

    _startTicking() {
        this._save();
        this.interval = setInterval(() => {
            this.seconds--;
            Store.set('timerSeconds', this.seconds);
            if (this.seconds % 5 === 0) this._save();
            this.updateDisplay();
            if (this.seconds <= 0) this.complete();
        }, 1000);
        this.updateDisplay();
    },

    pause() {
        this.running = false;
        Store.set('timerRunning', false);
        clearInterval(this.interval);
        this.interval = null;
        this._flushFocusTick();
        this._save();
        this.updateDisplay();
    },

    async reset() {
        const wasRunning = this.running;
        clearInterval(this.interval);
        this.interval = null;
        this.running  = false;
        Store.set('timerRunning', false);

        if (wasRunning && this.sessionId && Store.isLoggedIn) {
            this._stopFocusTracking();
            const partialScore = Math.max(10, Math.round(this._calculateFocusScore() * 0.6));
            await this._endSession(partialScore);
        } else {
            this._stopFocusTracking();
        }

        this.seconds = this.getModeLength();
        Store.set('timerSeconds', this.seconds);
        this._save();
        this.updateDisplay();
    },

    setMode(mode) {
        const wasRunning = this.running;
        if (wasRunning && this.sessionId && Store.isLoggedIn) {
            this._stopFocusTracking();
            const partialScore = Math.max(10, Math.round(this._calculateFocusScore() * 0.6));
            this._endSession(partialScore);
        } else {
            this._stopFocusTracking();
        }
        clearInterval(this.interval);
        this.interval  = null;
        this.running   = false;
        this.sessionId = null;
        this.mode      = mode;
        Store.set('timerMode', mode);
        this.seconds = this.getModeLength();
        Store.set('timerSeconds', this.seconds);
        Store.set('timerRunning', false);
        this._save();
        this.updateDisplay();
    },

    async complete() {
        clearInterval(this.interval);
        this.interval = null;
        this.running  = false;
        Store.set('timerRunning', false);
        try { localStorage.removeItem('mugtuon_timer'); } catch {}

        this._stopFocusTracking();
        const realScore = this._calculateFocusScore();

        if (this.sessionId && Store.isLoggedIn) {
            await this._endSession(realScore);
        } else {
            Helpers.showToast(
                'Session Complete!',
                `Your ${this.mode.replace(/_/g, ' ')} session is done.`,
                'success'
            );
        }

        this.seconds = this.getModeLength();
        this.updateDisplay();
    },

    async _endSession(focusScore) {
        if (!this.sessionId) return;
        const sid = this.sessionId;
        this.sessionId = null;
        try {
            const result = await API.put(`/sessions/${sid}/end`, { focusScore });
            if (result && result.xp_earned) {
                const totalXP = result.xp_earned + (result.bonus_xp || 0);
                const user = Store.get('user');
                if (user) {
                    user.xp = (user.xp || 0) + totalXP;
                    Store.set('user', user);
                    localStorage.setItem('mugtuon_user', JSON.stringify(user));
                }

                let msg = `+${result.xp_earned} XP earned!`;
                if (result.bonus_xp > 0) msg += ` +${result.bonus_xp} bonus XP!`;
                if (result.badges_earned && result.badges_earned.length > 0) {
                    const badges = result.badges_earned.map(b => `${b.icon} ${b.name}`).join(', ');
                    msg += ` Badge unlocked: ${badges}`;
                }
                Helpers.showToast('Session Complete!', msg, 'success');

                // Show individual badge toasts
                if (result.badges_earned) {
                    result.badges_earned.forEach((b, i) => {
                        setTimeout(() => {
                            Helpers.showToast('Achievement Unlocked!', `${b.icon} ${b.name} — +${b.xp} XP`, 'success');
                        }, (i + 1) * 1500);
                    });
                }
            }
        } catch(e) {
            Helpers.showToast(
                'Session Complete!',
                `Your ${this.mode.replace(/_/g, ' ')} session is done.`,
                'success'
            );
        }
    },

    // ── DOM sync ─────────────────────────────────────────────────────────
    updateDisplay() {
        const display = document.getElementById('timerDisplay');
        if (display) {
            display.textContent = Helpers.formatTime(this.seconds || this.getModeLength());
        }
        const startBtn = document.getElementById('timerStartBtn');
        const pauseBtn = document.getElementById('timerPauseBtn');
        if (startBtn) startBtn.style.display = this.running ? 'none' : '';
        if (pauseBtn) pauseBtn.style.display = this.running ? '' : 'none';

        document.querySelectorAll('.timer-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.mode);
        });

        const focusEl = document.getElementById('timerFocusScore');
        if (focusEl) {
            if (this.running && this.mode !== 'short_break') {
                this._flushFocusTick();
                this._lastFocusTick = Date.now();
                focusEl.style.display = 'block';
                focusEl.textContent = `Focus: ${this._calculateFocusScore()}%`;
            } else {
                focusEl.style.display = 'none';
            }
        }
    },

    // ── Widget HTML ──────────────────────────────────────────────────────
    renderWidget() {
        const time = Helpers.formatTime(this.seconds || this.getModeLength());
        const modeLabels = {
            pomodoro:    'Pomodoro',
            deep_work:   'Deep Work',
            short_break: 'Break',
        };

        return `
        <div class="timer-widget">
            <div style="display:inline-flex;gap:2px;background:var(--color-bg);border-radius:var(--radius-full);padding:3px;margin-bottom:var(--space-5)">
                <button class="timer-preview__mode-btn timer-mode-btn ${this.mode === 'pomodoro'    ? 'active' : ''}" data-mode="pomodoro"    onclick="Timer.setMode('pomodoro')">Pomodoro</button>
                <button class="timer-preview__mode-btn timer-mode-btn ${this.mode === 'deep_work'   ? 'active' : ''}" data-mode="deep_work"   onclick="Timer.setMode('deep_work')">Deep Work</button>
                <button class="timer-preview__mode-btn timer-mode-btn ${this.mode === 'short_break' ? 'active' : ''}" data-mode="short_break" onclick="Timer.setMode('short_break')">Break</button>
            </div>

            <div class="timer-widget__display" id="timerDisplay">${time}</div>
            <div class="timer-widget__session-type">${modeLabels[this.mode]} Session</div>
            <div id="timerFocusScore" style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1);display:${this.running && this.mode !== 'short_break' ? 'block' : 'none'}">Focus: —%</div>

            <div class="timer-widget__controls">
                <button class="btn btn--accent btn--lg" id="timerStartBtn" onclick="Timer.start()"
                        ${this.running ? 'style="display:none"' : ''}>
                    ▶ Start Focus
                </button>
                <button class="btn btn--outline btn--lg" id="timerPauseBtn" onclick="Timer.pause()"
                        ${!this.running ? 'style="display:none"' : ''}>
                    ⏸ Pause
                </button>
                <button class="btn btn--ghost" onclick="Timer.reset()">↺ Reset</button>
            </div>
        </div>
        `;
    }
};


// ── js/pages/home.js ──
function renderHomePage(app) {
    const barHeights = Helpers.generateMockChartBars(12);

    app.innerHTML = `
    ${renderHeader()}

    <section class="hero" style="position:relative;overflow:hidden">
        <img src="images/hero-cafe.jpg" alt="" id="heroParallaxBg" style="position:absolute;inset:0;width:100%;height:120%;object-fit:cover;z-index:0;will-change:transform">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(235,227,223,0.85) 0%,rgba(250,250,249,0.92) 100%);z-index:1"></div>
        <div class="container" style="position:relative;z-index:2">
            <div class="hero__inner">
                <div class="hero__content">
                    <div class="hero__eyebrow hero-animate" style="opacity:0;transform:translateY(12px)" id="hero-active-now">
                        <span style="width:8px;height:8px;border-radius:50%;background:#6bcb77;display:inline-block"></span>
                        <span id="hero-active-count">Study smarter, together</span>
                    </div>

                    <h1 class="hero__title hero-animate" style="opacity:0;transform:translateY(16px)">
                        Study Smarter,<br>
                        <span>Together.</span>
                    </h1>

                    <p class="hero__desc hero-animate" style="opacity:0;transform:translateY(16px)">
                        MugTuon is your premium study hub and coworking cafe. Book spaces, track your focus, compete on leaderboards, and fuel your productivity with great coffee.
                    </p>

                    <div class="hero__actions hero-animate" style="opacity:0;transform:translateY(16px)">
                        <a href="/register" data-link class="btn btn--accent btn--lg">Start for Free</a>
                        <a href="/pricing" data-link class="btn btn--outline btn--lg">View Plans</a>
                    </div>

                    <div class="hero__stats hero-animate" style="opacity:0;transform:translateY(16px)">
                        <div>
                            <div class="hero__stat-value" data-counter="0">&mdash;</div>
                            <div class="hero__stat-label">Active Members</div>
                        </div>
                        <div>
                            <div class="hero__stat-value" data-counter="0">&mdash;</div>
                            <div class="hero__stat-label">Study Hours Logged</div>
                        </div>
                        <div>
                            <div class="hero__stat-value" data-counter="0">&mdash;</div>
                            <div class="hero__stat-label">Bookings Today</div>
                        </div>
                    </div>
                </div>

                <div class="hero__visual hero-animate" style="opacity:0;transform:translateY(24px)">
                    <div class="hero__dashboard-preview">
                        <div class="mock-header">
                            <div class="mock-dots">
                                <div class="mock-dot mock-dot--red"></div>
                                <div class="mock-dot mock-dot--yellow"></div>
                                <div class="mock-dot mock-dot--green"></div>
                            </div>
                            <span style="font-size:12px;color:var(--color-text-muted)">Live Community</span>
                        </div>
                        <div class="mock-stats">
                            <div class="mock-stat-card">
                                <div class="mock-stat-card__label">Members</div>
                                <div class="mock-stat-card__value" id="hero-mock-members">—</div>
                            </div>
                            <div class="mock-stat-card">
                                <div class="mock-stat-card__label">Studying Now</div>
                                <div class="mock-stat-card__value" id="hero-mock-active">—</div>
                            </div>
                            <div class="mock-stat-card">
                                <div class="mock-stat-card__label">Study Hours</div>
                                <div class="mock-stat-card__value" id="hero-mock-hours">—</div>
                            </div>
                        </div>
                        <div class="mock-chart">
                            ${barHeights.map(h => `<div class="mock-bar" style="height:${h}%"></div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="section__header reveal">
                <div class="section__eyebrow">Features</div>
                <h2 class="section__title">Everything you need to focus</h2>
                <p class="section__desc">A complete productivity ecosystem designed for students and professionals who want to do their best work.</p>
            </div>

            <div class="features-grid">
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--booking">📅</div>
                    <h3 class="feature-card__title">Smart Booking</h3>
                    <p class="feature-card__desc">Reserve study seats, private rooms, and coworking spaces with real-time availability and QR check-in.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--gamify">🏆</div>
                    <h3 class="feature-card__title">Gamification</h3>
                    <p class="feature-card__desc">Earn XP, unlock achievements, maintain study streaks, and compete on leaderboards with the community.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--analytics">📊</div>
                    <h3 class="feature-card__title">Study Analytics</h3>
                    <p class="feature-card__desc">Track your productivity with detailed session analytics, focus scores, and study pattern insights.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--timer">⏱</div>
                    <h3 class="feature-card__title">Focus Timer</h3>
                    <p class="feature-card__desc">Built-in Pomodoro and Deep Work timers with session tracking and focus scoring.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--community">👥</div>
                    <h3 class="feature-card__title">Community Leaderboard</h3>
                    <p class="feature-card__desc">Compete on weekly and monthly leaderboards, maintain study streaks, and stay motivated alongside fellow learners.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--cafe">☕</div>
                    <h3 class="feature-card__title">Cafe & Workspace</h3>
                    <p class="feature-card__desc">Premium coffee and snacks available on-site to fuel your study sessions in a comfortable environment.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="live-stats">
        <div class="container">
            <div class="live-stats__grid">
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" data-counter="0">&mdash;</div>
                    <div class="live-stats__label">Active Members</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" data-counter="0">&mdash;</div>
                    <div class="live-stats__label">Total Study Hours</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" data-counter="0">&mdash;</div>
                    <div class="live-stats__label">Studying Right Now</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" data-counter="0">&mdash;</div>
                    <div class="live-stats__label">Bookings Today</div>
                </div>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="showcase__grid">
                <div class="showcase__content reveal">
                    <div class="section__eyebrow">Productivity Tools</div>
                    <h2 class="section__title" style="text-align:left">Built for deep focus</h2>
                    <p class="section__desc" style="text-align:left">Our integrated timer system helps you maintain focus with proven techniques like Pomodoro and Deep Work sessions.</p>

                    <div class="showcase__features">
                        <div class="showcase__feature">
                            <div class="showcase__feature-icon">⏱</div>
                            <div class="showcase__feature-text">
                                <h4>Pomodoro Mode</h4>
                                <p>25-minute focused sessions with 5-minute breaks. Proven to boost concentration.</p>
                            </div>
                        </div>
                        <div class="showcase__feature">
                            <div class="showcase__feature-icon">🧠</div>
                            <div class="showcase__feature-text">
                                <h4>Deep Work Mode</h4>
                                <p>90-minute uninterrupted sessions for complex tasks requiring sustained attention.</p>
                            </div>
                        </div>
                        <div class="showcase__feature">
                            <div class="showcase__feature-icon">📈</div>
                            <div class="showcase__feature-text">
                                <h4>Focus Analytics</h4>
                                <p>Track your productivity patterns with detailed session stats and focus scoring.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="reveal">
                    <div class="timer-preview">
                        <div class="timer-preview__mode">
                            <span class="timer-preview__mode-btn active">Pomodoro</span>
                            <span class="timer-preview__mode-btn">Deep Work</span>
                            <span class="timer-preview__mode-btn">Break</span>
                        </div>
                        <div class="timer-preview__time">18:42</div>
                        <div class="timer-preview__progress">
                            <div class="timer-preview__progress-fill"></div>
                        </div>
                        <div class="timer-preview__actions">
                            <span class="btn btn--accent">⏸ Pause</span>
                            <span class="btn btn--ghost">↺ Reset</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="section section--alt">
        <div class="container">
            <div class="section__header reveal">
                <div class="section__eyebrow">Testimonials</div>
                <h2 class="section__title">Loved by productive people</h2>
                <p class="section__desc">See what our community members have to say about their MugTuon experience.</p>
            </div>

            <div class="testimonials-grid" id="testimonials-grid"></div>
        </div>
    </section>

    <section class="section" id="pricing">
        <div class="container">
            <div class="section__header reveal">
                <div class="section__eyebrow">Pricing</div>
                <h2 class="section__title">Simple, transparent pricing</h2>
                <p class="section__desc">Choose the plan that fits your study style. Upgrade or downgrade anytime.</p>
            </div>

            <div class="pricing-grid" id="home-pricing-grid">
                ${[1,2,3].map((_, i) => `
                <div class="pricing-card ${i === 1 ? 'pricing-card--featured' : ''} reveal" style="opacity:.4;pointer-events:none">
                    <div style="height:24px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-4)"></div>
                    <div style="height:48px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>
                    <div style="height:16px;width:60%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-6)"></div>
                    ${[1,2,3,4].map(() => `<div style="height:14px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>`).join('')}
                </div>`).join('')}
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <h2 class="cta-section__title reveal">Ready to level up your productivity?</h2>
            <p class="cta-section__desc reveal">Join thousands of students and professionals who study smarter at MugTuon.</p>
            <a href="/register" data-link class="btn btn--primary btn--lg reveal">Get Started Free</a>
        </div>
    </section>

    ${renderFooter()}
    `;

    initHeaderScroll();

    // ── Hero entrance animation (staggered fade-up) ──────────────────────
    requestAnimationFrame(() => {
        const heroEls = document.querySelectorAll('.hero-animate');
        heroEls.forEach((el, i) => {
            setTimeout(() => {
                el.style.transition = `opacity 600ms cubic-bezier(0.23,1,0.32,1), transform 600ms cubic-bezier(0.23,1,0.32,1)`;
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 80 * i);
        });
    });

    // ── Hero parallax on scroll (background image moves slower) ──────────
    const parallaxBg = document.getElementById('heroParallaxBg');
    if (parallaxBg) {
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    parallaxBg.style.transform = `translateY(${scrollY * 0.3}px)`;
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    const observer = Helpers.observeReveal();

    // Async: populate homepage pricing grid with live plan data + correct button hrefs
    (async () => {
        try {
            const plans = await API.get('/plans');
            const grid = document.getElementById('home-pricing-grid');
            if (!grid || !plans || !plans.length) return;

            grid.innerHTML = plans.map(plan => {
                const isFree     = parseFloat(plan.price) === 0;
                const isFeatured = plan.is_featured;
                const features   = Array.isArray(plan.features)
                    ? plan.features
                    : JSON.parse(plan.features || '[]');

                const priceHTML = isFree
                    ? '<div class="pricing-card__price">Free</div>'
                    : '<div class="pricing-card__price">&#8369;' + Number(plan.price).toLocaleString() + '<span>' + Helpers.billingLabel(plan.billing_period) + '</span></div>';

                let btnHref;
                if (plan.button_text === 'Contact Sales') {
                    btnHref = '/contact';
                } else if (isFree) {
                    btnHref = '/register';
                } else if (Store.isLoggedIn) {
                    btnHref = '/checkout?plan=' + plan.id;
                } else {
                    btnHref = '/register?plan=' + plan.id;
                }

                const btnClass = isFeatured ? 'btn--accent' : 'btn--outline';

                return '<div class="pricing-card ' + (isFeatured ? 'pricing-card--featured' : '') + ' reveal">' +
                    (plan.badge_text ? '<div class="pricing-card__badge">' + plan.badge_text + '</div>' : '') +
                    '<h3 class="pricing-card__name">' + plan.name + '</h3>' +
                    priceHTML +
                    '<p class="pricing-card__desc">' + (plan.description || '') + '</p>' +
                    '<ul class="pricing-card__features">' + features.map(f => '<li>' + f + '</li>').join('') + '</ul>' +
                    '<a href="' + btnHref + '" data-link class="btn ' + btnClass + ' btn--full">' + (plan.button_text || 'Get Started') + '</a>' +
                    '</div>';
            }).join('');

            Helpers.observeReveal();
        } catch (e) {
            // API unavailable — restore static fallback cards
            const grid = document.getElementById('home-pricing-grid');
            if (grid) grid.innerHTML =
                '<div class="pricing-card reveal"><h3 class="pricing-card__name">Explorer</h3><div class="pricing-card__price">Free</div><p class="pricing-card__desc">Try MugTuon risk-free</p><ul class="pricing-card__features"><li>1 booking per day</li><li>Basic study timer</li><li>Community leaderboard</li><li>2 hours max per session</li></ul><a href="/register" data-link class="btn btn--outline btn--full">Get Started</a></div>' +
                '<div class="pricing-card pricing-card--featured reveal"><div class="pricing-card__badge">Most Popular</div><h3 class="pricing-card__name">Scholar</h3><div class="pricing-card__price">&#8369;499<span>/mo</span></div><p class="pricing-card__desc">For serious students</p><ul class="pricing-card__features"><li>5 bookings per day</li><li>All timer modes</li><li>Study analytics</li><li>Priority booking</li><li>8 hours max per day</li></ul><a href="/pricing" data-link class="btn btn--accent btn--full">Get Started</a></div>' +
                '<div class="pricing-card reveal"><h3 class="pricing-card__name">Pro</h3><div class="pricing-card__price">&#8369;999<span>/mo</span></div><p class="pricing-card__desc">For professionals &amp; teams</p><ul class="pricing-card__features"><li>Unlimited bookings</li><li>Private rooms access</li><li>Advanced analytics</li><li>Priority support</li><li>Unlimited hours</li></ul><a href="/contact" data-link class="btn btn--outline btn--full">Contact Sales</a></div>';
            Helpers.observeReveal();
        }
    })();

    function startCounterAnimations() {
        document.querySelectorAll('[data-counter]').forEach(el => {
            if (el._counterObserver) el._counterObserver.disconnect();
            const target = parseInt(el.dataset.counter);
            const io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        Helpers.animateCounter(el, target);
                        io.unobserve(el);
                    }
                });
            }, { threshold: 0.5 });
            el._counterObserver = io;
            io.observe(el);
        });
    }

    // Randomized testimonials
    const _testimonials = [
        { text: 'MugTuon transformed my study routine. The gamification keeps me motivated, and the analytics helped me find my peak focus hours.', name: 'Ana Santos', role: 'Computer Science Student' },
        { text: 'The coworking space is perfect for remote work. Great coffee, reliable WiFi, and the booking system is seamless.', name: 'Marco Reyes', role: 'Freelance Developer' },
        { text: 'I love competing on the leaderboard. The study streaks feature makes me come back every day. My grades have never been better.', name: 'Jasmine Lim', role: 'Business Student' },
        { text: 'The Pomodoro timer with XP rewards is genius. I went from 2 hours of studying per day to 5 hours without even noticing.', name: 'Rafael Cruz', role: 'Medical Student' },
        { text: 'Best study cafe in the city. The booking system means I always have my favorite spot reserved. Worth every peso.', name: 'Bea Villanueva', role: 'Architecture Student' },
        { text: 'As a freelancer, I needed a reliable workspace. MugTuon gives me productivity tools that even my coworking space back home didn\'t have.', name: 'Daniel Tan', role: 'UX Designer' },
        { text: 'The achievements system keeps me accountable. I have unlocked 15 badges and my study consistency has improved dramatically.', name: 'Sofia Aquino', role: 'Law Student' },
        { text: 'I brought my entire study group here. The private rooms are perfect for group projects and the analytics show our collective progress.', name: 'Miguel Torres', role: 'Engineering Student' },
    ];
    const shuffled = _testimonials.sort(() => Math.random() - 0.5).slice(0, 3);
    const tGrid = document.getElementById('testimonials-grid');
    if (tGrid) {
        tGrid.innerHTML = shuffled.map(t => {
            const initials = t.name.split(' ').map(w => w[0]).join('');
            return `<div class="testimonial-card reveal">
                <div class="testimonial-card__stars">★★★★★</div>
                <p class="testimonial-card__text">"${t.text}"</p>
                <div class="testimonial-card__author">
                    <div class="avatar avatar--sm">${initials}</div>
                    <div>
                        <div class="testimonial-card__name">${t.name}</div>
                        <div class="testimonial-card__role">${t.role}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
        Helpers.observeReveal();
    }

    // Fetch live community stats
    (async () => {
        try {
            const c = await API.get('/analytics/community');
            const map = {
                'Active Members': c.totalUsers || 0,
                'Study Hours Logged': c.totalStudyHours || 0,
                'Total Study Hours': c.totalStudyHours || 0,
                'Studying Right Now': c.activeNow || 0,
                'Bookings Today': c.bookingsToday || 0
            };
            document.querySelectorAll('[data-counter]').forEach(el => {
                const label = el.closest('.hero__stats > div, .live-stats__item')?.querySelector('.hero__stat-label, .live-stats__label')?.textContent;
                if (label && map[label] !== undefined) {
                    el.dataset.counter = map[label];
                    el.textContent = Number(map[label]).toLocaleString();
                }
            });
            const activeEl = document.getElementById('hero-active-count');
            if (activeEl) {
                const count = c.activeNow || 0;
                activeEl.textContent = count > 0
                    ? count + (count === 1 ? ' person' : ' people') + ' studying right now, together'
                    : 'Study smarter, together';
            }

            const mockMembers = document.getElementById('hero-mock-members');
            const mockActive = document.getElementById('hero-mock-active');
            const mockHours = document.getElementById('hero-mock-hours');
            if (mockMembers) mockMembers.textContent = (c.totalUsers || 0).toLocaleString();
            if (mockActive) mockActive.textContent = (c.activeNow || 0).toLocaleString();
            if (mockHours) mockHours.textContent = (c.totalStudyHours || 0).toLocaleString();
            startCounterAnimations();
        } catch(e) {
            startCounterAnimations();
        }
    })();
}


// ── js/pages/spaces.js ──
function renderSpacesPage(app) {

    app.innerHTML = `
    ${renderHeader()}

    <section class="spaces-hero">
        <div class="container">
            <div class="section__eyebrow" style="text-align:center">Our Spaces</div>
            <h1 style="font-size:var(--text-4xl);text-align:center;max-width:700px;margin:0 auto var(--space-4)">Find your perfect <span style="color:var(--color-accent)">study spot</span></h1>
            <p style="text-align:center;color:var(--color-text-secondary);max-width:560px;margin:0 auto;font-size:var(--text-lg);line-height:var(--leading-relaxed)">
                From quiet solo desks to collaborative group tables and private meeting rooms. Reserve in seconds.
            </p>
        </div>
    </section>

    <section class="section" style="padding-top:var(--space-10)">
        <div class="container">
            <div style="position:relative;width:100%;height:0;padding-top:56.25%;box-shadow:0 2px 8px 0 rgba(63,69,81,0.16);margin-bottom:var(--space-10);overflow:hidden;border-radius:var(--radius-lg);will-change:transform">
                <iframe loading="lazy" style="position:absolute;width:100%;height:100%;top:0;left:0;border:none;padding:0;margin:0"
                    src="https://www.canva.com/design/DAHI25uoaRk/AY4BCaFIx_r0gYDAHJKdrQ/view?embed" allowfullscreen="allowfullscreen" allow="fullscreen">
                </iframe>
            </div>
            <div id="spacesFilterBar" style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-8);justify-content:center">
                <button class="btn btn--accent btn--sm spaces-type-filter active" data-filter="all" onclick="_filterPublicSpaces('all',this)">All Spaces</button>
            </div>
            <div class="spaces-public-grid" id="spacesPublicGrid">
                <div style="text-align:center;padding:var(--space-12);color:var(--color-text-muted)">Loading spaces...</div>
            </div>
        </div>
    </section>

    <section class="section section--alt">
        <div class="container">
            <div class="section__header reveal">
                <div class="section__eyebrow">Amenities</div>
                <h2 class="section__title">Everything you need to focus</h2>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-6);max-width:800px;margin:0 auto">
                <div class="card reveal" style="text-align:center;padding:var(--space-6)">
                    <div style="font-size:28px;margin-bottom:var(--space-3)">💡</div>
                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Desk Lamps</div>
                </div>
                <div class="card reveal" style="text-align:center;padding:var(--space-6)">
                    <div style="font-size:28px;margin-bottom:var(--space-3)">📶</div>
                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">High-Speed WiFi</div>
                </div>
                <div class="card reveal" style="text-align:center;padding:var(--space-6)">
                    <div style="font-size:28px;margin-bottom:var(--space-3)">🔌</div>
                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Power Outlets</div>
                </div>
                <div class="card reveal" style="text-align:center;padding:var(--space-6)">
                    <div style="font-size:28px;margin-bottom:var(--space-3)">☕</div>
                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Coffee & Snacks</div>
                </div>
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <h2 class="cta-section__title reveal">Ready to study?</h2>
            <p class="cta-section__desc reveal">Book your space now and start your productive session.</p>
            <a href="${Store.isLoggedIn ? '/bookings' : '/register'}" data-link class="btn btn--primary btn--lg reveal">${Store.isLoggedIn ? 'Book Now' : 'Get Started Free'}</a>
        </div>
    </section>

    ${renderFooter()}
    `;

    initHeaderScroll();
    Helpers.observeReveal();

    // ── Load spaces from API ─────────────────────────────────────────────
    (async () => {
        try {
            const spaces = await API.get('/spaces');
            if (!spaces || !spaces.length) {
                document.getElementById('spacesPublicGrid').innerHTML = '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">No spaces available right now.</div>';
                return;
            }

            // Build filter buttons
            const types = [...new Set(spaces.map(s => s.type))];
            const filterBar = document.getElementById('spacesFilterBar');
            if (filterBar) {
                filterBar.innerHTML = `
                    <button class="btn btn--accent btn--sm spaces-type-filter active" data-filter="all" onclick="_filterPublicSpaces('all',this)">All Spaces</button>
                    ${types.map(type => `<button class="btn btn--outline btn--sm spaces-type-filter" data-filter="${type}" onclick="_filterPublicSpaces('${type}',this)">${type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</button>`).join('')}
                `;
            }

            // Render space cards
            const grid = document.getElementById('spacesPublicGrid');
            if (grid) {
                grid.innerHTML = spaces.map((s, i) => {
                    const amenities = Array.isArray(s.amenities) ? s.amenities :
                        (typeof s.amenities === 'string' ? (() => { try { return JSON.parse(s.amenities); } catch(e) { return []; } })() : []);
                    return `
                    <div class="spaces-public-card reveal" data-type="${s.type}" style="opacity:0;transform:translateY(16px)">
                        <div class="spaces-public-card__type">${s.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                        <h3 class="spaces-public-card__name">${Helpers.esc(s.name)}</h3>
                        <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-3)">${s.description || `${s.capacity} ${s.capacity > 1 ? 'people' : 'person'} capacity`}</p>
                        <div style="display:flex;flex-wrap:wrap;gap:var(--space-1);margin-bottom:var(--space-4)">
                            ${amenities.slice(0, 4).map(a => `<span class="badge badge--primary">${Helpers.esc(a)}</span>`).join('')}
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto">
                            <div style="font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--color-primary)">${Helpers.formatCurrency(s.hourly_rate)}<span style="font-size:var(--text-xs);font-weight:normal;color:var(--color-text-muted)">/hr</span></div>
                            <button class="btn btn--accent btn--sm" onclick="_bookSpaceAction('${s.id}')">Book Now</button>
                        </div>
                    </div>`;
                }).join('');

                // Staggered entrance — 60ms between cards, strong ease-out
                requestAnimationFrame(() => {
                    grid.querySelectorAll('.spaces-public-card').forEach((card, i) => {
                        setTimeout(() => {
                            card.style.transition = 'opacity 500ms cubic-bezier(0.23,1,0.32,1), transform 500ms cubic-bezier(0.23,1,0.32,1)';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 60 * i);
                    });
                });
            }
        } catch (e) {
            document.getElementById('spacesPublicGrid').innerHTML = '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">Could not load spaces.</div>';
        }
    })();
}

function _filterPublicSpaces(type, btn) {
    document.querySelectorAll('.spaces-type-filter').forEach(b => {
        b.classList.remove('active');
        b.className = b.className.replace('btn--accent', 'btn--outline');
    });
    btn.classList.add('active');
    btn.className = btn.className.replace('btn--outline', 'btn--accent');

    document.querySelectorAll('.spaces-public-card').forEach(card => {
        const show = type === 'all' || card.dataset.type === type;
        card.style.display = show ? '' : 'none';
    });
}

function _bookSpaceAction(spaceId) {
    if (Store.isLoggedIn) {
        Router.navigate('/bookings');
    } else {
        // Show sign-in prompt modal
        const modal = document.createElement('div');
        modal.id = 'auth-prompt-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1200;display:flex;align-items:center;justify-content:center;padding:var(--space-4);opacity:0;transition:opacity 250ms cubic-bezier(0.23,1,0.32,1)';
        modal.innerHTML = `
            <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:400px;box-shadow:var(--shadow-xl);overflow:hidden;transform:scale(0.95);opacity:0;transition:transform 300ms cubic-bezier(0.23,1,0.32,1),opacity 300ms cubic-bezier(0.23,1,0.32,1)" id="auth-prompt-inner" onclick="event.stopPropagation()">
                <div style="padding:var(--space-8);text-align:center">
                    <div style="width:56px;height:56px;border-radius:50%;background:rgba(0,66,57,0.08);display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto var(--space-4)">🔒</div>
                    <h3 style="margin-bottom:var(--space-2)">Sign in to book</h3>
                    <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-6)">Create a free account or sign in to reserve your study space.</p>
                    <div style="display:flex;flex-direction:column;gap:var(--space-3)">
                        <a href="/register" data-link class="btn btn--accent btn--lg btn--full" onclick="document.getElementById('auth-prompt-modal').remove()">Create Free Account</a>
                        <a href="/login" data-link class="btn btn--outline btn--lg btn--full" onclick="document.getElementById('auth-prompt-modal').remove()">Sign In</a>
                    </div>
                </div>
            </div>`;
        modal.onclick = () => {
            const inner = document.getElementById('auth-prompt-inner');
            if (inner) { inner.style.transform = 'scale(0.95)'; inner.style.opacity = '0'; }
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 250);
        };
        document.body.appendChild(modal);

        // Trigger entrance animation on next frame
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const inner = document.getElementById('auth-prompt-inner');
            if (inner) { inner.style.transform = 'scale(1)'; inner.style.opacity = '1'; }
        });
    }
}


// ── js/pages/about.js ──
function renderAboutPage(app) {
    app.innerHTML = `
    ${renderHeader()}

    <section class="about-hero">
        <div class="container">
            <div class="section__eyebrow">Our Story</div>
            <h1 class="about-hero__title">Where coffee meets <span style="color:var(--color-accent)">productivity</span></h1>
            <p class="about-hero__desc">MugTuon started as a simple idea: create a space where students can study, collaborate, and grow together, fueled by great coffee and a focused environment.</p>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="showcase__grid">
                <div class="reveal">
                    <div class="section__eyebrow">Our Mission</div>
                    <h2 style="margin-bottom:var(--space-4)">Empowering learners to achieve more</h2>
                    <p style="color:var(--color-text-secondary);line-height:var(--leading-relaxed);margin-bottom:var(--space-4)">
                        We believe that the right environment, tools, and community can transform how people learn and work. MugTuon combines physical spaces with digital productivity tools to create an ecosystem where every study session counts.
                    </p>
                    <p style="color:var(--color-text-secondary);line-height:var(--leading-relaxed)">
                        From our Pomodoro timer to our detailed study analytics, every feature is designed to help you understand your study patterns, stay motivated, and reach your goals faster.
                    </p>
                </div>
                <div class="reveal" style="background:var(--color-warm-lighter);border-radius:var(--radius-xl);padding:var(--space-10);display:flex;align-items:center;justify-content:center;">
                    <div style="text-align:center">
                        <img src="images/logo-icon.png" alt="MugTuon" style="width:80px;height:80px;border-radius:50%;margin-bottom:var(--space-4)">
                        <div style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-primary)">Est. 2024</div>
                        <div style="color:var(--color-text-secondary)">MugTuon Learning Hub & Cafe</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="section section--alt">
        <div class="container">
            <div class="section__header reveal">
                <div class="section__eyebrow">Our Values</div>
                <h2 class="section__title">What drives us</h2>
            </div>

            <div class="values-grid">
                <div class="card reveal">
                    <div class="value-card__icon">🎯</div>
                    <h3 class="value-card__title">Focus First</h3>
                    <p class="value-card__desc">Every design decision and feature prioritizes deep focus and meaningful productivity.</p>
                </div>
                <div class="card reveal">
                    <div class="value-card__icon">🤝</div>
                    <h3 class="value-card__title">Community Driven</h3>
                    <p class="value-card__desc">We build for and with our community. Study together, grow together, succeed together.</p>
                </div>
                <div class="card reveal">
                    <div class="value-card__icon">🌱</div>
                    <h3 class="value-card__title">Continuous Growth</h3>
                    <p class="value-card__desc">Our gamification system rewards consistency and helps build lasting study habits.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="live-stats">
        <div class="container">
            <div class="live-stats__grid">
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" id="about-stat-members">—</div>
                    <div class="live-stats__label">Members</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" id="about-stat-hours">—</div>
                    <div class="live-stats__label">Study Hours</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" id="about-stat-active">—</div>
                    <div class="live-stats__label">Studying Now</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" id="about-stat-bookings">—</div>
                    <div class="live-stats__label">Bookings Today</div>
                </div>
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <h2 class="cta-section__title reveal">Join our community</h2>
            <p class="cta-section__desc reveal">Be part of a growing community of focused learners and productive professionals.</p>
            <a href="/register" data-link class="btn btn--primary btn--lg reveal">Get Started Free</a>
        </div>
    </section>

    ${renderFooter()}
    `;

    initHeaderScroll();
    Helpers.observeReveal();

    (async () => {
        try {
            const c = await API.get('/analytics/community');
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = Number(val).toLocaleString(); };
            set('about-stat-members', c.totalUsers || 0);
            set('about-stat-hours', c.totalStudyHours || 0);
            set('about-stat-active', c.activeNow || 0);
            set('about-stat-bookings', c.bookingsToday || 0);
        } catch(e) {}
    })();
}


// ── js/pages/pricing.js ──
async function renderPricingPage(app) {
    // Render full page immediately with a loading placeholder for the cards
    app.innerHTML = `
    ${renderHeader()}

    <section class="about-hero">
        <div class="container">
            <div class="section__eyebrow">Pricing</div>
            <h1 class="about-hero__title">Simple, transparent pricing</h1>
            <p class="about-hero__desc">Choose the plan that fits your study style. Upgrade or downgrade anytime.</p>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="pricing-grid" style="max-width:1060px" id="pricing-cards">
                ${[1,2,3].map(() => `
                <div class="pricing-card reveal" style="opacity:.4;pointer-events:none">
                    <div style="height:24px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-4)"></div>
                    <div style="height:48px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>
                    <div style="height:16px;width:60%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-6)"></div>
                    ${[1,2,3,4,5].map(() => `<div style="height:14px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>`).join('')}
                </div>`).join('')}
            </div>
        </div>
    </section>

    <section class="section section--alt">
        <div class="container container--narrow">
            <div class="section__header reveal">
                <h2 class="section__title">Frequently asked questions</h2>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-4)">
                <div class="card reveal">
                    <h4 style="margin-bottom:var(--space-2)">Can I switch plans anytime?</h4>
                    <p style="color:var(--color-text-secondary);font-size:var(--text-sm)">Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.</p>
                </div>
                <div class="card reveal">
                    <h4 style="margin-bottom:var(--space-2)">Is there a free trial?</h4>
                    <p style="color:var(--color-text-secondary);font-size:var(--text-sm)">The Scholar plan comes with a 7-day free trial. No credit card required to start.</p>
                </div>
                <div class="card reveal">
                    <h4 style="margin-bottom:var(--space-2)">What payment methods do you accept?</h4>
                    <p style="color:var(--color-text-secondary);font-size:var(--text-sm)">We accept GCash, credit/debit cards, and bank transfers. Cash payments are also accepted at our physical locations.</p>
                </div>
                <div class="card reveal">
                    <h4 style="margin-bottom:var(--space-2)">Do you offer student discounts?</h4>
                    <p style="color:var(--color-text-secondary);font-size:var(--text-sm)">Yes! Students with a valid school ID get 20% off any paid plan. Contact us with your student verification.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <h2 class="cta-section__title reveal">Ready to boost your productivity?</h2>
            <p class="cta-section__desc reveal">Start with our free Explorer plan and upgrade anytime.</p>
            <a href="/register" data-link class="btn btn--primary btn--lg reveal">Get Started Free</a>
        </div>
    </section>

    ${renderFooter()}
    `;

    initHeaderScroll();
    Helpers.observeReveal();

    // Fetch plans from the API and replace the skeleton
    try {
        const plans = await API.get('/plans');
        const grid = document.getElementById('pricing-cards');
        if (!grid || !plans || plans.length === 0) return;

        grid.innerHTML = plans.map(plan => {
            const isFree     = parseFloat(plan.price) === 0;
            const isFeatured = plan.is_featured;
            const features   = Array.isArray(plan.features)
                ? plan.features
                : JSON.parse(plan.features || '[]');

            const priceHTML = isFree
                ? `<div class="pricing-card__price">Free</div>`
                : `<div class="pricing-card__price">&#8369;${Number(plan.price).toLocaleString()}<span>${Helpers.billingLabel(plan.billing_period)}</span></div>`;

            const btnClass = isFeatured ? 'btn--accent' : 'btn--outline';
            let btnHref;
            if (plan.button_text === 'Contact Sales') {
                btnHref = '/contact';
            } else if (isFree) {
                btnHref = '/register';
            } else if (Store.isLoggedIn) {
                btnHref = `/checkout?plan=${plan.id}`;
            } else {
                btnHref = `/register?plan=${plan.id}`;
            }

            return `
            <div class="pricing-card ${isFeatured ? 'pricing-card--featured' : ''} reveal">
                ${plan.badge_text ? `<div class="pricing-card__badge">${plan.badge_text}</div>` : ''}
                <h3 class="pricing-card__name">${plan.name}</h3>
                ${priceHTML}
                <p class="pricing-card__desc">${plan.description || ''}</p>
                <ul class="pricing-card__features">
                    ${features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <a href="${btnHref}" data-link class="btn ${btnClass} btn--full">${plan.button_text || 'Get Started'}</a>
            </div>`;
        }).join('');

        // Re-observe new elements for scroll animations
        Helpers.observeReveal();

    } catch (err) {
        // Fallback: show static plans if API is unavailable
        console.warn('Could not load plans from API, showing static fallback:', err.message);
        const grid = document.getElementById('pricing-cards');
        if (grid) {
            grid.innerHTML = `
            <div class="pricing-card reveal">
                <h3 class="pricing-card__name">Explorer</h3>
                <div class="pricing-card__price">Free</div>
                <p class="pricing-card__desc">Try MugTuon risk-free</p>
                <ul class="pricing-card__features">
                    <li>1 booking per day</li><li>Basic study timer</li>
                    <li>Community leaderboard</li><li>2 hours max per session</li>
                </ul>
                <a href="/register" data-link class="btn btn--outline btn--full">Get Started</a>
            </div>
            <div class="pricing-card pricing-card--featured reveal">
                <div class="pricing-card__badge">Most Popular</div>
                <h3 class="pricing-card__name">Scholar</h3>
                <div class="pricing-card__price">&#8369;499<span>/mo</span></div>
                <p class="pricing-card__desc">For serious students</p>
                <ul class="pricing-card__features">
                    <li>5 bookings per day</li><li>All timer modes</li>
                    <li>Study analytics</li><li>Priority booking</li><li>8 hours max per day</li>
                </ul>
                <a href="/register" data-link class="btn btn--accent btn--full">Get Started</a>
            </div>
            <div class="pricing-card reveal">
                <h3 class="pricing-card__name">Pro</h3>
                <div class="pricing-card__price">&#8369;999<span>/mo</span></div>
                <p class="pricing-card__desc">For professionals &amp; teams</p>
                <ul class="pricing-card__features">
                    <li>Unlimited bookings</li><li>Private rooms access</li>
                    <li>Advanced analytics</li><li>Priority support</li><li>Unlimited hours</li>
                </ul>
                <a href="/contact" data-link class="btn btn--outline btn--full">Contact Sales</a>
            </div>`;
            Helpers.observeReveal();
        }
    }
}


// ── js/pages/contact.js ──
function renderContactPage(app) {
    app.innerHTML = `
    ${renderHeader()}

    <section class="about-hero">
        <div class="container">
            <div class="section__eyebrow">Contact</div>
            <h1 class="about-hero__title">Get in touch</h1>
            <p class="about-hero__desc">Have a question or want to visit? We'd love to hear from you.</p>
        </div>
    </section>

    <section class="section">
        <div class="container" style="max-width:960px">
            <div class="contact-grid">
                <div>
                    <h2 style="margin-bottom:var(--space-6)">Send us a message</h2>
                    <form onsubmit="handleContactSubmit(event)">
                        <div class="form-group">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-input" id="contactName" placeholder="Your name" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email Address</label>
                            <input type="email" class="form-input" id="contactEmail" placeholder="you@example.com" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Subject</label>
                            <select class="form-input" id="contactSubject">
                                <option value="">Select a topic</option>
                                <option>General Inquiry</option>
                                <option>Booking Support</option>
                                <option>Membership</option>
                                <option>Partnership</option>
                                <option>Bug Report</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Message</label>
                            <textarea class="form-input" rows="5" id="contactMessage" placeholder="Tell us how we can help..." required></textarea>
                        </div>
                        <div id="contactError" class="form-error" style="display:none;margin-bottom:var(--space-4)"></div>
                        <button type="submit" class="btn btn--accent btn--lg btn--full" id="contactBtn">Send Message</button>
                    </form>
                </div>

                <div>
                    <h2 style="margin-bottom:var(--space-6)">Contact info</h2>
                    <div class="contact-info">
                        <div class="contact-info__item">
                            <div class="contact-info__icon">📍</div>
                            <div>
                                <div class="contact-info__label">Visit us</div>
                                <div class="contact-info__value" id="contact-address">Loading...</div>
                            </div>
                        </div>
                        <div class="contact-info__item">
                            <div class="contact-info__icon">📧</div>
                            <div>
                                <div class="contact-info__label">Email</div>
                                <div class="contact-info__value" id="contact-email">Loading...</div>
                            </div>
                        </div>
                        <div class="contact-info__item">
                            <div class="contact-info__icon">📱</div>
                            <div>
                                <div class="contact-info__label">Phone</div>
                                <div class="contact-info__value" id="contact-phone">Loading...</div>
                            </div>
                        </div>
                        <div class="contact-info__item">
                            <div class="contact-info__icon">🕐</div>
                            <div>
                                <div class="contact-info__label">Operating Hours</div>
                                <div class="contact-info__value" id="contact-hours">Loading...</div>
                            </div>
                        </div>
                    </div>

                    <div class="card" style="margin-top:var(--space-8);background:var(--color-warm-lighter)">
                        <h4 style="margin-bottom:var(--space-2)">Walk-ins Welcome!</h4>
                        <p style="font-size:var(--text-sm);color:var(--color-text-secondary)">No booking required for our cafe area. Just drop by, grab a coffee, and find your spot.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    ${renderFooter()}
    `;

    initHeaderScroll();

    const defaults = {
        contact_address: '19th St., 2nd Floor - CJB Building, Nazareth, Cagayan de Oro City, 9000',
        contact_email: 'mugtuonlhc@gmail.com',
        contact_phone: '+63 976 076 8475',
        contact_hours: 'Open Daily 10 AM - 4 AM'
    };
    (async () => {
        let info = {};
        try { info = await API.get('/contact/info'); } catch(e) {}
        document.getElementById('contact-address').textContent = info.contact_address || defaults.contact_address;
        document.getElementById('contact-email').textContent   = info.contact_email   || defaults.contact_email;
        document.getElementById('contact-phone').textContent   = info.contact_phone   || defaults.contact_phone;
        document.getElementById('contact-hours').textContent   = info.contact_hours   || defaults.contact_hours;
    })();
}

async function handleContactSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('contactBtn');
    const errEl = document.getElementById('contactError');
    errEl.style.display = 'none';
    btn.textContent = 'Sending...'; btn.disabled = true;

    try {
        await API.post('/contact', {
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            subject: document.getElementById('contactSubject').value,
            message: document.getElementById('contactMessage').value,
        });
        Helpers.showToast('Message Sent', 'Thanks for reaching out! We\'ll get back to you within 24 hours.', 'success');
        e.target.reset();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.textContent = 'Send Message'; btn.disabled = false;
    }
}


// ── js/pages/login.js ──
function renderLoginPage(app) {
    app.innerHTML = `
    <div class="auth-page">
        <div class="auth-page__visual">
            <div class="auth-page__visual-content">
                <img src="images/logo-horizontal-dark.png" alt="MugTuon" style="max-width:260px;height:auto;margin:0 auto var(--space-8);display:block">
                <h2 class="auth-page__visual-title" style="text-align:center">Welcome back</h2>
                <p class="auth-page__visual-desc" style="text-align:center">Sign in to continue your productivity journey. Your streak is waiting.</p>

                <div style="display:flex;gap:var(--space-10);justify-content:center;margin-top:var(--space-10)">
                    <div style="text-align:center">
                        <div id="login-stat-hours" style="font-size:var(--text-2xl);font-weight:700;color:white">—</div>
                        <div style="font-size:var(--text-sm);opacity:0.7">Study Hours</div>
                    </div>
                    <div style="text-align:center">
                        <div id="login-stat-members" style="font-size:var(--text-2xl);font-weight:700;color:white">—</div>
                        <div style="font-size:var(--text-sm);opacity:0.7">Members</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="auth-page__form-side">
            <div class="auth-form">
                <div class="auth-form__header">
                    <a href="/" data-link class="header__logo" style="margin-bottom:var(--space-6)">
                        <img src="images/logo-icon.png" alt="MugTuon" style="width:36px;height:36px;border-radius:50%">
                        <span>MugTuon</span>
                    </a>
                    <h1 class="auth-form__title">Sign in to your account</h1>
                    <p class="auth-form__subtitle">Enter your credentials to continue</p>
                </div>

                <form onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="loginEmail" class="form-input" placeholder="you@example.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" id="loginPassword" class="form-input" placeholder="Enter your password" required>
                    </div>
                    <div id="loginError" class="form-error" style="margin-bottom:var(--space-4);display:none"></div>

                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
                        <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);color:var(--color-text-secondary);cursor:pointer">
                            <input type="checkbox" id="rememberMe" checked style="accent-color:var(--color-accent)"> Remember me
                        </label>
                        <a href="/forgot-password" data-link style="font-size:var(--text-sm);color:var(--color-accent)">Forgot password?</a>
                    </div>

                    <button type="submit" id="loginBtn" class="btn btn--accent btn--lg btn--full">Sign In</button>
                </form>

                <div class="auth-form__footer">
                    Don't have an account? <a href="/register" data-link>Create one</a>
                </div>
            </div>
        </div>
    </div>
    `;

    (async () => {
        try {
            const c = await API.get('/analytics/community');
            const hoursEl = document.getElementById('login-stat-hours');
            const membersEl = document.getElementById('login-stat-members');
            if (hoursEl) hoursEl.textContent = (c.totalStudyHours || 0).toLocaleString();
            if (membersEl) membersEl.textContent = (c.totalUsers || 0).toLocaleString();
        } catch(e) {
            const hoursEl = document.getElementById('login-stat-hours');
            const membersEl = document.getElementById('login-stat-members');
            if (hoursEl) hoursEl.textContent = '—';
            if (membersEl) membersEl.textContent = '—';
        }
    })();
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errorEl = document.getElementById('loginError');
    errorEl.style.display = 'none';
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    try {
        const remember = document.getElementById('rememberMe')?.checked !== false;
        const data = await API.post('/auth/login', {
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value,
            remember
        });
        Store.login(data.user, remember);
        Router.navigate('/dashboard');
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
}



// ── js/pages/forgot-password.js ──
function renderForgotPasswordPage(app) {
    app.innerHTML = `
    <div class="auth-page">
        <div class="auth-page__visual">
            <div class="auth-page__visual-content">
                <div style="font-size:48px;margin-bottom:var(--space-6)">🔑</div>
                <h2 class="auth-page__visual-title">Reset your password</h2>
                <p class="auth-page__visual-desc">Enter your email and we'll help you get back into your account.</p>
            </div>
        </div>

        <div class="auth-page__form-side">
            <div class="auth-form">
                <div class="auth-form__header">
                    <a href="/" data-link class="header__logo" style="margin-bottom:var(--space-6)">
                        <img src="images/logo-icon.png" alt="MugTuon" style="width:36px;height:36px;border-radius:50%">
                        <span>MugTuon</span>
                    </a>
                    <h1 class="auth-form__title">Forgot Password</h1>
                    <p class="auth-form__subtitle">Enter your email to receive a reset link</p>
                </div>

                <form onsubmit="handleForgotPassword(event)" id="forgotForm">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="forgotEmail" class="form-input" placeholder="you@example.com" required>
                    </div>
                    <div id="forgotError" class="form-error" style="margin-bottom:var(--space-4);display:none"></div>
                    <div id="forgotSuccess" style="margin-bottom:var(--space-4);display:none;padding:var(--space-4);background:rgba(0,128,0,.08);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--color-success)"></div>
                    <button type="submit" id="forgotBtn" class="btn btn--accent btn--lg btn--full">Send Reset Link</button>
                </form>

                <div class="auth-form__footer">
                    Remember your password? <a href="/login" data-link>Sign in</a>
                </div>
            </div>
        </div>
    </div>`;
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const btn = document.getElementById('forgotBtn');
    const errEl = document.getElementById('forgotError');
    const successEl = document.getElementById('forgotSuccess');
    errEl.style.display = 'none';
    successEl.style.display = 'none';
    btn.textContent = 'Sending...'; btn.disabled = true;

    try {
        const data = await API.post('/auth/forgot-password', {
            email: document.getElementById('forgotEmail').value
        });
        successEl.textContent = data.message;
        successEl.style.display = 'block';
        btn.textContent = 'Link Sent';
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.textContent = 'Send Reset Link'; btn.disabled = false;
    }
}


// ── js/pages/reset-password.js ──
function renderResetPasswordPage(app) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';

    app.innerHTML = `
    <div class="auth-page">
        <div class="auth-page__visual">
            <div class="auth-page__visual-content">
                <div style="font-size:48px;margin-bottom:var(--space-6)">🔐</div>
                <h2 class="auth-page__visual-title">New password</h2>
                <p class="auth-page__visual-desc">Choose a strong password to protect your account.</p>
            </div>
        </div>

        <div class="auth-page__form-side">
            <div class="auth-form">
                <div class="auth-form__header">
                    <a href="/" data-link class="header__logo" style="margin-bottom:var(--space-6)">
                        <img src="images/logo-icon.png" alt="MugTuon" style="width:36px;height:36px;border-radius:50%">
                        <span>MugTuon</span>
                    </a>
                    <h1 class="auth-form__title">Reset Password</h1>
                    <p class="auth-form__subtitle">Enter your new password below</p>
                </div>

                <form onsubmit="handleResetPassword(event)">
                    <input type="hidden" id="resetToken" value="${token}">
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" id="resetPassword" class="form-input" placeholder="Min. 6 characters" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm Password</label>
                        <input type="password" id="resetConfirm" class="form-input" placeholder="Confirm your password" required minlength="6">
                    </div>
                    <div id="resetError" class="form-error" style="margin-bottom:var(--space-4);display:none"></div>
                    <div id="resetSuccess" style="margin-bottom:var(--space-4);display:none;padding:var(--space-4);background:rgba(0,128,0,.08);border-radius:var(--radius-md);font-size:var(--text-sm);color:var(--color-success)"></div>
                    <button type="submit" id="resetBtn" class="btn btn--accent btn--lg btn--full">Reset Password</button>
                </form>

                <div class="auth-form__footer">
                    <a href="/login" data-link>Back to Sign In</a>
                </div>
            </div>
        </div>
    </div>`;
}

async function handleResetPassword(e) {
    e.preventDefault();
    const btn = document.getElementById('resetBtn');
    const errEl = document.getElementById('resetError');
    const successEl = document.getElementById('resetSuccess');
    errEl.style.display = 'none';
    successEl.style.display = 'none';

    const newPassword = document.getElementById('resetPassword').value;
    const confirm = document.getElementById('resetConfirm').value;
    const token = document.getElementById('resetToken').value;

    if (newPassword !== confirm) {
        errEl.textContent = 'Passwords do not match';
        errEl.style.display = 'block';
        return;
    }
    if (!token) {
        errEl.textContent = 'Invalid reset link. Please request a new one.';
        errEl.style.display = 'block';
        return;
    }

    btn.textContent = 'Resetting...'; btn.disabled = true;
    try {
        await API.post('/auth/reset-password', { token, newPassword });
        successEl.textContent = 'Password reset successful! Redirecting to sign in...';
        successEl.style.display = 'block';
        btn.style.display = 'none';
        setTimeout(() => Router.navigate('/login'), 2000);
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.textContent = 'Reset Password'; btn.disabled = false;
    }
}


// ── js/pages/verify-email.js ──
async function renderVerifyEmailPage(app) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';

    app.innerHTML = `
    <div class="auth-page">
        <div class="auth-page__visual">
            <div class="auth-page__visual-content">
                <div style="font-size:48px;margin-bottom:var(--space-6)">✉️</div>
                <h2 class="auth-page__visual-title">Verify your email</h2>
                <p class="auth-page__visual-desc">Confirming your email keeps your account secure.</p>
            </div>
        </div>
        <div class="auth-page__form-side">
            <div class="auth-form">
                <div class="auth-form__header">
                    <a href="/" data-link class="header__logo" style="margin-bottom:var(--space-6)">
                        <img src="images/logo-icon.png" alt="MugTuon" style="width:36px;height:36px;border-radius:50%">
                        <span>MugTuon</span>
                    </a>
                    <h1 class="auth-form__title">Email Verification</h1>
                </div>
                <div id="verifyBody" style="text-align:center;padding:var(--space-6) 0">
                    <div style="color:var(--color-text-muted)">Verifying your email...</div>
                </div>
            </div>
        </div>
    </div>`;

    if (!token) {
        document.getElementById('verifyBody').innerHTML = `<div style="color:var(--color-error)">Invalid verification link. Please request a new one from your profile.</div>`;
        return;
    }

    try {
        const data = await API.get(`/auth/verify-email?token=${token}`);
        document.getElementById('verifyBody').innerHTML = `
            <div style="font-size:48px;margin-bottom:var(--space-4)">✅</div>
            <h2 style="margin-bottom:var(--space-3)">Email Verified!</h2>
            <p style="color:var(--color-text-muted);margin-bottom:var(--space-6)">Welcome, ${data.name}! Your email has been confirmed.</p>
            <a href="/dashboard" data-link class="btn btn--accent btn--lg">Go to Dashboard</a>`;
    } catch (err) {
        document.getElementById('verifyBody').innerHTML = `
            <div style="color:var(--color-error);margin-bottom:var(--space-4)">${err.message}</div>
            <a href="/profile" data-link class="btn btn--outline">Request New Link</a>`;
    }
}


// ── js/pages/register.js ──
function renderRegisterPage(app) {
    const { plan: planId } = Router.getQuery();

    const visualContent = planId ? `
        <div style="font-size:48px;margin-bottom:var(--space-6)">🎓</div>
        <h2 class="auth-page__visual-title">Almost there!</h2>
        <p class="auth-page__visual-desc">Create your account to continue to checkout and activate your selected plan.</p>
        <div style="margin-top:var(--space-8);text-align:left">
            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
                <span style="background:rgba(255,255,255,0.2);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px">✓</span>
                <span style="font-size:var(--text-sm)">Instant plan activation</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
                <span style="background:rgba(255,255,255,0.2);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px">✓</span>
                <span style="font-size:var(--text-sm)">Cancel or switch plans anytime</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-3)">
                <span style="background:rgba(255,255,255,0.2);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px">✓</span>
                <span style="font-size:var(--text-sm)">Multiple payment methods accepted</span>
            </div>
        </div>
    ` : `
        <div style="font-size:48px;margin-bottom:var(--space-6)">🚀</div>
        <h2 class="auth-page__visual-title">Start your journey</h2>
        <p class="auth-page__visual-desc">Join the MugTuon community and transform how you study and work. Your first booking is on us.</p>
        <div style="margin-top:var(--space-8);text-align:left">
            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
                <span style="background:rgba(255,255,255,0.2);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px">✓</span>
                <span style="font-size:var(--text-sm)">Free study timer & analytics</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
                <span style="background:rgba(255,255,255,0.2);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px">✓</span>
                <span style="font-size:var(--text-sm)">Leaderboard access</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-3)">
                <span style="background:rgba(255,255,255,0.2);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px">✓</span>
                <span style="font-size:var(--text-sm)">1 free booking per day</span>
            </div>
        </div>
    `;

    app.innerHTML = `
    <div class="auth-page">
        <div class="auth-page__visual">
            <div class="auth-page__visual-content">
                ${visualContent}
            </div>
        </div>

        <div class="auth-page__form-side">
            <div class="auth-form">
                <div class="auth-form__header">
                    <a href="/" data-link class="header__logo" style="margin-bottom:var(--space-6)">
                        <img src="images/logo-icon.png" alt="MugTuon" style="width:36px;height:36px;border-radius:50%">
                        <span>MugTuon</span>
                    </a>
                    <h1 class="auth-form__title">Create your account</h1>
                    <p class="auth-form__subtitle">Fill in your details to get started</p>
                </div>

                <form onsubmit="handleRegister(event)">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                        <div class="form-group">
                            <label class="form-label">First Name</label>
                            <input type="text" id="regFirstName" class="form-input" placeholder="Maria" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Last Name</label>
                            <input type="text" id="regLastName" class="form-input" placeholder="Santos" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="regEmail" class="form-input" placeholder="you@example.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">University / School</label>
                        <input type="text" id="regUniversity" class="form-input" placeholder="Your university (optional)">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <input type="password" id="regPassword" class="form-input" placeholder="Min 8 characters" required minlength="8">
                            <div id="regPwStrength"></div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Confirm Password</label>
                            <input type="password" id="regConfirmPassword" class="form-input" placeholder="Re-enter password" required minlength="8">
                        </div>
                    </div>
                    <div id="regError" class="form-error" style="margin-bottom:var(--space-4);display:none"></div>

                    <button type="submit" id="regBtn" class="btn btn--accent btn--lg btn--full">Create Account</button>
                </form>

                <div class="auth-form__footer">
                    Already have an account? <a href="/login" data-link>Sign in</a>
                </div>
            </div>
        </div>
    </div>
    `;
    Helpers.renderPasswordStrength('regPassword', 'regPwStrength');
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('regBtn');
    const errorEl = document.getElementById('regError');
    errorEl.style.display = 'none';
    btn.textContent = 'Creating account...';
    btn.disabled = true;

    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    if (password !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.style.display = 'block';
        btn.textContent = 'Create Account';
        btn.disabled = false;
        return;
    }
    const strength = Helpers.getPasswordStrength(password);
    if (strength.score < 3) {
        errorEl.textContent = 'Password needs at least 8 characters with uppercase, lowercase, and a number';
        errorEl.style.display = 'block';
        btn.textContent = 'Create Account';
        btn.disabled = false;
        return;
    }

    try {
        const data = await API.post('/auth/register', {
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            firstName: document.getElementById('regFirstName').value,
            lastName: document.getElementById('regLastName').value,
            university: document.getElementById('regUniversity').value,
        });
        Store.login(data.user);
        const { plan: planId } = Router.getQuery();
        if (planId) {
            Router.navigate(`/checkout?plan=${planId}`);
            Helpers.showToast('Account created!', 'Complete your plan subscription below.', 'success');
        } else {
            Router.navigate('/dashboard');
            Helpers.showToast('Welcome!', 'Your account has been created. Start exploring!', 'success');
        }
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
        btn.textContent = 'Create Account';
        btn.disabled = false;
    }
}


// ── js/pages/terms.js ──
function renderTermsPage(app) {
    app.innerHTML = `
    ${renderHeader()}
    <section class="section" style="padding-top:var(--space-12);padding-bottom:var(--space-12)">
        <div class="container container--narrow">
            <div class="section__eyebrow">Legal</div>
            <h1 style="font-size:var(--text-3xl);font-weight:var(--weight-bold);margin-bottom:var(--space-2)">Terms of Service</h1>
            <p style="color:var(--color-text-muted);margin-bottom:var(--space-8)">Last updated: May 2026</p>

            <div style="display:flex;flex-direction:column;gap:var(--space-6);line-height:var(--leading-relaxed);color:var(--color-text-secondary)">
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">1. Acceptance of Terms</h3>
                    <p>By accessing and using MugTuon Learning Hub & Cafe ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">2. Account Registration</h3>
                    <p>You must provide accurate, complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 16 years old to create an account.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">3. Bookings & Spaces</h3>
                    <p>Bookings are subject to availability. MugTuon reserves the right to cancel or modify bookings due to unforeseen circumstances. No-shows may result in penalties as determined by the management. Check-in is required via QR code or staff verification.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">4. Membership Plans</h3>
                    <p>Paid plans are billed according to the selected billing period (monthly, quarterly, or yearly). You may cancel your subscription at any time; access continues until the end of the current billing period. Refunds are handled on a case-by-case basis.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">5. Acceptable Use</h3>
                    <p>You agree not to misuse the Platform, including but not limited to: creating multiple accounts, manipulating gamification features, disrupting other users, or using the space for purposes other than studying or working.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">6. Intellectual Property</h3>
                    <p>All content, branding, and features of the Platform are the property of MugTuon Learning Hub & Cafe. You may not reproduce, distribute, or create derivative works without written permission.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">7. Limitation of Liability</h3>
                    <p>MugTuon provides the Platform "as is" and makes no warranties regarding availability, accuracy, or fitness for a particular purpose. MugTuon shall not be liable for any indirect, incidental, or consequential damages.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">8. Changes to Terms</h3>
                    <p>We reserve the right to modify these terms at any time. Continued use of the Platform after changes constitutes acceptance of the new terms. Users will be notified of significant changes via email.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">9. Contact</h3>
                    <p>For questions about these Terms, please contact us at <a href="/contact" data-link style="color:var(--color-accent)">our contact page</a> or email mugtuonlhc@gmail.com.</p>
                </div>
            </div>
        </div>
    </section>
    ${renderFooter()}
    `;
    initHeaderScroll();
}


// ── js/pages/privacy.js ──
function renderPrivacyPage(app) {
    app.innerHTML = `
    ${renderHeader()}
    <section class="section" style="padding-top:var(--space-12);padding-bottom:var(--space-12)">
        <div class="container container--narrow">
            <div class="section__eyebrow">Legal</div>
            <h1 style="font-size:var(--text-3xl);font-weight:var(--weight-bold);margin-bottom:var(--space-2)">Privacy Policy</h1>
            <p style="color:var(--color-text-muted);margin-bottom:var(--space-8)">Last updated: May 2026</p>

            <div style="display:flex;flex-direction:column;gap:var(--space-6);line-height:var(--leading-relaxed);color:var(--color-text-secondary)">
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">1. Information We Collect</h3>
                    <p>We collect information you provide directly: name, email address, university, and profile details. We also collect usage data including study sessions, bookings, and productivity metrics to power the gamification and analytics features.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">2. How We Use Your Information</h3>
                    <p>Your information is used to: provide and improve the Platform, process bookings and payments, send email notifications (booking confirmations, reminders, password resets), display leaderboards and analytics, and personalize your experience.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">3. Email Communications</h3>
                    <p>We send transactional emails (booking confirmations, password resets) and optional notifications (renewal reminders, booking reminders). You can manage your email preferences in your profile settings.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">4. Data Storage & Security</h3>
                    <p>Your data is stored securely in our PostgreSQL database. Passwords are hashed using bcrypt. We use JWT tokens for authentication with session invalidation on password change. Payment proof images are stored as encrypted data.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">5. Leaderboard & Public Data</h3>
                    <p>Your name, university, XP, and study streak are visible on the public leaderboard. Your email, bookings, and payment information are never publicly displayed.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">6. Data Sharing</h3>
                    <p>We do not sell, rent, or share your personal information with third parties. Data may be shared with payment processors (GCash, banks) to verify transactions, and with email service providers to deliver notifications.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">7. Your Rights</h3>
                    <p>You have the right to: access your personal data, update or correct your information, request deletion of your account (contact admin), and opt out of non-essential email notifications.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">8. Cookies & Local Storage</h3>
                    <p>We use browser localStorage to maintain your login session, theme preference, and timer state. We do not use third-party tracking cookies.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">9. Contact</h3>
                    <p>For privacy-related inquiries, contact us at <a href="/contact" data-link style="color:var(--color-accent)">our contact page</a> or email mugtuonlhc@gmail.com.</p>
                </div>
            </div>
        </div>
    </section>
    ${renderFooter()}
    `;
    initHeaderScroll();
}


// ── js/pages/checkout.js ──
/* ═══════════════════════════════════════
   Checkout Page — Plan subscription flow
   ═══════════════════════════════════════ */

let _checkoutPlan = null; // holds plan data while the page is open

// ── Payment instruction partials (driven by live settings) ───────────────────

let _paymentMethodSettings = null; // cached after first fetch

async function _loadPaymentSettings() {
    if (_paymentMethodSettings) return _paymentMethodSettings;
    try {
        _paymentMethodSettings = await API.get('/payment-settings');
    } catch(e) {
        // Fallback defaults if API unavailable
        _paymentMethodSettings = [
            { method:'gcash',         label:'GCash',          icon:'📱', is_enabled:true, details:{ number:'0917-123-4567', account_name:'MugTuon Hub', note:'Add your full name in the GCash message/note field.' }},
            { method:'card',          label:'Credit Card',     icon:'💳', is_enabled:true, details:{ instruction:'Our staff will process your card in person at the counter.' }},
            { method:'bank_transfer', label:'Bank Transfer',   icon:'🏦', is_enabled:true, details:{ bank:'BDO Unibank', account_number:'1234-5678-90', account_name:'MugTuon Hub Corp.' }},
            { method:'cash',          label:'Cash at Counter', icon:'💵', is_enabled:true, details:{ instruction:'Pay when you arrive at MugTuon Hub. Your plan will be activated by our staff upon receipt.' }},
        ];
    }
    return _paymentMethodSettings;
}

function _buildInstructions(setting, price) {
    const d = setting.details || {};
    const title = `${setting.icon} ${setting.label}`;

    if (setting.method === 'gcash') {
        return `
        <div class="checkout-instructions">
            <div class="checkout-instructions__title">${title} Instructions</div>
            <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-3)">
                Send <strong>&#8369;${Number(price).toLocaleString()}</strong> to this number:
            </p>
            <div style="background:var(--color-background);border:1px solid var(--color-border);border-radius:var(--radius);padding:var(--space-3) var(--space-4);font-family:'JetBrains Mono',monospace;font-size:var(--text-lg);font-weight:700;letter-spacing:.05em;margin-bottom:var(--space-2)">
                ${d.number || '—'}
            </div>
            ${d.account_name ? `<p style="font-size:var(--text-xs);color:var(--color-text-secondary)">Account name: <strong>${d.account_name}</strong></p>` : ''}
            ${d.note ? `<p style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-1)">${d.note}</p>` : ''}
        </div>`;
    }

    if (setting.method === 'bank_transfer') {
        const rows = [
            d.bank           ? ['Bank',           d.bank]           : null,
            d.account_number ? ['Account Number', d.account_number] : null,
            d.account_name   ? ['Account Name',   d.account_name]   : null,
            ['Amount', `&#8369;${Number(price).toLocaleString()}`],
        ].filter(Boolean);
        return `
        <div class="checkout-instructions">
            <div class="checkout-instructions__title">${title} Details</div>
            <div style="display:grid;gap:var(--space-2);margin-top:var(--space-3)">
                ${rows.map(([label, value]) => `
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:var(--text-sm)">
                        <span style="color:var(--color-text-secondary)">${label}</span>
                        <span style="font-weight:600${label==='Amount'?';color:var(--color-accent)':''}">${value}</span>
                    </div>`).join('')}
            </div>
        </div>`;
    }

    // card or cash — plain instruction text
    return `
    <div class="checkout-instructions">
        <div class="checkout-instructions__title">${title}</div>
        <p style="font-size:var(--text-sm);color:var(--color-text-secondary)">${d.instruction || ''}</p>
    </div>`;
}

// ── Called when user picks a payment method ───────────────────────────────────

function updateCheckoutMethod(method) {
    const settings = _paymentMethodSettings || [];
    settings.forEach(s => {
        const el = document.getElementById(`method-lbl-${s.method}`);
        if (el) el.style.borderColor = (s.method === method) ? 'var(--color-accent)' : 'var(--color-border)';
    });

    const instrEl     = document.getElementById('checkout-instr');
    const refGroup    = document.getElementById('ref-group');
    const proofSection = document.getElementById('proof-upload-section');
    if (!instrEl || !_checkoutPlan) return;

    const setting = settings.find(s => s.method === method);
    if (setting) {
        instrEl.innerHTML = _buildInstructions(setting, _checkoutPlan.price);
        refGroup.style.display = method === 'cash' ? 'none' : 'block';
        // Show proof upload only if this method requires screenshot
        if (proofSection) {
            proofSection.style.display = setting.details?.require_screenshot ? 'block' : 'none';
        }
    }
}

function previewProofImage(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        Helpers.showToast('File Too Large', 'Please upload an image smaller than 5 MB.', 'error');
        input.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const img         = document.getElementById('proof-img-preview');
        const previewWrap = document.getElementById('proof-preview-wrap');
        const placeholder = document.getElementById('proof-upload-placeholder');
        if (img)         img.src = e.target.result;
        if (previewWrap) previewWrap.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// ── Form submission ───────────────────────────────────────────────────────────

async function handleCheckoutSubmit(planId, planName, isFree) {
    const btn     = document.getElementById('checkoutBtn');
    const errorEl = document.getElementById('checkoutError');
    errorEl.style.display = 'none';

    let paymentMethod  = 'gcash';
    let referenceNumber = null;

    let proofImage = null;

    if (!isFree) {
        const methodInput = document.querySelector('input[name="payMethod"]:checked');
        paymentMethod = methodInput ? methodInput.value : 'gcash';
        referenceNumber = document.getElementById('refNumber')?.value?.trim() || null;

        if (paymentMethod !== 'cash' && !referenceNumber) {
            errorEl.textContent = 'Please enter your payment reference number.';
            errorEl.style.display = 'block';
            return;
        }

        // Check if this method requires a proof screenshot
        const methodSetting = (_paymentMethodSettings || []).find(s => s.method === paymentMethod);
        if (methodSetting?.details?.require_screenshot) {
            const proofInput = document.getElementById('proofFile');
            if (!proofInput?.files?.length) {
                errorEl.textContent = 'Please upload a screenshot of your payment as proof.';
                errorEl.style.display = 'block';
                return;
            }
            proofImage = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload  = e => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Failed to read image'));
                reader.readAsDataURL(proofInput.files[0]);
            });
        }
    }

    btn.textContent = 'Processing…';
    btn.disabled = true;

    try {
        await API.post('/payments/subscribe', { planId, paymentMethod, referenceNumber, proofImage });

        // Persist plan name in local user store so header / dashboard can show it
        const user = Store.get('user');
        if (user) {
            const updated = { ...user, plan: planName };
            Store.set('user', updated);
            localStorage.setItem('mugtuon_user', JSON.stringify(updated));
        }

        Router.navigate('/dashboard');
        if (isFree) {
            Helpers.showToast('Plan Activated!', `You\'re now on the ${planName} plan. Enjoy!`, 'success');
        } else {
            Helpers.showToast('Subscription Complete! 🎉', `Welcome to ${planName}! Your plan is now active.`, 'success');
        }
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
        const price = _checkoutPlan ? Number(_checkoutPlan.price).toLocaleString() : '0';
        btn.textContent = isFree
            ? 'Activate Free Plan'
            : `Complete Subscription — &#8369;${price}`;
        btn.disabled = false;
    }
}

// ── Main render function ──────────────────────────────────────────────────────

async function renderCheckoutPage(app) {
    // Auth guard — redirect to register (preserving plan param)
    if (!Store.isLoggedIn) {
        const { plan } = Router.getQuery();
        Router.navigate(plan ? `/register?plan=${plan}` : '/register');
        return;
    }

    const { plan: planId } = Router.getQuery();
    if (!planId) {
        Router.navigate('/pricing');
        return;
    }

    // ── Skeleton ──────────────────────────────────────────────────────────────
    app.innerHTML = `
    ${renderHeader()}
    <section class="section" style="min-height:80vh;padding-top:var(--space-6);padding-bottom:var(--space-12)">
        <div class="container" style="max-width:920px">

            <a href="/pricing" data-link
               style="display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);color:var(--color-text-secondary);text-decoration:none;margin-bottom:var(--space-6)">
                ← Back to Pricing
            </a>

            <h1 style="font-size:var(--text-2xl);font-weight:700;margin-bottom:var(--space-2)">Complete your subscription</h1>
            <p style="color:var(--color-text-secondary);margin-bottom:var(--space-8)">Review your order and enter payment details below.</p>

            <div style="display:grid;grid-template-columns:5fr 7fr;gap:var(--space-8);align-items:start">

                <!-- Order Summary skeleton -->
                <div class="card" id="checkout-summary" style="padding:var(--space-6)">
                    <div style="height:14px;width:40%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-5)"></div>
                    <div style="height:28px;width:65%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>
                    <div style="height:40px;width:45%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-5)"></div>
                    ${[1,2,3,4].map(() => `<div style="height:13px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>`).join('')}
                </div>

                <!-- Payment form skeleton -->
                <div class="card" id="checkout-payment" style="padding:var(--space-6)">
                    <div style="height:14px;width:40%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-6)"></div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-5)">
                        ${[1,2,3,4].map(() => `<div style="height:60px;background:var(--color-border);border-radius:var(--radius-md)"></div>`).join('')}
                    </div>
                    <div style="height:100px;background:var(--color-border);border-radius:var(--radius-md);margin-bottom:var(--space-5)"></div>
                    <div style="height:48px;background:var(--color-border);border-radius:var(--radius-md)"></div>
                </div>
            </div>
        </div>
    </section>
    ${renderFooter()}
    `;

    initHeaderScroll();

    // ── Fetch plan + payment settings in parallel ─────────────────────────────
    let plan;
    try {
        [plan] = await Promise.all([
            API.get(`/plans/${planId}`),
            _loadPaymentSettings(),
        ]);
        _checkoutPlan = plan;
    } catch (err) {
        document.getElementById('checkout-summary').innerHTML = `
            <div style="text-align:center;padding:var(--space-8) var(--space-4)">
                <div style="font-size:48px;margin-bottom:var(--space-4)">⚠️</div>
                <h3 style="margin-bottom:var(--space-2)">Plan not found</h3>
                <p style="color:var(--color-text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-5)">
                    This plan may no longer be available.
                </p>
                <a href="/pricing" data-link class="btn btn--outline">View All Plans</a>
            </div>`;
        document.getElementById('checkout-payment').innerHTML = '';
        return;
    }

    const isFree    = parseFloat(plan.price) === 0;
    const features  = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]');
    const user      = Store.get('user');

    // ── Order summary ─────────────────────────────────────────────────────────
    document.getElementById('checkout-summary').innerHTML = `
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.07em;margin-bottom:var(--space-5)">
            Order Summary
        </div>

        ${plan.badge_text ? `
        <div class="pricing-card__badge" style="margin-bottom:var(--space-3)">${plan.badge_text}</div>` : ''}

        <h2 style="font-size:var(--text-2xl);font-weight:700;margin-bottom:var(--space-2)">${plan.name}</h2>

        <div class="pricing-card__price" style="margin-bottom:var(--space-2)">
            ${isFree ? 'Free' : `&#8369;${Number(plan.price).toLocaleString()}<span>/mo</span>`}
        </div>

        <p style="color:var(--color-text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-5)">
            ${plan.description || ''}
        </p>

        <ul class="pricing-card__features" style="margin-bottom:var(--space-6)">
            ${features.map(f => `<li>${f}</li>`).join('')}
        </ul>

        <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
                <span style="font-size:var(--text-sm);color:var(--color-text-secondary)">Billing period</span>
                <span style="font-size:var(--text-sm);font-weight:500;text-transform:capitalize">${plan.billing_period || 'monthly'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:600">Total today</span>
                <span style="font-weight:700;font-size:var(--text-xl);color:var(--color-accent)">
                    ${isFree ? 'Free' : `&#8369;${Number(plan.price).toLocaleString()}`}
                </span>
            </div>
            ${!isFree ? `
            <p style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-2)">
                Billed ${plan.billing_period || 'monthly'} · Cancel anytime
            </p>` : ''}
        </div>
    `;

    // ── Payment form ──────────────────────────────────────────────────────────
    const activeMethods = (_paymentMethodSettings || []).filter(s => s.is_enabled);

    if (isFree) {
        document.getElementById('checkout-payment').innerHTML = `
            <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.07em;margin-bottom:var(--space-5)">
                Activation
            </div>

            <div style="text-align:center;padding:var(--space-6) var(--space-4)">
                <div style="font-size:52px;margin-bottom:var(--space-4)">🎉</div>
                <h3 style="margin-bottom:var(--space-2)">No payment needed!</h3>
                <p style="color:var(--color-text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-6)">
                    The Explorer plan is completely free. Click below to activate it on your account.
                </p>
                <div id="checkoutError" class="form-error" style="margin-bottom:var(--space-4);display:none"></div>
                <button
                    id="checkoutBtn"
                    onclick="handleCheckoutSubmit('${plan.id}', '${plan.name}', true)"
                    class="btn btn--accent btn--full btn--lg">
                    Activate Free Plan
                </button>
            </div>
        `;
    } else {
        const methods = activeMethods.length > 0
            ? activeMethods.map(s => ({ value: s.method, label: s.label, icon: s.icon }))
            : [
                { value: 'gcash',         label: 'GCash',          icon: '📱' },
                { value: 'card',          label: 'Credit Card',     icon: '💳' },
                { value: 'bank_transfer', label: 'Bank Transfer',   icon: '🏦' },
                { value: 'cash',          label: 'Cash at Counter', icon: '💵' },
            ];
        const firstMethod  = methods[0]?.value || 'gcash';
        const firstSetting = (_paymentMethodSettings || []).find(s => s.method === firstMethod);
        const firstRequiresProof = firstSetting?.details?.require_screenshot || false;

        document.getElementById('checkout-payment').innerHTML = `
            <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.07em;margin-bottom:var(--space-5)">
                Payment Details
            </div>

            <!-- Account info -->
            <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-5);display:flex;align-items:center;gap:var(--space-3)">
                <div style="width:38px;height:38px;border-radius:50%;background:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:var(--text-sm);font-weight:700;color:#fff;flex-shrink:0">
                    ${Helpers.getInitials(user?.first_name, user?.last_name)}
                </div>
                <div>
                    <div style="font-weight:600;font-size:var(--text-sm)">${user?.first_name || ''} ${user?.last_name || ''}</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${user?.email || ''}</div>
                </div>
            </div>

            <!-- Payment method selector -->
            <div class="form-label" style="margin-bottom:var(--space-3)">Payment Method</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-5)">
                ${methods.map((m, i) => `
                <label
                    id="method-lbl-${m.value}"
                    onclick="updateCheckoutMethod('${m.value}')"
                    style="display:flex;align-items:center;gap:var(--space-3);border:2px solid ${i === 0 ? 'var(--color-accent)' : 'var(--color-border)'};border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);cursor:pointer;transition:border-color .15s">
                    <input type="radio" name="payMethod" value="${m.value}" ${i === 0 ? 'checked' : ''} style="display:none">
                    <span style="font-size:20px">${m.icon}</span>
                    <span style="font-size:var(--text-sm);font-weight:500">${m.label}</span>
                </label>`).join('')}
                ${methods.length === 0 ? '<p style="color:var(--color-text-muted);font-size:var(--text-sm);grid-column:1/-1">No payment methods available. Please contact us.</p>' : ''}
            </div>

            <!-- Dynamic instructions -->
            <div id="checkout-instr">
                ${firstSetting ? _buildInstructions(firstSetting, plan.price) : ''}
            </div>

            <!-- Reference number -->
            <div class="form-group" id="ref-group">
                <label class="form-label">
                    Reference Number <span style="color:var(--color-error)">*</span>
                </label>
                <input
                    type="text"
                    id="refNumber"
                    class="form-input"
                    placeholder="e.g. 1234567890">
                <span style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-1);display:block">
                    Enter the reference number shown in your payment confirmation.
                </span>
            </div>

            <!-- Proof of payment upload (shown when method requires screenshot) -->
            <div id="proof-upload-section" style="display:${firstRequiresProof ? 'block' : 'none'};margin-bottom:var(--space-1)">
                <label class="form-label" style="margin-bottom:var(--space-2)">
                    📸 Proof of Payment <span style="color:var(--color-error)">*</span>
                </label>
                <div id="proof-dropzone"
                     onclick="document.getElementById('proofFile').click()"
                     style="border:2px dashed var(--color-border);border-radius:var(--radius-md);
                            padding:var(--space-5);text-align:center;cursor:pointer;
                            transition:border-color .2s,background .2s"
                     onmouseover="this.style.borderColor='var(--color-accent)';this.style.background='var(--color-surface)'"
                     onmouseout="this.style.borderColor='var(--color-border)';this.style.background='transparent'">
                    <div id="proof-preview-wrap" style="display:none;margin-bottom:var(--space-2)">
                        <img id="proof-img-preview"
                             style="max-width:100%;max-height:180px;border-radius:var(--radius-sm);object-fit:contain">
                        <p style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-1)">
                            Click to change
                        </p>
                    </div>
                    <div id="proof-upload-placeholder">
                        <div style="font-size:36px;margin-bottom:var(--space-2)">📷</div>
                        <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:4px">
                            Upload screenshot of your transfer
                        </div>
                        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">
                            JPG or PNG · max 5 MB
                        </div>
                    </div>
                </div>
                <input type="file" id="proofFile" accept="image/jpeg,image/png,image/jpg,image/webp"
                       style="display:none" onchange="previewProofImage(this)">
            </div>

            <div id="checkoutError" class="form-error" style="margin-bottom:var(--space-4);display:none"></div>

            <button
                id="checkoutBtn"
                onclick="handleCheckoutSubmit('${plan.id}', '${plan.name}', false)"
                class="btn btn--accent btn--full btn--lg">
                Complete Subscription &mdash; &#8369;${Number(plan.price).toLocaleString()}
            </button>

            <p style="text-align:center;font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-3)">
                🔒 Secure payment &nbsp;·&nbsp; Cancel anytime
            </p>
        `;
    }
}


// ── js/pages/dashboard.js ──
async function renderDashboardPage(app) {
    const user = Store.get('user');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Render skeleton first
    const skeleton = Helpers.renderSkeleton('dashboard');
    app.innerHTML = renderAppLayout(skeleton, `Welcome back, ${user.first_name}`, "Here's your productivity overview");

    // Fetch real data
    let stats = { xp: user.xp || 0, streak_days: user.streak_days || 0, total_sessions: 0, total_minutes: 0 };
    let bookings = [];
    let challenges = [];
    let weekly = [];

    try {
        [stats, bookings, challenges, weekly] = await Promise.all([
            API.get('/users/stats').catch(() => stats),
            API.get('/bookings').catch(() => []),
            API.get('/achievements/challenges').catch(() => []),
            API.get('/analytics/weekly').catch(() => []),
        ]);
        // Trigger day-before booking reminder emails (non-blocking, silent)
        API.get('/bookings/upcoming-reminders').catch(() => {});
    } catch(e) { /* use defaults */ }

    const level = Helpers.getLevel(stats.xp || 0);
    const totalMinutes = Math.round(stats.total_minutes || 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const studyDisplay = Helpers.formatDuration(totalMinutes);

    // ── Membership card (pre-computed to avoid nested backtick issues) ──────
    const planName  = Helpers.esc(stats.plan_name || 'Explorer');
    const planPrice = stats.plan_price || 0;
    const planBadge = stats.plan_badge ? Helpers.esc(stats.plan_badge) : null;
    const expiresAt = stats.membership_expires_at;
    const isFree    = planPrice === 0;
    const isPro     = planName === 'Pro';
    const planIcon  = isFree ? '✨' : isPro ? '👑' : '🎓';
    const planColor = isFree ? 'var(--color-text-secondary)' : isPro ? '#b8860b' : 'var(--color-accent)';
    const expiryLine = isFree
        ? '<span style="font-size:var(--text-xs);color:var(--color-text-secondary)">Free forever</span>'
        : expiresAt
            ? '<span style="font-size:var(--text-xs);color:var(--color-text-secondary)">Renews ' + new Date(expiresAt).toLocaleDateString('en-PH', {month:'short',day:'numeric',year:'numeric'}) + '</span>'
            : '';
    const planCTA = isFree
        ? '<a href="/pricing" data-link class="btn btn--accent btn--sm btn--full" style="margin-top:var(--space-4)">Upgrade to Scholar</a>'
        : '<a href="/subscription" data-link class="btn btn--outline btn--sm btn--full" style="margin-top:var(--space-4)">Manage Subscription</a>';
    const priceBadge = !isFree
        ? '<div style="margin-left:auto;text-align:right"><div style="font-weight:700;font-size:var(--text-base);color:var(--color-accent)">&#8369;' + Number(planPrice).toLocaleString() + '</div><div style="font-size:var(--text-xs);color:var(--color-text-secondary)">/month</div></div>'
        : '';
    const membershipCard = `
    <div class="dashboard-card">
        <div class="dashboard-card__header">
            <h3 class="dashboard-card__title">Membership Plan</h3>
            ${planBadge ? '<span class="badge badge--accent">' + planBadge + '</span>' : ''}
        </div>
        <div class="dashboard-card__body">
            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
                <div style="width:44px;height:44px;border-radius:var(--radius-md);background:var(--color-surface);border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${planIcon}</div>
                <div>
                    <div style="font-weight:700;font-size:var(--text-lg);color:${planColor}">${planName}</div>
                    ${expiryLine}
                </div>
                ${priceBadge}
            </div>
            ${planCTA}
        </div>
    </div>`;
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const upcomingBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed' && b.booking_date >= today).slice(0, 3);
    const completedChallenges = challenges.filter(c => c.completed).length;

    // Build weekly chart from API data
    const dayMap = {};
    for (const d of weekly) {
        const dow = new Date(d.score_date).getDay();
        const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dow];
        dayMap[dayName] = Math.round((d.total_minutes || 0) / 60 * 10) / 10;
    }
    const weeklyBars = days.map(d => dayMap[d] || 0);
    const maxBar = Math.max(...weeklyBars, 1);
    const normalizedBars = weeklyBars.map(v => Math.round((v / maxBar) * 100));

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card" id="xp-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total XP</span>
                    <span class="dashboard-stat-card__icon">⭐</span>
                </div>
                <div class="dashboard-stat-card__value">${(stats.xp || 0).toLocaleString()}</div>
                <div class="dashboard-stat-card__change">Level ${level}</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Study Streak</span>
                    <span class="dashboard-stat-card__icon">🔥</span>
                </div>
                <div class="dashboard-stat-card__value">${stats.streak_days || 0} ${(stats.streak_days || 0) === 1 ? 'day' : 'days'}</div>
                <div class="dashboard-stat-card__change">Keep it up!</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Total Study</span>
                    <span class="dashboard-stat-card__icon">⏱</span>
                </div>
                <div class="dashboard-stat-card__value">${studyDisplay}</div>
                <div class="dashboard-stat-card__change">${stats.total_sessions || 0} sessions</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Badges</span>
                    <span class="dashboard-stat-card__icon">🏆</span>
                </div>
                <div class="dashboard-stat-card__value">${stats.badge_count || 0}</div>
                <div class="dashboard-stat-card__change">Achievements</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Weekly Activity</h3>
                        <span class="badge badge--accent">This Week</span>
                    </div>
                    <div class="dashboard-card__body">
                        ${Helpers.renderBarChart(normalizedBars, days)}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Upcoming Bookings</h3>
                        <a href="/bookings" data-link class="btn btn--ghost btn--sm">View All</a>
                    </div>
                    <div class="dashboard-card__body" style="padding:0">
                        ${upcomingBookings.length === 0 ? `
                            <div style="padding:var(--space-6);text-align:center;color:var(--color-text-muted);font-size:var(--text-sm)">
                                No upcoming bookings.<br>
                                <a href="/bookings" data-link class="btn btn--outline btn--sm" style="margin-top:var(--space-3);display:inline-block">Book a Space</a>
                            </div>
                        ` : upcomingBookings.map(b => `
                            <div style="padding:var(--space-4) var(--space-6);border-bottom:1px solid var(--color-border-light);display:flex;align-items:center;justify-content:space-between">
                                <div style="display:flex;align-items:center;gap:var(--space-4)">
                                    <div style="width:40px;height:40px;border-radius:var(--radius-md);background:rgba(0,66,57,0.08);display:flex;align-items:center;justify-content:center">📅</div>
                                    <div>
                                        <div style="font-weight:var(--weight-medium);font-size:var(--text-sm)">${b.space_name || 'Space'}</div>
                                        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : ''}, ${b.start_time} – ${b.end_time}</div>
                                    </div>
                                </div>
                                <span class="badge badge--${b.status === 'confirmed' ? 'success' : b.status === 'checked_in' ? 'accent' : 'primary'}">${b.status}</span>
                            </div>
                        `).join('')}
                        ${upcomingBookings.length > 0 ? `<div style="padding:var(--space-3) var(--space-6);text-align:center"><a href="/bookings" data-link class="btn btn--outline btn--sm">Book a Space</a></div>` : ''}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Daily Challenges</h3>
                        <span class="badge badge--${completedChallenges === challenges.length && challenges.length > 0 ? 'success' : 'warning'}">${completedChallenges}/${challenges.length} Complete</span>
                    </div>
                    <div class="dashboard-card__body" style="padding:var(--space-4) var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)">
                        ${challenges.length === 0 ? `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">No challenges today.</div>` :
                          challenges.map(c => {
                            const pct = Math.min(100, Math.round((c.progress / c.target_value) * 100));
                            const done = c.completed;
                            return `
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
                                    <span style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${done ? '✅' : '⏳'} ${c.title}</span>
                                    <span style="font-size:var(--text-xs);color:var(--color-${done ? 'success' : 'text-muted'})">+${c.xp_reward} XP</span>
                                </div>
                                <div class="progress"><div class="progress__bar${done ? '' : ' progress__bar--warm'}" style="width:${done ? 100 : pct}%"></div></div>
                            </div>`;
                          }).join('')}
                    </div>
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                ${membershipCard}

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Focus Timer</h3>
                    </div>
                    <div class="dashboard-card__body" style="padding:0">
                        ${Timer.renderWidget()}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Progress</h3>
                        <span style="font-size:var(--text-xs);color:var(--color-text-muted)">Level ${level}</span>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="margin-bottom:var(--space-3)">
                            <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-2)">
                                <span>${(stats.xp || 0).toLocaleString()} XP</span>
                                <span>${(level * 1000).toLocaleString()} XP</span>
                            </div>
                            <div class="progress"><div class="progress__bar" style="width:${Helpers.getLevelProgress(stats.xp || 0)}%"></div></div>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-top:var(--space-4)">
                            <div class="stat"><div class="stat__value">${studyDisplay}</div><div class="stat__label">Study Time</div></div>
                            <div class="stat"><div class="stat__value">${stats.streak_days || 0}</div><div class="stat__label">Day Streak</div></div>
                            <div class="stat"><div class="stat__value">${stats.total_sessions || 0}</div><div class="stat__label">Sessions</div></div>
                            <div class="stat"><div class="stat__value">${stats.total_bookings || 0}</div><div class="stat__label">Bookings</div></div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Study Insights</h3>
                        <span class="badge badge--accent">Live</span>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
                            <div style="padding:var(--space-3);background:var(--color-bg);border-radius:var(--radius-md)">
                                <div style="font-size:var(--text-sm);font-weight:var(--weight-medium);margin-bottom:var(--space-1)">🧠 Keep Going!</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">You've studied ${studyDisplay} total. ${totalHours < 100 ? `${100 - totalHours} more hours to unlock the 100 Hours badge!` : `You've earned the 100 Hours badge!`}</div>
                            </div>
                            <div style="padding:var(--space-3);background:var(--color-bg);border-radius:var(--radius-md)">
                                <div style="font-size:var(--text-sm);font-weight:var(--weight-medium);margin-bottom:var(--space-1)">📈 Streak Tip</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${stats.streak_days >= 7 ? `Amazing ${stats.streak_days}-day streak! You're in the top tier of learners.` : `You're on a ${stats.streak_days || 0}-day streak. Aim for 7 days to unlock Streak Master!`}</div>
                            </div>
                            <div style="padding:var(--space-3);background:var(--color-bg);border-radius:var(--radius-md)">
                                <div style="font-size:var(--text-sm);font-weight:var(--weight-medium);margin-bottom:var(--space-1)">💡 Next Goal</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">Next level at ${(level * 1000).toLocaleString()} XP — you need ${Math.max(0, level * 1000 - (stats.xp || 0))} more XP. Complete daily challenges to level up faster!</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, `Welcome back, ${user.first_name}`, "Here's your productivity overview");
    // Restore timer state — resume() keeps it running across page navigations
    if (typeof Timer !== 'undefined') Timer.resume();

    // ── XP change animation ─────────────────────────────────────────────
    const lastXP = parseInt(sessionStorage.getItem('mugtuon_last_xp') || '0');
    const currentXP = stats.xp || 0;
    if (lastXP > 0 && currentXP > lastXP) {
        const card = document.getElementById('xp-card');
        if (card) card.classList.add('xp-pulse');
    }
    sessionStorage.setItem('mugtuon_last_xp', String(currentXP));

    // ── Onboarding modal for new users ───────────────────────────────────
    if (!localStorage.getItem('mugtuon_onboarded') && stats.total_sessions === 0 && (stats.total_bookings || 0) === 0) {
        const ob = document.createElement('div');
        ob.id = 'onboarding-modal';
        ob.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1200;display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
        ob.innerHTML = `
            <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:480px;box-shadow:var(--shadow-xl);overflow:hidden" onclick="event.stopPropagation()">
                <div style="background:linear-gradient(135deg,var(--color-primary),var(--color-accent));padding:var(--space-10);text-align:center;color:white">
                    <img src="images/logo-icon-dark.png" alt="MugTuon" style="width:72px;height:72px;border-radius:50%;margin-bottom:var(--space-4)">
                    <h2 style="font-size:var(--text-2xl);margin-bottom:var(--space-2)">Welcome to MugTuon!</h2>
                    <p style="opacity:.85;font-size:var(--text-sm)">Your productivity journey starts here.</p>
                </div>
                <div style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-5)">
                    <div style="display:flex;align-items:center;gap:var(--space-4)">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-accent);color:white;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">1</div>
                        <div><div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Start a Focus Timer</div><div style="font-size:var(--text-xs);color:var(--color-text-muted)">Use Pomodoro or Deep Work mode to earn XP</div></div>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--space-4)">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-accent);color:white;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">2</div>
                        <div><div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Book a Study Space</div><div style="font-size:var(--text-xs);color:var(--color-text-muted)">Reserve your spot and check in with QR</div></div>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--space-4)">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-accent);color:white;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">3</div>
                        <div><div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Climb the Leaderboard</div><div style="font-size:var(--text-xs);color:var(--color-text-muted)">Earn XP, unlock badges, and build your streak</div></div>
                    </div>
                    <button class="btn btn--accent btn--lg btn--full" onclick="localStorage.setItem('mugtuon_onboarded','1');document.getElementById('onboarding-modal').remove()">Let's Go!</button>
                </div>
            </div>`;
        ob.onclick = () => { localStorage.setItem('mugtuon_onboarded', '1'); ob.remove(); };
        document.body.appendChild(ob);
    }
}


// ── js/pages/profile.js ──
﻿async function renderProfilePage(app) {
    const user = Store.get('user');
    if (!user) { Router.navigate('/login'); return; }
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading profile...</div>`,
        'My Profile', 'Manage your account and view your stats'
    );

    let stats = { total_sessions:0, total_minutes:0, xp: user.xp||0, streak_days: user.streak_days||0, badge_count:0, total_bookings:0 };
    let profile = user;
    try {
        const timeoutMs = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
        [profile, stats] = await Promise.race([
            Promise.all([
                API.get('/users/profile').catch(() => user),
                API.get('/users/stats').catch(() => stats),
            ]),
            timeoutMs
        ]);
    } catch(e) {}

    const xp    = stats.xp || profile.xp || 0;
    const level = Helpers.getLevel(xp);
    const xpInLevel  = xp % 1000;
    const xpForNext  = 1000;
    const totalMinutes = Math.round(stats.total_minutes||0);
    const totalHours = Math.floor(totalMinutes/60);
    const studyDisplay = Helpers.formatDuration(totalMinutes);
    const memberSince = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-PH',{month:'long',year:'numeric'})
        : 'Unknown';

    const levelTitles = ['','Beginner','Scholar','Achiever','Expert','Master','Legend'];
    const levelTitle  = levelTitles[Math.min(level, levelTitles.length-1)] || 'Legend';

    const isVerified = profile.is_verified !== false;
    const verifyBanner = !isVerified ? `
        <div style="background:rgba(255,180,0,.1);border:1px solid var(--color-warning);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-6);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-3)">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
                <span style="font-size:20px">⚠️</span>
                <div>
                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Email not verified</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Check your inbox for the verification link.</div>
                </div>
            </div>
            <button class="btn btn--outline btn--sm" onclick="resendVerificationEmail()">Resend Email</button>
        </div>` : '';

    const content = `
        ${verifyBanner}
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:var(--space-6)">
            <div class="dashboard-card">
                <div class="dashboard-card__body" style="text-align:center">
                    <div style="position:relative;display:inline-block;margin-bottom:var(--space-4);cursor:pointer" onclick="document.getElementById('avatarInput').click()" title="Click to change photo">
                        ${Helpers.renderAvatar(profile.avatar_url, profile.first_name, profile.last_name, 'xl')}
                        <div style="position:absolute;bottom:0;right:0;width:26px;height:26px;background:var(--color-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid white">📷</div>
                    </div>
                    <input type="file" id="avatarInput" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="handleAvatarUpload(this)">
                    <h3 style="margin-bottom:var(--space-1)">${profile.first_name} ${profile.last_name}</h3>
                    <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">${profile.email}</p>
                    <span class="badge badge--accent" style="margin-bottom:var(--space-6)">${profile.role}</span>
                    <hr class="divider">
                    <div style="display:flex;flex-direction:column;gap:var(--space-4);text-align:left">
                        <div>
                            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Level ${level} — ${levelTitle}</div>
                            <div style="font-weight:var(--weight-semibold)">${xp.toLocaleString()} XP</div>
                            <div class="progress" style="margin-top:var(--space-2)">
                                <div class="progress__bar" style="width:${Math.round((xpInLevel/xpForNext)*100)}%"></div>
                            </div>
                            <div style="font-size:11px;color:var(--color-text-muted);margin-top:var(--space-1)">${xpInLevel} / ${xpForNext} XP to next level</div>
                        </div>
                        <div>
                            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Member Since</div>
                            <div style="font-weight:var(--weight-medium);font-size:var(--text-sm)">${memberSince}</div>
                        </div>
                        <div>
                            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Study Streak</div>
                            <div style="font-weight:var(--weight-medium);font-size:var(--text-sm)">🔥 ${profile.streak_days||stats.streak_days||0} ${(profile.streak_days||stats.streak_days||0) === 1 ? 'day' : 'days'}</div>
                        </div>
                        ${profile.university ? `<div>
                            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">University</div>
                            <div style="font-weight:var(--weight-medium);font-size:var(--text-sm)">${profile.university}</div>
                        </div>` : ''}
                    </div>
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Profile Settings</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <form onsubmit="handleProfileUpdate(event)">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                                <div class="form-group">
                                    <label class="form-label">First Name</label>
                                    <input type="text" class="form-input" value="${profile.first_name||''}" id="profileFirstName" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Last Name</label>
                                    <input type="text" class="form-input" value="${profile.last_name||''}" id="profileLastName" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-input" value="${profile.email||''}" disabled>
                                <div class="form-hint">Email cannot be changed</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">University / School</label>
                                <input type="text" class="form-input" value="${profile.university||''}" id="profileUniversity" placeholder="Your university">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Course / Program</label>
                                <input type="text" class="form-input" value="${profile.course||''}" id="profileCourse" placeholder="e.g. BS Computer Science">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Bio</label>
                                <textarea class="form-input" rows="3" id="profileBio" placeholder="Tell us about yourself...">${profile.bio||''}</textarea>
                            </div>
                            <div id="profileError" class="form-error" style="display:none;margin-bottom:var(--space-4)"></div>
                            <button type="submit" class="btn btn--accent" id="profileSaveBtn">Save Changes</button>
                        </form>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Change Password</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <form onsubmit="handlePasswordChange(event)">
                            <div class="form-group">
                                <label class="form-label">Current Password</label>
                                <input type="password" class="form-input" id="currentPassword" required>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                                <div class="form-group">
                                    <label class="form-label">New Password</label>
                                    <input type="password" class="form-input" id="newPassword" required minlength="8">
                                    <div id="profilePwStrength"></div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Confirm New Password</label>
                                    <input type="password" class="form-input" id="confirmPassword" required minlength="8">
                                </div>
                            </div>
                            <div id="passwordError" class="form-error" style="display:none;margin-bottom:var(--space-4)"></div>
                            <button type="submit" class="btn btn--outline" id="passwordSaveBtn">Update Password</button>
                        </form>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Email Preferences</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
                                <div>
                                    <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">Booking confirmations</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Receive email when a booking is confirmed or cancelled</div>
                                </div>
                                <input type="checkbox" id="prefBooking" ${profile.email_booking !== false ? 'checked' : ''} onchange="saveEmailPrefs()" style="accent-color:var(--color-accent);width:18px;height:18px">
                            </label>
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
                                <div>
                                    <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">Booking reminders</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Day-before reminders for upcoming bookings</div>
                                </div>
                                <input type="checkbox" id="prefReminder" ${profile.email_reminder !== false ? 'checked' : ''} onchange="saveEmailPrefs()" style="accent-color:var(--color-accent);width:18px;height:18px">
                            </label>
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
                                <div>
                                    <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">Renewal reminders</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Get notified before your subscription expires</div>
                                </div>
                                <input type="checkbox" id="prefRenewal" ${profile.email_renewal !== false ? 'checked' : ''} onchange="saveEmailPrefs()" style="accent-color:var(--color-accent);width:18px;height:18px">
                            </label>
                        </div>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Lifetime Stats</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-6);text-align:center">
                            <div class="stat"><div class="stat__value">${studyDisplay}</div><div class="stat__label">Study Time</div></div>
                            <div class="stat"><div class="stat__value">${stats.total_sessions||0}</div><div class="stat__label">Sessions</div></div>
                            <div class="stat"><div class="stat__value">${stats.badge_count||0}</div><div class="stat__label">Badges</div></div>
                            <div class="stat"><div class="stat__value">${stats.total_bookings||0}</div><div class="stat__label">Bookings</div></div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Your Data</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">Download a copy of all your data including your profile, bookings, study sessions, achievements, and payment history.</p>
                        <button class="btn btn--outline btn--sm" onclick="exportMyData()">Download My Data</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'My Profile', 'Manage your account and view your stats');
    Helpers.renderPasswordStrength('newPassword', 'profilePwStrength');
}

async function resendVerificationEmail() {
    try {
        await API.post('/auth/resend-verification');
        Helpers.showToast('Email Sent', 'Verification email resent. Check your inbox.', 'success');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function handleAvatarUpload(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
        Helpers.showToast('Error', 'Image must be under 2MB', 'error');
        return;
    }
    try {
        const formData = new FormData();
        formData.append('avatar', file);
        const res = await fetch(API.base + '/users/avatar', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        const user = Store.get('user');
        if (user && data.avatar_url) {
            user.avatar_url = data.avatar_url;
            Store.login(user);
        }
        Helpers.showToast('Avatar Updated', 'Your profile photo has been changed.', 'success');
        Router.navigate('/profile');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const btn = document.getElementById('passwordSaveBtn');
    const errEl = document.getElementById('passwordError');
    errEl.style.display = 'none';

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        errEl.textContent = 'New passwords do not match';
        errEl.style.display = 'block';
        return;
    }
    const strength = Helpers.getPasswordStrength(newPassword);
    if (strength.score < 3) {
        errEl.textContent = 'Password needs at least 8 characters with uppercase, lowercase, and a number';
        errEl.style.display = 'block';
        return;
    }

    btn.textContent = 'Updating...'; btn.disabled = true;
    try {
        await API.put('/users/password', { currentPassword, newPassword });
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        Helpers.showToast('Password Updated', 'Your password has been changed. Other sessions have been signed out.', 'success');
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.textContent = 'Update Password'; btn.disabled = false;
    }
}

async function saveEmailPrefs() {
    try {
        await API.put('/users/email-preferences', {
            email_booking: document.getElementById('prefBooking')?.checked !== false,
            email_reminder: document.getElementById('prefReminder')?.checked !== false,
            email_renewal: document.getElementById('prefRenewal')?.checked !== false,
        });
        Helpers.showToast('Saved', 'Email preferences updated.', 'success');
    } catch(e) {
        Helpers.showToast('Error', e.message, 'error');
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const btn  = document.getElementById('profileSaveBtn');
    const errEl = document.getElementById('profileError');
    errEl.style.display = 'none';
    btn.textContent = 'Saving...'; btn.disabled = true;

    try {
        const updated = await API.put('/users/profile', {
            firstName:  document.getElementById('profileFirstName').value,
            lastName:   document.getElementById('profileLastName').value,
            university: document.getElementById('profileUniversity').value,
            course:     document.getElementById('profileCourse').value,
            bio:        document.getElementById('profileBio').value,
            phone:      Store.get('user')?.phone || null,
        });

        // Update stored user
        const user = Store.get('user');
        Object.assign(user, {
            first_name: updated.first_name,
            last_name:  updated.last_name,
            university: updated.university,
            course:     updated.course,
            bio:        updated.bio,
        });
        Store.set('user', user);
        localStorage.setItem('mugtuon_user', JSON.stringify(user));
        Helpers.showToast('Profile Updated', 'Your changes have been saved.', 'success');
    } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.textContent = 'Save Changes'; btn.disabled = false;
    }
}

async function exportMyData() {
    try {
        Helpers.showToast('Exporting', 'Preparing your data...', 'info');
        const data = await API.get('/users/export');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mugtuon-my-data.json';
        a.click();
        URL.revokeObjectURL(url);
        Helpers.showToast('Downloaded', 'Your data has been exported.', 'success');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}


// ── js/pages/subscription.js ──
async function renderSubscriptionPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading subscription...</div>`,
        'My Subscription',
        'Manage your membership plan'
    );

    let sub = { plan: { name: 'Explorer', price: 0, features: [], expires_at: null, cancelled_at: null }, payments: [] };
    try {
        sub = await API.get('/users/subscription');
    } catch (e) {
        Helpers.showToast('Error', 'Failed to load subscription data', 'error');
    }

    const p = sub.plan;
    const isFree = !p.id || p.price === 0;
    const isCancelled = !!p.cancelled_at;
    const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
    const planIcon = isFree ? '✨' : '🎓';
    const planColor = isFree ? 'var(--color-text-secondary)' : 'var(--color-accent)';
    const expiryDate = p.expires_at
        ? new Date(p.expires_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';

    const defaultExplorerFeatures = ['1 booking per day', 'Basic study timer', 'Community leaderboard', 'Access to community areas'];
    let features = Array.isArray(p.features) ? p.features : [];
    if (features.length === 0 && (!p.id || p.price === 0)) features = defaultExplorerFeatures;
    const featuresList = features.length > 0
        ? features.map(f => `
            <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0">
                <span style="color:var(--color-success);font-size:var(--text-sm)">&#10003;</span>
                <span style="font-size:var(--text-sm)">${f}</span>
            </div>`).join('')
        : `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">Basic access included</div>`;

    let expiryInfo = '';
    let statusBadge = '';
    let actionButtons = '';

    if (isFree) {
        expiryInfo = '<span style="font-size:var(--text-sm);color:var(--color-text-secondary)">Free forever</span>';
        statusBadge = '<span class="badge badge--primary">Free</span>';
        actionButtons = `<a href="/pricing" data-link class="btn btn--accent">Upgrade Now</a>`;
    } else if (isExpired) {
        expiryInfo = `<span style="font-size:var(--text-sm);color:var(--color-error);font-weight:var(--weight-medium)">Expired ${expiryDate}</span>`;
        statusBadge = '<span class="badge badge--error">Expired</span>';
        actionButtons = `<a href="/pricing" data-link class="btn btn--accent">Renew Subscription</a>`;
    } else if (isCancelled) {
        expiryInfo = `<span style="font-size:var(--text-sm);color:var(--color-warning);font-weight:var(--weight-medium)">Cancels ${expiryDate}</span>`;
        statusBadge = '<span class="badge badge--warning">Cancelling</span>';
        actionButtons = `<button class="btn btn--accent" onclick="reactivateSubscription()">Reactivate</button>
                         <a href="/pricing" data-link class="btn btn--outline">Change Plan</a>`;
    } else {
        expiryInfo = p.expires_at
            ? `<span style="font-size:var(--text-sm);color:var(--color-text-secondary)">Renews ${expiryDate}</span>`
            : '';
        statusBadge = '<span class="badge badge--success">Active</span>';
        actionButtons = `<a href="/pricing" data-link class="btn btn--outline">Change Plan</a>
                         <button class="btn btn--ghost" style="color:var(--color-error)" onclick="cancelSubscription()">Cancel Subscription</button>`;
    }

    const cancelNote = isCancelled && !isExpired
        ? `<div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-5);font-size:var(--text-sm);color:var(--color-text-secondary)">
               Your plan remains active until <strong>${expiryDate}</strong>. After that, you'll be moved to the free Explorer plan. You can reactivate anytime before then.
           </div>`
        : '';

    const content = `
        <div style="max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:var(--space-6)">
            <div class="dashboard-card">
                <div class="dashboard-card__header">
                    <h3 class="dashboard-card__title">Current Plan</h3>
                    ${statusBadge}
                </div>
                <div class="dashboard-card__body">
                    <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-5)">
                        <div style="width:56px;height:56px;border-radius:var(--radius-lg);background:var(--color-bg);border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${planIcon}</div>
                        <div style="flex:1">
                            <div style="font-weight:var(--weight-bold);font-size:var(--text-xl);color:${planColor}">${p.name}</div>
                            ${expiryInfo}
                        </div>
                        ${!isFree ? `
                        <div style="text-align:right">
                            <div style="font-weight:var(--weight-bold);font-size:var(--text-xl);color:var(--color-accent)">&#8369;${Number(p.price).toLocaleString()}</div>
                            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">/${p.billing_period || 'month'}</div>
                        </div>` : ''}
                    </div>

                    ${cancelNote}

                    ${p.description ? `<p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4)">${p.description}</p>` : ''}

                    <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4);margin-bottom:var(--space-5)">
                        <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm);margin-bottom:var(--space-2)">Plan Features</div>
                        ${featuresList}
                    </div>

                    <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
                        ${actionButtons}
                    </div>
                </div>
            </div>

            <div class="dashboard-card">
                <div class="dashboard-card__header">
                    <h3 class="dashboard-card__title">Payment History</h3>
                    <span class="badge badge--primary">${sub.payments.length} record${sub.payments.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                    ${sub.payments.length === 0
                        ? `<div style="padding:var(--space-6);text-align:center;color:var(--color-text-muted);font-size:var(--text-sm)">No membership payments yet.</div>`
                        : `<table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Method</th>
                                    <th>Reference</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sub.payments.map(pay => {
                                    const badge = { completed: 'success', pending: 'warning', failed: 'error', refunded: 'error' }[pay.status] || 'primary';
                                    return `<tr>
                                        <td style="font-size:var(--text-sm)">${Helpers.formatDate(pay.created_at)}</td>
                                        <td style="font-size:var(--text-sm);text-transform:capitalize">${pay.payment_method || '—'}</td>
                                        <td style="font-size:var(--text-xs);color:var(--color-text-muted)">${pay.reference_number || '—'}</td>
                                        <td style="font-weight:var(--weight-semibold)">${Helpers.formatCurrency(pay.amount)}</td>
                                        <td><span class="badge badge--${badge}">${pay.status}</span></td>
                                        <td>${pay.status === 'completed' ? `<button class="btn btn--ghost btn--xs" onclick="downloadReceipt(${JSON.stringify(pay).replace(/"/g,'&quot;')}, '${p.name}')">📄</button>` : ''}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>`}
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'My Subscription', 'Manage your membership plan');
}

async function cancelSubscription() {
    if (!await Helpers.confirmAction('Cancel Subscription?', 'Your plan will remain active until the current billing period ends.', { confirmText: 'Yes, Cancel', type: 'warning' })) return;
    try {
        await API.post('/users/subscription/cancel');
        Helpers.showToast('Cancelled', 'Your subscription will end at the current billing period.', 'success');
        Router.navigate('/subscription');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

function downloadReceipt(payment, planName) {
    const user = Store.get('user');
    const date = Helpers.formatDate(payment.created_at);
    const receiptHTML = `
<!DOCTYPE html>
<html><head><title>Receipt</title>
<style>
    body { font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #1a1612; }
    .header { text-align: center; border-bottom: 2px solid #543020; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #543020; margin: 0; font-size: 24px; }
    .header p { color: #6b5e54; margin: 5px 0 0; font-size: 14px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8e3df; font-size: 14px; }
    .row .label { color: #6b5e54; }
    .row .value { font-weight: 600; }
    .total { display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; font-size: 18px; font-weight: 700; border-top: 2px solid #543020; }
    .total .amount { color: #004239; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #9b8e84; }
    @media print { body { margin: 0; } }
</style></head><body>
    <div class="header">
        <h1>MugTuon Learning Hub & Cafe</h1>
        <p>Payment Receipt</p>
    </div>
    <div class="row"><span class="label">Receipt No.</span><span class="value">${payment.id ? payment.id.slice(0, 8).toUpperCase() : 'N/A'}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
    <div class="row"><span class="label">Customer</span><span class="value">${user?.first_name || ''} ${user?.last_name || ''}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${user?.email || ''}</span></div>
    <div class="row"><span class="label">Plan</span><span class="value">${planName}</span></div>
    <div class="row"><span class="label">Payment Method</span><span class="value" style="text-transform:capitalize">${payment.payment_method || 'N/A'}</span></div>
    <div class="row"><span class="label">Reference No.</span><span class="value">${payment.reference_number || 'N/A'}</span></div>
    <div class="row"><span class="label">Status</span><span class="value" style="color:#1a7a5c">Completed</span></div>
    <div class="total"><span>Total Paid</span><span class="amount">PHP ${Number(payment.amount).toLocaleString(undefined, {minimumFractionDigits:2})}</span></div>
    <div class="footer">
        <p>Thank you for your payment!</p>
        <p>MugTuon Learning Hub & Cafe &bull; mugtuonlhc@gmail.com</p>
    </div>
</body></html>`;

    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
        w.onload = () => { w.print(); };
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function reactivateSubscription() {
    try {
        await API.post('/users/subscription/reactivate');
        Helpers.showToast('Reactivated', 'Your subscription is active again.', 'success');
        Router.navigate('/subscription');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}


// ── js/pages/bookings.js ──
﻿// Bookings page state
let selectedSpaceId = null;
let selectedSpaceName = '';
let selectedSpaceRate = 0;
let selectedSlots = [];
let _cachedSpaces = [];
let _allUserBookings = [];
let _bookingHistoryPage = 1;
const _bookingHistoryLimit = 10;

async function renderBookingsPage(app) {
    selectedSpaceId = null;
    selectedSpaceName = '';
    selectedSpaceRate = 0;
    selectedSlots = [];
    _cachedSpaces = [];
    _allUserBookings = [];
    _bookingHistoryPage = 1;

    const _n = new Date(); const today = _n.getFullYear() + '-' + String(_n.getMonth() + 1).padStart(2, '0') + '-' + String(_n.getDate()).padStart(2, '0');

    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading spaces...</div>`,
        'Book a Space', 'Find and reserve your perfect study spot'
    );

    let spaces = [];
    let bookedSlotsForDate = [];

    try {
        const [spacesData, userBookings] = await Promise.all([
            API.get(`/spaces?date=${today}`),
            API.get('/bookings').catch(() => [])
        ]);
        spaces = spacesData;
        _cachedSpaces = spaces;
        _allUserBookings = userBookings;

        // Build booked slots from ALL users on the selected date (from space data)
        bookedSlotsForDate = _getBookedSlotsFromSpaces(spaces, today);
    } catch(e) {
        spaces = _cachedSpaces;
    }

    _renderBookingLayout(app, spaces, bookedSlotsForDate, today);
}

function _getBookedSlotsFromSpaces(spaces, date) {
    // If a space is selected, show its booked slots; otherwise no slots shown
    if (!selectedSpaceId) return [];
    const space = spaces.find(s => s.id === selectedSpaceId);
    if (!space || !space.booked_slots) return [];
    const slots = [];
    for (const b of space.booked_slots) {
        const startH = parseInt(b.start_time);
        const endH = parseInt(b.end_time);
        for (let h = startH; h < endH; h++) {
            slots.push(`${String(h).padStart(2, '0')}:00`);
        }
    }
    return slots;
}

function _isSlotPast(slot, dateVal) {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    if (dateVal !== todayStr) return false;
    return parseInt(slot) <= now.getHours();
}

function _renderBookingLayout(app, spaces, bookedSlots, today) {
    const timeSlots = [];
    for (let h = 10; h <= 28; h++) timeSlots.push(`${String(h % 24).padStart(2,'0')}:00`);

    const spacesHtml = spaces.map(s => {
        const amenities = Array.isArray(s.amenities) ? s.amenities :
                          (typeof s.amenities === 'string' ? JSON.parse(s.amenities || '[]') : []);
        return `
            <div class="space-card" data-type="${s.type}" data-id="${s.id}"
                 onclick="selectSpace('${s.id}', '${s.name.replace(/'/g,"\\'")}', ${s.hourly_rate})">
                <div class="space-card__type">${s.type.replace(/_/g,' ')}</div>
                <h3 class="space-card__name">${s.name}</h3>
                <div class="space-card__meta">${s.floor || ''} &middot; ${s.capacity} ${s.capacity > 1 ? 'people' : 'person'}</div>
                <div style="display:flex;flex-wrap:wrap;gap:var(--space-1);margin-bottom:var(--space-3)">
                    ${amenities.map(a => `<span class="badge badge--primary">${a}</span>`).join('')}
                </div>
                <div class="space-card__price">${Helpers.formatCurrency(s.hourly_rate)}<span>/hr</span></div>
            </div>`;
    }).join('');

    const recentHtml = _renderBookingHistory();

    const content = `
        <div style="position:relative;width:100%;height:0;padding-top:56.25%;box-shadow:0 2px 8px 0 rgba(63,69,81,0.16);margin-bottom:var(--space-8);overflow:hidden;border-radius:var(--radius-lg);will-change:transform">
            <iframe loading="lazy" style="position:absolute;width:100%;height:100%;top:0;left:0;border:none;padding:0;margin:0"
                src="https://www.canva.com/design/DAHI25uoaRk/AY4BCaFIx_r0gYDAHJKdrQ/view?embed" allowfullscreen="allowfullscreen" allow="fullscreen">
            </iframe>
        </div>

        <div class="booking-layout">
            <div>
                <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-6)">
                    <button class="btn btn--accent btn--sm booking-filter active" data-filter="all" onclick="filterSpaces('all',this)">All Spaces</button>
                    ${[...new Set(spaces.map(s => s.type))].map(type =>
                        `<button class="btn btn--outline btn--sm booking-filter" data-filter="${type}" onclick="filterSpaces('${type}',this)">${type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</button>`
                    ).join('')}
                </div>
                <div class="space-grid" id="spaceGrid">${spacesHtml}</div>
            </div>

            <div class="booking-summary">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Booking Summary</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div class="form-group">
                            <label class="form-label">Selected Space</label>
                            <div id="selectedSpaceName" style="font-weight:var(--weight-medium);color:var(--color-text-muted)">Select a space</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Date</label>
                            <input type="date" class="form-input" id="bookingDate" value="${today}" min="${today}"
                                   onchange="onDateChange(this.value)">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Time Slots (select start hours)</label>
                            <div class="time-slots" id="timeSlots">
                                ${timeSlots.map(t => {
                                    const booked = bookedSlots.includes(t);
                                    const past = _isSlotPast(t, today);
                                    const disabled = booked || past;
                                    const cls = booked ? 'time-slot--booked' : past ? 'time-slot--past' : '';
                                    const title = booked ? 'Already booked' : past ? 'Time has passed' : '';
                                    return `<div class="time-slot ${cls}"
                                         onclick="${disabled ? '' : `toggleTimeSlot('${t}',this)`}"
                                         ${title ? `title="${title}"` : ''}>
                                        ${t}
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Notes (optional)</label>
                            <input type="text" class="form-input" id="bookingNotes" placeholder="e.g. Need power outlet, group of 3...">
                        </div>
                        <hr class="divider">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5)">
                            <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Total</span>
                            <span id="bookingTotal" style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-primary)">₱0.00</span>
                        </div>
                        <button class="btn btn--accent btn--lg btn--full" id="confirmBookingBtn" onclick="showBookingConfirmModal()">Confirm Booking</button>
                    </div>
                </div>

                <div class="dashboard-card" style="margin-top:var(--space-6)">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">My Bookings</h3>
                        <select class="form-input" style="width:130px;padding:4px 8px;font-size:var(--text-xs);height:auto" id="bookingStatusFilter" onchange="filterBookingHistory(this.value)">
                            <option value="">All</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked In</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    <div class="dashboard-card__body" style="padding:0" id="recentBookingsList">
                        ${recentHtml}
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Book a Space', 'Find and reserve your perfect study spot');
}

function toggleTimeSlot(time, el) {
    el.classList.toggle('selected');
    if (el.classList.contains('selected')) {
        selectedSlots.push(time);
    } else {
        selectedSlots = selectedSlots.filter(t => t !== time);
    }
    selectedSlots.sort();
    updateBookingTotal();
}

function updateBookingTotal() {
    const total = selectedSlots.length * selectedSpaceRate;
    const el = document.getElementById('bookingTotal');
    if (el) el.textContent = Helpers.formatCurrency(total);
}

function filterSpaces(type, btn) {
    document.querySelectorAll('.booking-filter').forEach(b => {
        b.classList.remove('active');
        b.className = b.className.replace('btn--accent','btn--outline');
    });
    btn.classList.add('active');
    btn.className = btn.className.replace('btn--outline','btn--accent');
    document.querySelectorAll('.space-card').forEach(card => {
        card.style.display = (type === 'all' || card.dataset.type === type) ? '' : 'none';
    });
}

async function onDateChange(dateVal) {
    if (!selectedSpaceId) return;
    try {
        // Fetch ALL bookings for this space+date (all users)
        const slots = await API.get(`/spaces/${selectedSpaceId}/availability?date=${dateVal}`);
        const bookedTimes = new Set();
        for (const s of slots) {
            const startH = parseInt(s.start_time);
            const endH = parseInt(s.end_time);
            for (let h = startH; h < endH; h++) {
                bookedTimes.add(`${String(h).padStart(2, '0')}:00`);
            }
        }
        document.querySelectorAll('.time-slot').forEach(el => {
            const t = el.textContent.trim();
            const past = _isSlotPast(t, dateVal);
            if (bookedTimes.has(t)) {
                el.className = 'time-slot time-slot--booked';
                el.onclick = null;
                el.title = 'Already booked';
            } else if (past) {
                el.className = 'time-slot time-slot--past';
                el.onclick = null;
                el.title = 'Time has passed';
            } else {
                el.className = 'time-slot';
                el.onclick = () => toggleTimeSlot(t, el);
                el.title = '';
            }
        });
        selectedSlots = [];
        updateBookingTotal();
    } catch(e) {}
}

function selectSpace(id, name, rate) {
    selectedSpaceId = id;
    selectedSpaceName = name;
    selectedSpaceRate = parseFloat(rate);
    const el = document.getElementById('selectedSpaceName');
    if (el) { el.textContent = name; el.style.color = 'var(--color-text)'; }
    document.querySelectorAll('.space-card').forEach(c => c.classList.remove('selected'));
    const card = document.querySelector(`.space-card[data-id="${id}"]`);
    if (card) card.classList.add('selected');
    updateBookingTotal();
    // Refresh time slots for this space
    const dateVal = document.getElementById('bookingDate')?.value;
    if (dateVal) onDateChange(dateVal);
}

// ── Booking confirmation modal (Fix 6) ───────────────────────────────────

function showBookingConfirmModal() {
    if (!selectedSpaceId) {
        Helpers.showToast('Select a Space', 'Please choose a space before booking.', 'error'); return;
    }
    if (selectedSlots.length === 0) {
        Helpers.showToast('Select Time', 'Please select at least one time slot.', 'error'); return;
    }
    const date = document.getElementById('bookingDate')?.value;
    if (!date) { Helpers.showToast('Select Date', 'Please pick a date.', 'error'); return; }
    const _n = new Date(); const today = _n.getFullYear() + '-' + String(_n.getMonth() + 1).padStart(2, '0') + '-' + String(_n.getDate()).padStart(2, '0');
    if (date < today) { Helpers.showToast('Invalid Date', 'Cannot book for a past date.', 'error'); return; }

    for (let i = 1; i < selectedSlots.length; i++) {
        if (parseInt(selectedSlots[i]) !== parseInt(selectedSlots[i - 1]) + 1) {
            Helpers.showToast('Invalid Selection', 'Please select consecutive time slots.', 'error');
            return;
        }
    }

    const startTime = selectedSlots[0];
    const lastHour = parseInt(selectedSlots[selectedSlots.length - 1]) + 1;
    const endTime = `${String(lastHour).padStart(2, '0')}:00`;
    const total = selectedSlots.length * selectedSpaceRate;
    const dateFormatted = new Date(date + 'T00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    let modal = document.getElementById('confirm-booking-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-booking-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1100;display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:420px;box-shadow:var(--shadow-xl)" onclick="event.stopPropagation()">
            <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border)">
                <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold);margin-bottom:var(--space-1)">Confirm Booking</h3>
                <p style="font-size:var(--text-sm);color:var(--color-text-muted)">Review your booking details before confirming.</p>
            </div>
            <div style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)">
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm)">
                    <span style="color:var(--color-text-muted)">Space</span>
                    <span style="font-weight:var(--weight-semibold)">${selectedSpaceName}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm)">
                    <span style="color:var(--color-text-muted)">Date</span>
                    <span style="font-weight:var(--weight-medium)">${dateFormatted}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm)">
                    <span style="color:var(--color-text-muted)">Time</span>
                    <span style="font-weight:var(--weight-medium)">${startTime} – ${endTime} (${selectedSlots.length}h)</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm)">
                    <span style="color:var(--color-text-muted)">Rate</span>
                    <span>${Helpers.formatCurrency(selectedSpaceRate)}/hr</span>
                </div>
                <hr class="divider">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:var(--weight-semibold)">Total</span>
                    <span style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-accent)">${Helpers.formatCurrency(total)}</span>
                </div>
                <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">
                    <button class="btn btn--outline" style="flex:1" onclick="document.getElementById('confirm-booking-modal').style.display='none'">Cancel</button>
                    <button class="btn btn--accent" style="flex:1" id="modalConfirmBtn" onclick="confirmBooking()">Confirm & Book</button>
                </div>
            </div>
        </div>`;
    modal.style.display = 'flex';
    modal.onclick = () => { modal.style.display = 'none'; };
}

async function confirmBooking() {
    const date = document.getElementById('bookingDate')?.value;
    const startTime = selectedSlots[0];
    const lastHour = parseInt(selectedSlots[selectedSlots.length - 1]) + 1;
    const endTime = `${String(lastHour).padStart(2, '0')}:00`;

    const btn = document.getElementById('modalConfirmBtn');
    if (btn) { btn.textContent = 'Booking...'; btn.disabled = true; }

    try {
        await API.post('/bookings', {
            spaceId: selectedSpaceId,
            bookingDate: date,
            startTime,
            endTime,
            notes: document.getElementById('bookingNotes')?.value?.trim() || ''
        });

        // Close modal
        const modal = document.getElementById('confirm-booking-modal');
        if (modal) modal.style.display = 'none';

        Helpers.showToast('Booking Confirmed!', `${selectedSpaceName} booked for ${selectedSlots.length} hour(s) on ${date}.`, 'success');

        // Reset state
        selectedSpaceId = null; selectedSpaceName = ''; selectedSpaceRate = 0; selectedSlots = [];
        document.querySelectorAll('.space-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.time-slot.selected').forEach(t => t.classList.remove('selected'));
        const nameEl = document.getElementById('selectedSpaceName');
        if (nameEl) { nameEl.textContent = 'Select a space'; nameEl.style.color = 'var(--color-text-muted)'; }
        updateBookingTotal();

        // Reload full bookings list
        _allUserBookings = await API.get('/bookings').catch(() => []);
        _bookingHistoryPage = 1;
        _refreshBookingHistory();
    } catch (err) {
        Helpers.showToast('Booking Failed', err.message, 'error');
        if (btn) { btn.textContent = 'Confirm & Book'; btn.disabled = false; }
    }
}

async function cancelBooking(bookingId) {
    if (!await Helpers.confirmAction('Cancel Booking?', 'This will cancel your reservation. This action cannot be undone.', { confirmText: 'Yes, Cancel', type: 'warning' })) return;
    try {
        await API.put(`/bookings/${bookingId}/cancel`, {});
        Helpers.showToast('Cancelled', 'Booking cancelled successfully.', 'success');
        _allUserBookings = await API.get('/bookings').catch(() => []);
        _refreshBookingHistory();
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ── Booking history with pagination (Fix 5) ──────────────────────────────

function _renderBookingHistory() {
    const filtered = _bookingStatusFilter
        ? _allUserBookings.filter(b => b.status === _bookingStatusFilter)
        : _allUserBookings;
    const start = (_bookingHistoryPage - 1) * _bookingHistoryLimit;
    const page = filtered.slice(start, start + _bookingHistoryLimit);
    const totalPages = Math.ceil(filtered.length / _bookingHistoryLimit);

    if (filtered.length === 0) {
        return `<div style="padding:var(--space-4);text-align:center;color:var(--color-text-muted);font-size:var(--text-sm)">No bookings yet.</div>`;
    }

    let html = page.map(b => `
        <div style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border-light);display:flex;justify-content:space-between;align-items:center">
            <div>
                <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${b.space_name || 'Space'}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">
                    ${b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}, ${b.start_time} – ${b.end_time}
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-2)">
                <span class="badge badge--${b.status === 'confirmed' ? 'success' : b.status === 'checked_in' ? 'accent' : b.status === 'cancelled' ? 'error' : 'primary'}">${b.status}</span>
                ${b.status === 'confirmed' ? `<button class="btn btn--ghost btn--xs" onclick="showBookingQR('${b.id}')" title="Show QR" aria-label="Show QR code">📱</button>` : ''}
                ${b.status === 'confirmed' ? `<button class="btn btn--ghost btn--xs" onclick="showGroupModal('${b.id}')" title="Group members" aria-label="Manage group members">👥</button>` : ''}
                ${b.status === 'confirmed' ? `<button class="btn btn--ghost btn--xs" onclick="showRescheduleModal('${b.id}','${b.booking_date}','${b.start_time}','${b.end_time}')" title="Reschedule" aria-label="Reschedule booking">✏️</button>` : ''}
                ${b.status === 'confirmed' ? `<button class="btn btn--ghost btn--xs" onclick="cancelBooking('${b.id}')" title="Cancel" aria-label="Cancel booking">✕</button>` : ''}
            </div>
        </div>`).join('');

    if (totalPages > 1) {
        html += `<div style="display:flex;justify-content:center;align-items:center;gap:var(--space-3);padding:var(--space-3);border-top:1px solid var(--color-border)">
            <button class="btn btn--ghost btn--xs" onclick="changeBookingHistoryPage(${_bookingHistoryPage - 1})" ${_bookingHistoryPage <= 1 ? 'disabled' : ''}>Prev</button>
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${_bookingHistoryPage}/${totalPages}</span>
            <button class="btn btn--ghost btn--xs" onclick="changeBookingHistoryPage(${_bookingHistoryPage + 1})" ${_bookingHistoryPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>`;
    }
    return html;
}

function changeBookingHistoryPage(page) {
    _bookingHistoryPage = page;
    _refreshBookingHistory();
}

function _refreshBookingHistory() {
    const el = document.getElementById('recentBookingsList');
    if (el) el.innerHTML = _renderBookingHistory();
}

let _bookingStatusFilter = '';

function filterBookingHistory(status) {
    _bookingStatusFilter = status;
    _bookingHistoryPage = 1;
    _refreshBookingHistory();
}

function showRescheduleModal(bookingId, currentDate, currentStart, currentEnd) {
    let modal = document.getElementById('reschedule-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reschedule-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1100;display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
        document.body.appendChild(modal);
    }

    const _n = new Date(); const today = _n.getFullYear() + '-' + String(_n.getMonth() + 1).padStart(2, '0') + '-' + String(_n.getDate()).padStart(2, '0');
    const timeSlots = [];
    for (let h = 10; h <= 28; h++) timeSlots.push(`${String(h % 24).padStart(2,'0')}:00`);

    modal.innerHTML = `
        <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:440px;box-shadow:var(--shadow-xl)" onclick="event.stopPropagation()">
            <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">✏️ Reschedule Booking</h3>
                <button class="btn btn--ghost btn--sm" onclick="document.getElementById('reschedule-modal').style.display='none'">✕</button>
            </div>
            <div style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)">
                <div class="form-group">
                    <label class="form-label">New Date</label>
                    <input type="date" class="form-input" id="rescheduleDate" value="${currentDate}" min="${today}">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                    <div class="form-group">
                        <label class="form-label">Start Time</label>
                        <select class="form-input" id="rescheduleStart">
                            ${timeSlots.map(t => `<option value="${t}"${t===currentStart?' selected':''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Time</label>
                        <select class="form-input" id="rescheduleEnd">
                            ${timeSlots.map(t => `<option value="${t}"${t===currentEnd?' selected':''}>${t}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div id="rescheduleError" class="form-error" style="display:none"></div>
                <div style="display:flex;gap:var(--space-3);justify-content:flex-end">
                    <button class="btn btn--outline" onclick="document.getElementById('reschedule-modal').style.display='none'">Cancel</button>
                    <button class="btn btn--accent" id="rescheduleBtn" onclick="submitReschedule('${bookingId}')">Save Changes</button>
                </div>
            </div>
        </div>`;
    modal.style.display = 'flex';
    modal.onclick = () => { modal.style.display = 'none'; };
}

async function submitReschedule(bookingId) {
    const btn = document.getElementById('rescheduleBtn');
    const errEl = document.getElementById('rescheduleError');
    errEl.style.display = 'none';
    const bookingDate = document.getElementById('rescheduleDate').value;
    const startTime = document.getElementById('rescheduleStart').value;
    const endTime = document.getElementById('rescheduleEnd').value;

    if (startTime >= endTime) {
        errEl.textContent = 'End time must be after start time';
        errEl.style.display = 'block';
        return;
    }
    btn.textContent = 'Saving...'; btn.disabled = true;
    try {
        await API.put(`/bookings/${bookingId}/reschedule`, { bookingDate, startTime, endTime });
        document.getElementById('reschedule-modal').style.display = 'none';
        Helpers.showToast('Rescheduled!', 'Your booking has been updated.', 'success');
        _allUserBookings = await API.get('/bookings').catch(() => []);
        _refreshBookingHistory();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.textContent = 'Save Changes'; btn.disabled = false;
    }
}

async function showBookingQR(bookingId) {
    let modal = document.getElementById('qr-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'qr-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1100;display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:360px;box-shadow:var(--shadow-xl);text-align:center" onclick="event.stopPropagation()">
            <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">Your QR Code</h3>
                <button class="btn btn--ghost btn--sm" onclick="document.getElementById('qr-modal').style.display='none'">✕</button>
            </div>
            <div style="padding:var(--space-6)" id="qrModalBody">
                <div style="color:var(--color-text-muted);font-size:var(--text-sm)">Loading QR code...</div>
            </div>
        </div>`;
    modal.style.display = 'flex';
    modal.onclick = () => { modal.style.display = 'none'; };

    try {
        const data = await API.get(`/bookings/${bookingId}/qr`);
        document.getElementById('qrModalBody').innerHTML = `
            <img src="${data.qr}" alt="Booking QR Code" style="width:240px;height:240px;margin:0 auto var(--space-4);display:block">
            <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-2)">Show this code at the front desk to check in.</p>
            <div style="font-size:var(--text-xs);color:var(--color-text-muted);word-break:break-all;background:var(--color-surface);padding:var(--space-2);border-radius:var(--radius-sm)">${data.code}</div>`;
    } catch (err) {
        document.getElementById('qrModalBody').innerHTML = `<div style="color:var(--color-error)">${Helpers.esc(err.message)}</div>`;
    }
}

// ── Group Members Modal ─────────────────────────────────────────────────

async function showGroupModal(bookingId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const closeModal = () => { modal.classList.remove('active'); setTimeout(() => modal.remove(), 200); };
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    modal.innerHTML = `
        <div class="modal" style="max-width:480px">
            <div class="modal__header">
                <h3>👥 Group Members</h3>
                <button class="btn btn--ghost btn--sm" id="grpCloseBtn">✕</button>
            </div>
            <div class="modal__body" id="groupModalBody">
                <div style="text-align:center;color:var(--color-text-muted)">Loading...</div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#grpCloseBtn').onclick = closeModal;
    requestAnimationFrame(() => modal.classList.add('active'));

    await refreshGroupMembers(bookingId);
}

async function refreshGroupMembers(bookingId) {
    const body = document.getElementById('groupModalBody');
    if (!body) return;

    let members = [];
    try { members = await API.get(`/bookings/${bookingId}/members`); } catch(e) {}

    body.innerHTML = `
        <div style="margin-bottom:var(--space-4)">
            <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-3)">Add people who will join this booking session.</p>
            <div style="display:flex;gap:var(--space-2);align-items:flex-end">
                <div class="form-group" style="flex:1;margin:0">
                    <label class="form-label">Name *</label>
                    <input type="text" class="form-input" id="grpMemberName" placeholder="Member name">
                </div>
                <div class="form-group" style="flex:1;margin:0">
                    <label class="form-label">Email (optional)</label>
                    <input type="email" class="form-input" id="grpMemberEmail" placeholder="email@example.com">
                </div>
                <button class="btn btn--accent btn--sm" onclick="addGroupMember('${bookingId}')">Add</button>
            </div>
        </div>
        ${members.length > 0 ? `
            <div style="border-top:1px solid var(--color-border);padding-top:var(--space-3)">
                <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold);margin-bottom:var(--space-2)">${members.length} member${members.length !== 1 ? 's' : ''}</div>
                ${members.map(m => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border)">
                        <div>
                            <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${Helpers.esc(m.member_name)}</div>
                            ${m.member_email ? `<div style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.esc(m.member_email)}</div>` : ''}
                        </div>
                        <button class="btn btn--ghost btn--xs" style="color:var(--color-error)" onclick="removeGroupMember('${bookingId}',${m.id})" aria-label="Remove member">✕</button>
                    </div>
                `).join('')}
            </div>
        ` : `<div style="text-align:center;color:var(--color-text-muted);font-size:var(--text-sm);padding:var(--space-4)">No group members yet.</div>`}
    `;
}

async function addGroupMember(bookingId) {
    const name = document.getElementById('grpMemberName')?.value?.trim();
    const email = document.getElementById('grpMemberEmail')?.value?.trim();
    if (!name) { Helpers.showToast('Error', 'Member name is required.', 'error'); return; }
    try {
        await API.post(`/bookings/${bookingId}/members`, { members: [{ name, email }] });
        await refreshGroupMembers(bookingId);
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function removeGroupMember(bookingId, memberId) {
    try {
        await API.delete(`/bookings/${bookingId}/members/${memberId}`);
        await refreshGroupMembers(bookingId);
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}


// ── js/pages/leaderboard.js ──
﻿async function renderLeaderboardPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading leaderboard...</div>`,
        'Leaderboard', 'See how you rank against the community'
    );
    await loadLeaderboard('alltime', app);
}

async function loadLeaderboard(period, app) {
    let data = [];
    let community = { totalUsers: 0, totalStudyHours: 0, activeNow: 0, bookingsToday: 0 };
    const currentUser = Store.get('user');

    try {
        [data, community] = await Promise.all([
            API.get(`/users/leaderboard?period=${period}`),
            API.get('/analytics/community').catch(() => community)
        ]);
    } catch(e) { /* use defaults */ }

    const myRank   = data.findIndex(u => u.id === currentUser?.id) + 1;
    const topThree = data.slice(0, 3);
    const rest     = data.slice(3);

    const content = `
        <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-6)" id="periodBtns">
            <button class="btn btn--${period==='weekly'?'accent':'outline'} btn--sm" onclick="switchPeriod('weekly')">This Week</button>
            <button class="btn btn--${period==='monthly'?'accent':'outline'} btn--sm" onclick="switchPeriod('monthly')">This Month</button>
            <button class="btn btn--${period==='alltime'?'accent':'outline'} btn--sm" onclick="switchPeriod('alltime')">All Time</button>
        </div>

        ${topThree.length > 0 ? `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-6);margin-bottom:var(--space-8)">
            ${topThree.map((u, i) => `
                <div class="card card--elevated" style="text-align:center;padding:var(--space-8);${i===0?'border:2px solid #ffd700':''}">
                    <div style="font-size:${i===0?'40px':'32px'};margin-bottom:var(--space-3)">${['🥇','🥈','🥉'][i]}</div>
                    <div style="margin:0 auto var(--space-3)">${Helpers.renderAvatar(u.avatar_url, u.first_name, u.last_name, 'lg')}</div>
                    <h3 style="font-size:var(--text-base);margin-bottom:var(--space-1)">${Helpers.esc(u.first_name)} ${Helpers.esc(u.last_name)}</h3>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-4)">${u.university || '—'}</div>
                    <div style="font-size:var(--text-2xl);font-weight:var(--weight-bold);color:var(--color-accent);margin-bottom:var(--space-2)">${(u.xp||0).toLocaleString()} XP</div>
                    <div style="display:flex;justify-content:center;gap:var(--space-4);font-size:var(--text-xs);color:var(--color-text-muted)">
                        <span>${Math.floor((u.total_minutes||0)/60)}h studied</span>
                        <span>🔥 ${u.streak_days||0}d streak</span>
                    </div>
                </div>`).join('')}
        </div>` : ''}

        <div class="dashboard-card">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">Full Rankings</h3>
                <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Top ${data.length} learners</span>
            </div>
            <div class="dashboard-card__body" style="padding:0">
                <div class="leaderboard-list">
                    ${data.map((u, i) => `
                        <div class="leaderboard-item ${u.id === currentUser?.id ? 'leaderboard-item--me' : ''}">
                            <div class="leaderboard-item__rank leaderboard-item__rank--${i<3?i+1:''}">${i+1}</div>
                            ${Helpers.renderAvatar(u.avatar_url, u.first_name, u.last_name, 'sm')}
                            <div class="leaderboard-item__info">
                                <div class="leaderboard-item__name">${Helpers.esc(u.first_name)} ${Helpers.esc(u.last_name)}${u.id===currentUser?.id?' <span class="badge badge--accent" style="font-size:10px">You</span>':''}</div>
                                <div class="leaderboard-item__meta">${u.university||'—'} &middot; ${Math.floor((u.total_minutes||0)/60)}h &middot; 🔥 ${u.streak_days||0}d</div>
                            </div>
                            <div class="leaderboard-item__score">${(u.xp||0).toLocaleString()} XP</div>
                        </div>`).join('')}
                    ${data.length === 0 ? '<div style="padding:var(--space-6);text-align:center;color:var(--color-text-muted)">No data yet.</div>' : ''}
                </div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);margin-top:var(--space-6)">
            <div class="dashboard-card">
                <div class="dashboard-card__header">
                    <h3 class="dashboard-card__title">Your Position</h3>
                </div>
                <div class="dashboard-card__body" style="text-align:center">
                    ${myRank > 0 ? `
                        <div style="font-size:var(--text-5xl);font-weight:var(--weight-bold);color:var(--color-primary);margin-bottom:var(--space-2)">#${myRank}</div>
                        <div style="color:var(--color-text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4)">
                            ${myRank <= 3 ? 'Top 3! You are crushing it!' : myRank <= 10 ? 'Top 10 — keep going!' : `out of ${data.length} members`}
                        </div>
                        <div class="progress" style="margin-bottom:var(--space-2)"><div class="progress__bar" style="width:${Math.round((1 - myRank/data.length)*100)}%"></div></div>
                        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">
                            ${myRank > 1 && data[myRank-2] ? `${(data[myRank-2].xp - (currentUser?.xp||0)).toLocaleString()} XP to reach #${myRank-1}` : 'You are #1!'}
                        </div>
                    ` : `<div style="color:var(--color-text-muted)">Keep studying to appear on the leaderboard!</div>`}
                </div>
            </div>
            <div class="dashboard-card">
                <div class="dashboard-card__header">
                    <h3 class="dashboard-card__title">Community Stats</h3>
                </div>
                <div class="dashboard-card__body">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                        <div class="stat"><div class="stat__value">${community.totalUsers||0}</div><div class="stat__label">Members</div></div>
                        <div class="stat"><div class="stat__value">${community.activeNow||0}</div><div class="stat__label">Studying Now</div></div>
                        <div class="stat"><div class="stat__value">${(community.totalStudyHours||0).toLocaleString()}</div><div class="stat__label">Total Hours</div></div>
                        <div class="stat"><div class="stat__value">${community.bookingsToday||0}</div><div class="stat__label">Bookings Today</div></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Leaderboard', 'See how you rank against the community');
    // Store current period for switchPeriod
    window._currentLbPeriod = period;
}

function switchPeriod(period) {
    const app = document.getElementById('app') || document.querySelector('[data-page]');
    loadLeaderboard(period, app || document.body);
}


// ── js/pages/achievements.js ──
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


// ── js/pages/analytics.js ──
﻿async function renderAnalyticsPage(app) {
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

    const totalMinutes   = Math.round(parseFloat(summary.total_study_minutes||0));
    const totalHours     = Math.floor(totalMinutes/60);
    const studyDisplay   = Helpers.formatDuration(totalMinutes);
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
                <div class="dashboard-stat-card__value">${Helpers.formatDuration(Math.round(weeklyMins.reduce((a,b)=>a+b,0)))}</div>
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
                <div class="dashboard-stat-card__value">${studyDisplay}</div>
                <div class="dashboard-stat-card__change">All time</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Best Day</span>
                    <span class="dashboard-stat-card__icon">⭐</span>
                </div>
                <div class="dashboard-stat-card__value">${bestDay}</div>
                <div class="dashboard-stat-card__change">${weeklyMins[bestDayIdx]>0?Helpers.formatDuration(Math.round(weeklyMins[bestDayIdx])):'No data'}</div>
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
                                <div style="font-size:var(--text-sm);color:var(--color-text-secondary)">${bestStreak >= 7 ? `Best streak: ${bestStreak} ${bestStreak === 1 ? 'day' : 'days'}. Users with 7+ day streaks score 40% higher on focus.` : `Best streak so far: ${bestStreak} ${bestStreak === 1 ? 'day' : 'days'}. Aim for 7 consecutive days to unlock Streak Master!`}</div>
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
                            <div class="stat"><div class="stat__value">${studyDisplay}</div><div class="stat__label">Total Study</div></div>
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


// ── js/pages/admin/admin-dashboard.js ──
﻿async function renderAdminDashboardPage(app) {
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


// ── js/pages/admin/admin-users.js ──
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
                    <div style="height:100%;width:${xpPct}%;background:linear-gradient(90deg,var(--color-primary),var(--color-accent));border-radius:5px"></div>
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


// ── js/pages/admin/admin-bookings.js ──
let _adminBookings = [];
let _bookingPage = 1;
const _bookingLimit = 25;

async function renderAdminBookingsPage(app) {
    const today = new Date().toISOString().split('T')[0];
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading bookings...</div>`,
        'Booking Management', 'View and manage all bookings across spaces'
    );
    _bookingPage = 1;
    await loadAdminBookings(today, '', app);
}

async function loadAdminBookings(date, status, app, page) {
    if (page) _bookingPage = page;
    let data = { bookings: [], total: 0, page: _bookingPage, limit: _bookingLimit };
    try {
        let qs = [`page=${_bookingPage}`, `limit=${_bookingLimit}`];
        if (date)   qs.push(`date=${date}`);
        if (status) qs.push(`status=${status}`);
        data = await API.get(`/admin/bookings?${qs.join('&')}`);
        _adminBookings = data.bookings;
    } catch(e) { _adminBookings = []; }

    const bookings = _adminBookings;
    const totalPages = Math.ceil((data.total || bookings.length) / _bookingLimit);
    const today    = new Date().toISOString().split('T')[0];
    const todayBks = bookings.filter(b => b.booking_date && b.booking_date.startsWith(today));
    const checkedIn= todayBks.filter(b => b.status === 'checked_in').length;
    const todayRev = todayBks.reduce((s,b) => s + parseFloat(b.total_amount||0), 0);
    const noShows  = bookings.filter(b => b.status === 'no_show').length;

    const statusMap = {
        pending:'warning', confirmed:'accent', checked_in:'success',
        completed:'primary', cancelled:'error', no_show:'error'
    };

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Showing Bookings</span>
                    <span class="dashboard-stat-card__icon">📅</span>
                </div>
                <div class="dashboard-stat-card__value">${bookings.length}</div>
                <div class="dashboard-stat-card__change">${checkedIn} checked in today</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Today's Bookings</span>
                    <span class="dashboard-stat-card__icon">📊</span>
                </div>
                <div class="dashboard-stat-card__value">${todayBks.length}</div>
                <div class="dashboard-stat-card__change">${checkedIn} checked in</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Revenue Today</span>
                    <span class="dashboard-stat-card__icon">💰</span>
                </div>
                <div class="dashboard-stat-card__value">${Helpers.formatCurrency(todayRev)}</div>
                <div class="dashboard-stat-card__change">From ${todayBks.length} bookings</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">No Shows</span>
                    <span class="dashboard-stat-card__icon">⚠️</span>
                </div>
                <div class="dashboard-stat-card__value">${noShows}</div>
                <div class="dashboard-stat-card__change" style="color:var(--color-error)">In results</div>
            </div>
        </div>

        <!-- QR Check-In Card -->
        <div class="dashboard-card" style="margin-bottom:var(--space-6)">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">QR Check-In</h3>
            </div>
            <div class="dashboard-card__body">
                <div style="display:flex;gap:var(--space-3);align-items:flex-end">
                    <div class="form-group" style="flex:1;margin:0">
                        <label class="form-label">Scan or paste QR code</label>
                        <input type="text" class="form-input" id="qrCodeInput" placeholder="Paste booking QR code here...">
                    </div>
                    <button class="btn btn--accent" onclick="verifyQRCode()">Verify</button>
                    <button class="btn btn--outline" onclick="toggleQRScanner()" id="qrScannerBtn" aria-label="Open camera scanner">📷 Scan</button>
                </div>
                <div id="qrScannerContainer" style="display:none;margin-top:var(--space-4)">
                    <div id="qrReader" style="width:100%;max-width:400px;margin:0 auto"></div>
                    <div style="text-align:center;margin-top:var(--space-2)">
                        <button class="btn btn--ghost btn--sm" onclick="stopQRScanner()">Close Scanner</button>
                    </div>
                </div>
                <div id="qrResult" style="margin-top:var(--space-4)"></div>
            </div>
        </div>

        <!-- Walk-in Booking Card -->
        <div class="dashboard-card" style="margin-bottom:var(--space-6)">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">Walk-in Booking</h3>
            </div>
            <div class="dashboard-card__body">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);align-items:flex-end">
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Guest Name *</label>
                        <input type="text" class="form-input" id="walkinName" placeholder="Guest name">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Email (optional)</label>
                        <input type="email" class="form-input" id="walkinEmail" placeholder="guest@email.com">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Space *</label>
                        <select class="form-input" id="walkinSpace">
                            <option value="">Select space...</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Date *</label>
                        <input type="date" class="form-input" id="walkinDate" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Start *</label>
                        <select class="form-input" id="walkinStart">
                            ${Array.from({length:19},(_,i)=>i+10).map(h=>`<option value="${String(h%24).padStart(2,'0')}:00">${String(h%24).padStart(2,'0')}:00</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">End *</label>
                        <select class="form-input" id="walkinEnd">
                            ${Array.from({length:19},(_,i)=>i+11).map(h=>`<option value="${String(h%24).padStart(2,'0')}:00">${String(h%24).padStart(2,'0')}:00</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="margin-top:var(--space-3);display:flex;gap:var(--space-3);align-items:center">
                    <input type="text" class="form-input" id="walkinNotes" placeholder="Notes (optional)" style="flex:1">
                    <button class="btn btn--accent" onclick="submitWalkinBooking()">Create Walk-in</button>
                </div>
            </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5);flex-wrap:wrap;gap:var(--space-3)">
            <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
                <input type="text" class="form-input" placeholder="Search bookings..." style="width:240px" oninput="filterBookingRows(this.value)">
                <input type="date" class="form-input" style="width:170px" value="${date}"
                       onchange="loadAdminBookings(this.value, document.getElementById('statusFilter')?.value||'', document.getElementById('app')||document.body)">
                <select class="form-input" style="width:150px" id="statusFilter"
                        onchange="loadAdminBookings(document.querySelector('[type=date]')?.value||'', this.value, document.getElementById('app')||document.body)">
                    <option value="">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked_in">Checked In</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                </select>
            </div>
            <button class="btn btn--outline btn--sm" onclick="exportBookingsCSV()">Export CSV</button>
        </div>

        <div id="bulkBar" style="display:none;background:var(--color-accent);color:white;padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);margin-bottom:var(--space-4);display:none;align-items:center;gap:var(--space-4);flex-wrap:wrap">
            <span id="bulkCount" style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">0 selected</span>
            <button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" onclick="bulkBookingAction('confirmed')">Confirm</button>
            <button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" onclick="bulkBookingAction('checked_in')">Check In</button>
            <button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" onclick="bulkBookingAction('cancelled')">Cancel</button>
            <button class="btn btn--ghost btn--sm" style="color:white;margin-left:auto" onclick="clearBulkSelection()">Clear</button>
        </div>

        <div class="dashboard-card">
            <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                <table class="data-table" id="bookingsTable">
                    <thead>
                        <tr>
                            <th style="width:36px"><input type="checkbox" onchange="toggleAllBookings(this.checked)" style="accent-color:var(--color-accent)"></th>
                            <th>Guest</th><th>Space</th><th>Date</th><th>Time</th>
                            <th>Amount</th><th>Status</th><th>Notes</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.length === 0
                            ? `<tr><td colspan="9" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted)">No bookings found.</td></tr>`
                            : bookings.map(b => {
                                const actions = _getBookingActions(b);
                                return `
                                <tr data-bookingid="${b.id}">
                                    <td><input type="checkbox" class="bulk-check" data-id="${b.id}" onchange="updateBulkBar()" style="accent-color:var(--color-accent)"></td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:var(--space-2)">
                                            <div class="avatar avatar--sm">${Helpers.getInitials(b.first_name, b.last_name)}</div>
                                            <div>
                                                <div style="font-weight:var(--weight-medium);font-size:var(--text-sm)">${Helpers.esc(b.first_name)} ${Helpers.esc(b.last_name)}</div>
                                                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.esc(b.email)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${b.space_name||'—'}</td>
                                    <td>${b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'}</td>
                                    <td style="white-space:nowrap">${b.start_time} – ${b.end_time}</td>
                                    <td style="font-weight:var(--weight-medium)">${Helpers.formatCurrency(b.total_amount||0)}</td>
                                    <td><span class="badge badge--${statusMap[b.status]||'primary'}" id="bstatus-${b.id}">${b.status}</span></td>
                                    <td style="font-size:var(--text-xs);color:var(--color-text-muted);max-width:140px">${Helpers.esc(b.notes) || '—'}</td>
                                    <td>
                                        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
                                            ${actions}
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('')}
                    </tbody>
                </table>
            </div>
            ${totalPages > 1 ? `
            <div style="display:flex;justify-content:center;align-items:center;gap:var(--space-3);padding:var(--space-4);border-top:1px solid var(--color-border)">
                <button class="btn btn--outline btn--sm" onclick="loadAdminBookings('','',document.getElementById('app'),${_bookingPage-1})"
                        ${_bookingPage <= 1 ? 'disabled' : ''}>← Prev</button>
                <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Page ${_bookingPage} of ${totalPages}</span>
                <button class="btn btn--outline btn--sm" onclick="loadAdminBookings('','',document.getElementById('app'),${_bookingPage+1})"
                        ${_bookingPage >= totalPages ? 'disabled' : ''}>Next →</button>
            </div>` : ''}
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Booking Management', 'View and manage all bookings across spaces');

    // Populate walk-in space dropdown
    (async () => {
        try {
            const spaces = await API.get('/spaces');
            const sel = document.getElementById('walkinSpace');
            if (sel) {
                sel.innerHTML = '<option value="">Select space...</option>' +
                    spaces.map(s => `<option value="${s.id}">${s.name} (${s.type.replace(/_/g,' ')})</option>`).join('');
            }
        } catch(e) {}
    })();
}

async function submitWalkinBooking() {
    const name = document.getElementById('walkinName')?.value?.trim();
    const email = document.getElementById('walkinEmail')?.value?.trim();
    const spaceId = document.getElementById('walkinSpace')?.value;
    const date = document.getElementById('walkinDate')?.value;
    const start = document.getElementById('walkinStart')?.value;
    const end = document.getElementById('walkinEnd')?.value;
    const notes = document.getElementById('walkinNotes')?.value?.trim();

    if (!name || !spaceId || !date || !start || !end) {
        Helpers.showToast('Missing Fields', 'Please fill in guest name, space, date, and time.', 'error');
        return;
    }
    if (start >= end) {
        Helpers.showToast('Invalid Time', 'End time must be after start time.', 'error');
        return;
    }

    try {
        const result = await API.post('/admin/bookings/walkin', {
            guestName: name, guestEmail: email, spaceId,
            bookingDate: date, startTime: start, endTime: end, notes
        });
        Helpers.showToast('Walk-in Created', `Booking for ${name} at ${result.space_name} confirmed.`, 'success');
        document.getElementById('walkinName').value = '';
        document.getElementById('walkinEmail').value = '';
        document.getElementById('walkinNotes').value = '';
        loadAdminBookings('', '', document.getElementById('app'));
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

function _getBookingActions(b) {
    const btns = [];
    if (b.status === 'pending')     btns.push(`<button class="btn btn--ghost btn--sm" style="color:var(--color-accent)" onclick="updateBookingStatus('${b.id}','confirmed')">Confirm</button>`);
    if (b.status === 'confirmed')   btns.push(`<button class="btn btn--ghost btn--sm" style="color:var(--color-success)" onclick="updateBookingStatus('${b.id}','checked_in')">Check In</button>`);
    if (b.status === 'checked_in')  btns.push(`<button class="btn btn--ghost btn--sm" style="color:var(--color-primary)" onclick="updateBookingStatus('${b.id}','completed')">Complete</button>`);
    if (b.status === 'confirmed')   btns.push(`<button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="updateBookingStatus('${b.id}','no_show')">No Show</button>`);
    if (['pending','confirmed'].includes(b.status)) btns.push(`<button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="updateBookingStatus('${b.id}','cancelled')">Cancel</button>`);
    if (btns.length === 0) btns.push(`<span style="font-size:var(--text-xs);color:var(--color-text-muted)">—</span>`);
    return btns.join('');
}

function filterBookingRows(query) {
    document.querySelectorAll('#bookingsTable tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
    });
}

async function updateBookingStatus(bookingId, newStatus) {
    if (newStatus === 'cancelled' && !await Helpers.confirmAction('Cancel Booking?', 'Cancel this booking?', { confirmText: 'Yes, Cancel', type: 'warning' })) return;
    if (newStatus === 'no_show' && !await Helpers.confirmAction('No-Show?', 'Mark this booking as a no-show?', { confirmText: 'Confirm', type: 'warning' })) return;

    try {
        const updated = await API.put(`/admin/bookings/${bookingId}/status`, { status: newStatus });
        // Update local cache
        const idx = _adminBookings.findIndex(b => b.id === bookingId);
        if (idx !== -1) _adminBookings[idx].status = newStatus;

        // Refresh the row in-place
        const badge = document.getElementById(`bstatus-${bookingId}`);
        const statusMap = { pending:'warning', confirmed:'accent', checked_in:'success', completed:'primary', cancelled:'error', no_show:'error' };
        if (badge) {
            badge.className = `badge badge--${statusMap[newStatus]||'primary'}`;
            badge.textContent = newStatus;
        }
        // Update action buttons
        const row = document.querySelector(`tr[data-bookingid="${bookingId}"]`);
        if (row) {
            const actionsCell = row.querySelector('td:last-child div');
            if (actionsCell) actionsCell.innerHTML = _getBookingActions({ ...(_adminBookings[idx] || {}), status: newStatus });
        }

        Helpers.showToast('Updated', `Booking status changed to ${newStatus.replace('_',' ')}.`, 'success');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ── QR Check-In Verification ──────────────────────────────────────────────

async function verifyQRCode() {
    const input = document.getElementById('qrCodeInput');
    const resultEl = document.getElementById('qrResult');
    const code = (input?.value || '').trim();
    if (!code) { Helpers.showToast('Error', 'Please enter a QR code.', 'error'); return; }

    resultEl.innerHTML = `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">Verifying...</div>`;
    try {
        const data = await API.get(`/bookings/verify/${code}`);
        const b = data.booking;
        const statusMap = { pending:'warning', confirmed:'accent', checked_in:'success', completed:'primary', cancelled:'error', no_show:'error' };
        resultEl.innerHTML = `
            <div style="padding:var(--space-4);background:var(--color-surface);border-radius:var(--radius-md);border:1px solid var(--color-border)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
                    <strong>${Helpers.esc(b.first_name)} ${Helpers.esc(b.last_name)}</strong>
                    <span class="badge badge--${statusMap[b.status]||'primary'}">${b.status}</span>
                </div>
                <div style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-3)">
                    ${b.space_name} &middot; ${b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : ''} &middot; ${b.start_time} – ${b.end_time}
                </div>
                ${b.status === 'confirmed'
                    ? `<button class="btn btn--accent btn--sm" onclick="updateBookingStatus('${b.id}','checked_in');document.getElementById('qrResult').innerHTML='<div style=\\'color:var(--color-success);font-weight:600;padding:var(--space-3)\\'>Checked in successfully!</div>'">Check In Now</button>`
                    : b.status === 'checked_in'
                        ? `<div style="color:var(--color-success);font-weight:var(--weight-semibold)">Already checked in</div>`
                        : `<div style="color:var(--color-text-muted)">Cannot check in — status is ${b.status}</div>`}
            </div>`;
    } catch (err) {
        resultEl.innerHTML = `<div style="color:var(--color-error);font-size:var(--text-sm)">${Helpers.esc(err.message)}</div>`;
    }
}

// ── CSV Export ────────────────────────────────────────────────────────────

async function exportBookingsCSV() {
    Helpers.showToast('Exporting', 'Fetching all bookings...', 'info');
    let allBookings = _adminBookings;
    try {
        const data = await API.get('/admin/bookings?limit=10000');
        allBookings = data.bookings || allBookings;
    } catch(e) {}
    if (!allBookings.length) { Helpers.showToast('No data', 'No bookings to export.', 'info'); return; }
    const headers = ['Guest Name', 'Email', 'Space', 'Date', 'Start', 'End', 'Amount', 'Status', 'Notes'];
    const rows = allBookings.map(b => [
        `"${b.first_name} ${b.last_name}"`, `"${b.email}"`, `"${b.space_name||''}"`,
        b.booking_date ? b.booking_date.slice(0,10) : '',
        b.start_time, b.end_time,
        b.total_amount || 0, b.status,
        `"${(b.notes || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bookings-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Helpers.showToast('Exported', `${allBookings.length} bookings exported.`, 'success');
}

// ── Bulk Actions ────────────────────────────────────────────────────────

function toggleAllBookings(checked) {
    document.querySelectorAll('.bulk-check').forEach(cb => { cb.checked = checked; });
    updateBulkBar();
}

function updateBulkBar() {
    const checked = document.querySelectorAll('.bulk-check:checked');
    const bar = document.getElementById('bulkBar');
    const count = document.getElementById('bulkCount');
    if (bar) bar.style.display = checked.length > 0 ? 'flex' : 'none';
    if (count) count.textContent = `${checked.length} selected`;
}

function clearBulkSelection() {
    document.querySelectorAll('.bulk-check').forEach(cb => { cb.checked = false; });
    const headerCb = document.querySelector('#bookingsTable thead input[type=checkbox]');
    if (headerCb) headerCb.checked = false;
    updateBulkBar();
}

async function bulkBookingAction(newStatus) {
    const ids = [...document.querySelectorAll('.bulk-check:checked')].map(cb => cb.dataset.id);
    if (ids.length === 0) return;
    if (!await Helpers.confirmAction('Bulk Update?', `Set ${ids.length} booking(s) to "${newStatus.replace('_',' ')}"?`, { confirmText: 'Update All', type: 'warning' })) return;

    let success = 0;
    for (const id of ids) {
        try {
            await API.put(`/admin/bookings/${id}/status`, { status: newStatus });
            success++;
        } catch(e) {}
    }
    Helpers.showToast('Bulk Update', `${success} of ${ids.length} bookings updated to ${newStatus.replace('_',' ')}.`, 'success');
    loadAdminBookings('', '', document.getElementById('app'));
}

// ── Camera QR Scanner ────────────────────────────────────────────────────

let _qrScanner = null;

function toggleQRScanner() {
    const container = document.getElementById('qrScannerContainer');
    if (!container) return;

    if (container.style.display === 'none') {
        container.style.display = 'block';
        startQRScanner();
    } else {
        stopQRScanner();
    }
}

async function startQRScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        Helpers.showToast('Error', 'QR scanner library not loaded.', 'error');
        stopQRScanner();
        return;
    }

    try {
        _qrScanner = new Html5Qrcode('qrReader');
        await _qrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
                const input = document.getElementById('qrCodeInput');
                if (input) input.value = decodedText;
                stopQRScanner();
                verifyQRCode();
            },
            () => {}
        );
        const btn = document.getElementById('qrScannerBtn');
        if (btn) btn.textContent = '⏹ Stop';
    } catch (err) {
        Helpers.showToast('Camera Error', 'Could not access camera. Please paste the QR code manually.', 'error');
        stopQRScanner();
    }
}

async function stopQRScanner() {
    if (_qrScanner) {
        try { await _qrScanner.stop(); } catch(e) {}
        try { _qrScanner.clear(); } catch(e) {}
        _qrScanner = null;
    }
    const container = document.getElementById('qrScannerContainer');
    if (container) container.style.display = 'none';
    const reader = document.getElementById('qrReader');
    if (reader) reader.innerHTML = '';
    const btn = document.getElementById('qrScannerBtn');
    if (btn) btn.textContent = '📷 Scan';
}


// ── js/pages/admin/admin-analytics.js ──
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


// ── js/pages/admin/admin-payments.js ──
let _allPayments = [];
let _paymentMethods = [];
let _paymentPage = 1;
const _paymentLimit = 30;

async function renderAdminPaymentsPage(app) {
    _paymentPage = 1;
    await _loadPaymentsPage(app);
}

async function _loadPaymentsPage(app, page) {
    if (page) _paymentPage = page;
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading payments...</div>`,
        'Payments Dashboard',
        'Monitor revenue, transactions, and financial health'
    );

    let data = {
        payments: [], total: 0, page: _paymentPage, limit: _paymentLimit,
        dailyRevenue: [], byType: [], byMethod: [],
        summary: { total_revenue: 0, today_revenue: 0, monthly_revenue: 0, pending_count: 0, pending_amount: 0, refunded_count: 0 }
    };

    try {
        const [paymentsData, methods] = await Promise.all([
            API.get(`/admin/payments?page=${_paymentPage}&limit=${_paymentLimit}`),
            API.get('/admin/payment-settings').catch(() => [])
        ]);
        data = paymentsData;
        _paymentMethods = methods;
    } catch(e) {
        Helpers.showToast('Error', 'Failed to load payments data', 'error');
    }

    _allPayments = data.payments;
    const s = data.summary;

    // Build daily revenue chart (last 30 days)
    const today = new Date();
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        last30Days.push(d.toISOString().split('T')[0]);
    }
    const dayRevMap = {};
    for (const d of data.dailyRevenue) dayRevMap[String(d.date).slice(0, 10)] = parseFloat(d.total);
    const revValues = last30Days.map(d => dayRevMap[d] || 0);
    const maxRev = Math.max(...revValues, 1);
    const normalizedRevBars = revValues.map(v => Math.round((v / maxRev) * 100));

    const totalRevByType   = data.byType.reduce((sum, t) => sum + parseFloat(t.total), 0) || 1;
    const totalMethodCount = data.byMethod.reduce((sum, m) => sum + m.count, 0) || 1;
    const methodIcons = {};
    if (_paymentMethods.length > 0) {
        for (const m of _paymentMethods) methodIcons[m.method] = m.icon;
    } else {
        Object.assign(methodIcons, { gcash: '📱', card: '💳', cash: '💵', bank_transfer: '🏦' });
    }

    const methodSelectOptions = _paymentMethods.length > 0
        ? _paymentMethods.map(m => `<option value="${m.method}">${m.icon} ${m.label}</option>`).join('')
        : `<option value="gcash">GCash</option><option value="card">Card</option><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option>`;

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Today's Revenue</span>
                    <span class="dashboard-stat-card__icon">💰</span>
                </div>
                <div class="dashboard-stat-card__value">${Helpers.formatCurrency(s.today_revenue)}</div>
                <div class="dashboard-stat-card__change">Completed payments</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Monthly Revenue</span>
                    <span class="dashboard-stat-card__icon">📈</span>
                </div>
                <div class="dashboard-stat-card__value">${Helpers.formatCurrency(s.monthly_revenue)}</div>
                <div class="dashboard-stat-card__change">Last 30 days</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Pending</span>
                    <span class="dashboard-stat-card__icon">⏳</span>
                </div>
                <div class="dashboard-stat-card__value">${s.pending_count ?? 0}</div>
                <div class="dashboard-stat-card__change">${Helpers.formatCurrency(s.pending_amount ?? 0)} awaiting</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Refunds</span>
                    <span class="dashboard-stat-card__icon">↩️</span>
                </div>
                <div class="dashboard-stat-card__value">${s.refunded_count ?? 0}</div>
                <div class="dashboard-stat-card__change" style="color:var(--color-warning)">Total refunded</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Revenue — Last 30 Days</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${Helpers.renderBarChart(normalizedRevBars, null, { height: '200px' })}
                    </div>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3)">
                    <h3 style="font-size:var(--text-base);font-weight:var(--weight-semibold)">Transactions</h3>
                    <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:center">
                        <input type="text" class="form-input" placeholder="Search name, ref, type..." style="width:220px"
                               oninput="filterPaymentRows(this.value)">
                        <select class="form-input" style="width:140px" onchange="filterPaymentRows(document.querySelector('[placeholder*=Search]')?.value||'', this.value)">
                            <option value="">All Statuses</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                        </select>
                        <button class="btn btn--outline btn--sm" onclick="exportPaymentsCSV()">Export CSV</button>
                    </div>
                </div>

                <div id="payBulkBar" style="display:none;background:var(--color-accent);color:white;padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);margin-bottom:var(--space-4);align-items:center;gap:var(--space-4);flex-wrap:wrap">
                    <span id="payBulkCount" style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">0 selected</span>
                    <button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" onclick="bulkPaymentAction('completed')">Approve</button>
                    <button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" onclick="bulkPaymentAction('failed')">Reject</button>
                    <button class="btn btn--ghost btn--sm" style="color:white;margin-left:auto" onclick="clearPayBulk()">Clear</button>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                        <table class="data-table" id="paymentsTable">
                            <thead>
                                <tr>
                                    <th style="width:36px"><input type="checkbox" onchange="toggleAllPayments(this.checked)" style="accent-color:var(--color-accent)"></th>
                                    <th>User</th>
                                    <th>Type</th>
                                    <th>Method</th>
                                    <th>Ref #</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="paymentsTableBody">
                                ${_renderPaymentRows(_allPayments)}
                            </tbody>
                        </table>
                    </div>
                    ${(data.total || 0) > _paymentLimit ? `
                    <div style="display:flex;justify-content:center;align-items:center;gap:var(--space-3);padding:var(--space-4);border-top:1px solid var(--color-border)">
                        <button class="btn btn--outline btn--sm" onclick="_loadPaymentsPage(document.getElementById('app'), ${_paymentPage-1})"
                                ${_paymentPage <= 1 ? 'disabled' : ''}>← Prev</button>
                        <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Page ${_paymentPage} of ${Math.ceil((data.total||1)/_paymentLimit)}</span>
                        <button class="btn btn--outline btn--sm" onclick="_loadPaymentsPage(document.getElementById('app'), ${_paymentPage+1})"
                                ${_paymentPage >= Math.ceil((data.total||1)/_paymentLimit) ? 'disabled' : ''}>Next →</button>
                    </div>` : ''}
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Revenue by Type</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${data.byType.length === 0
                            ? `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">No revenue data yet.</div>`
                            : data.byType.map(t => {
                                const pct = Math.round((parseFloat(t.total) / totalRevByType) * 100);
                                return `
                                <div style="margin-bottom:var(--space-4)">
                                    <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-1)">
                                        <span style="font-size:var(--text-sm);text-transform:capitalize">${t.type}</span>
                                        <span style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${Helpers.formatCurrency(t.total)}</span>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:var(--space-2)">
                                        <div class="progress" style="flex:1"><div class="progress__bar" style="width:${pct}%"></div></div>
                                        <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${pct}%</span>
                                    </div>
                                </div>`;
                            }).join('')}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Payment Methods</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${data.byMethod.length === 0
                            ? `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">No method data yet.</div>`
                            : data.byMethod.map(m => {
                                const pct = Math.round((m.count / totalMethodCount) * 100);
                                const key = (m.payment_method || '').toLowerCase().replace(' ', '_');
                                const icon = methodIcons[key] || '💳';
                                const pm = _paymentMethods.find(p => p.method === key);
                                const label = pm ? pm.label : (m.payment_method || 'Unknown');
                                return `
                                <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
                                    <span style="font-size:var(--text-lg)">${icon}</span>
                                    <div style="flex:1">
                                        <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-1)">
                                            <span style="font-size:var(--text-sm)">${label}</span>
                                            <span style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${pct}%</span>
                                        </div>
                                        <div class="progress"><div class="progress__bar" style="width:${pct}%"></div></div>
                                    </div>
                                </div>`;
                            }).join('')}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Revenue Summary</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-lg)">${Helpers.formatCurrency(s.total_revenue)}</div><div class="stat__label">Total Revenue</div></div>
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-lg)">${Helpers.formatCurrency(s.monthly_revenue)}</div><div class="stat__label">This Month</div></div>
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-lg)">${s.pending_count ?? 0}</div><div class="stat__label">Pending</div></div>
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-lg)">${s.refunded_count ?? 0}</div><div class="stat__label">Refunded</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Proof Image Modal -->
        <div id="proofModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:1100;align-items:center;justify-content:center;padding:var(--space-4)" onclick="closeProofModal()">
            <div style="background:var(--color-surface);border-radius:var(--radius-xl);max-width:600px;width:100%;box-shadow:var(--shadow-xl);overflow:hidden" onclick="event.stopPropagation()">
                <div style="padding:var(--space-4) var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                    <h3 style="font-size:var(--text-base);font-weight:var(--weight-semibold)">📸 Payment Proof</h3>
                    <button class="btn btn--ghost btn--sm" onclick="closeProofModal()">✕</button>
                </div>
                <div style="padding:var(--space-4);text-align:center;min-height:200px;display:flex;align-items:center;justify-content:center" id="proofModalBody">
                    <div style="color:var(--color-text-muted);font-size:var(--text-sm)">Loading...</div>
                </div>
            </div>
        </div>

        <!-- Payment Edit Modal -->
        <div id="paymentModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;padding:var(--space-4)">
            <div style="background:var(--color-surface);border-radius:var(--radius-xl);width:100%;max-width:480px;box-shadow:var(--shadow-xl)">
                <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                    <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">Edit Payment</h3>
                    <button class="btn btn--ghost btn--sm" onclick="closePaymentModal()">✕</button>
                </div>
                <div style="padding:var(--space-2) var(--space-6);background:var(--color-bg);border-bottom:1px solid var(--color-border)">
                    <div id="paymentModalMeta" style="font-size:var(--text-sm);color:var(--color-text-muted)"></div>
                </div>
                <form id="paymentForm" onsubmit="submitPaymentEdit(event)" style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)">
                    <input type="hidden" id="paymentFormId">

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-input" id="paymentFormStatus">
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Payment Method</label>
                            <select class="form-input" id="paymentFormMethod">
                                ${methodSelectOptions}
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Amount (₱)</label>
                            <input type="number" class="form-input" id="paymentFormAmount" min="0" step="0.01">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Reference #</label>
                            <input type="text" class="form-input" id="paymentFormRef" placeholder="e.g. GCash ref no.">
                        </div>

                        <div class="form-group" style="grid-column:1/-1">
                            <label class="form-label">Description</label>
                            <input type="text" class="form-input" id="paymentFormDesc" placeholder="Payment description">
                        </div>
                    </div>

                    <div style="display:flex;gap:var(--space-3);justify-content:flex-end;padding-top:var(--space-2)">
                        <button type="button" class="btn btn--outline" onclick="closePaymentModal()">Cancel</button>
                        <button type="submit" class="btn btn--accent" id="paymentFormBtn">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Payments Dashboard', 'Monitor revenue, transactions, and financial health');

    // Close modals on backdrop click
    document.getElementById('paymentModal')?.addEventListener('click', e => {
        if (e.target === document.getElementById('paymentModal')) closePaymentModal();
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _getMethodDisplay(method) {
    if (!method) return '—';
    const pm = _paymentMethods.find(m => m.method === method);
    if (pm) return `${pm.icon} ${pm.label}`;
    const defaults = { gcash: '📱 GCash', card: '💳 Card', cash: '💵 Cash', bank_transfer: '🏦 Bank Transfer' };
    return defaults[method] || `💳 ${method}`;
}

function _renderPaymentRows(payments) {
    if (!payments.length) {
        return `<tr><td colspan="9" style="text-align:center;color:var(--color-text-muted);padding:var(--space-6)">No payments found.</td></tr>`;
    }
    return payments.map(p => {
        const statusBadge = { completed:'success', pending:'warning', failed:'error', refunded:'error' }[p.status] || 'primary';
        return `
        <tr data-id="${p.id}">
            <td><input type="checkbox" class="pay-bulk-check" data-id="${p.id}" onchange="updatePayBulkBar()" style="accent-color:var(--color-accent)"></td>
            <td style="font-weight:var(--weight-medium)">${Helpers.esc(p.first_name)} ${Helpers.esc(p.last_name)}
                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.esc(p.email)}</div>
            </td>
            <td><span class="badge badge--${p.type === 'membership' ? 'accent' : 'primary'}">${p.type}</span></td>
            <td>${_getMethodDisplay(p.payment_method)}</td>
            <td style="font-size:var(--text-xs);color:var(--color-text-muted)">${p.reference_number || '—'}</td>
            <td style="font-weight:var(--weight-semibold)">${Helpers.formatCurrency(p.amount)}</td>
            <td><span class="badge badge--${statusBadge}">${p.status}</span></td>
            <td style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.formatDate(p.created_at)}</td>
            <td style="display:flex;gap:var(--space-2);flex-wrap:wrap">
                <button class="btn btn--outline btn--sm" onclick="openPaymentModal('${p.id}')">✏️ Edit</button>
                ${p.has_proof ? `<button class="btn btn--ghost btn--sm" onclick="viewProofImage('${p.id}')">🖼 Proof</button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

function filterPaymentRows(query, statusFilter) {
    const q = (query || '').toLowerCase();
    const sf = statusFilter !== undefined ? statusFilter
        : document.querySelector('#paymentsTable select')?.value || '';

    document.querySelectorAll('#paymentsTableBody tr[data-id]').forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchQuery  = !q  || text.includes(q);
        const matchStatus = !sf || text.includes(sf);
        row.style.display = matchQuery && matchStatus ? '' : 'none';
    });
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openPaymentModal(paymentId) {
    const p = _allPayments.find(x => x.id === paymentId);
    if (!p) return;

    document.getElementById('paymentFormId').value     = p.id;
    document.getElementById('paymentFormStatus').value = p.status;
    const methodSelect = document.getElementById('paymentFormMethod');
    methodSelect.value = p.payment_method || 'cash';
    if (p.payment_method && methodSelect.value !== p.payment_method) {
        const opt = document.createElement('option');
        opt.value = p.payment_method;
        opt.textContent = '💳 ' + p.payment_method;
        methodSelect.appendChild(opt);
        methodSelect.value = p.payment_method;
    }
    document.getElementById('paymentFormAmount').value = p.amount;
    document.getElementById('paymentFormRef').value    = p.reference_number || '';
    document.getElementById('paymentFormDesc').value   = p.description || '';
    document.getElementById('paymentModalMeta').innerHTML =
        `<strong>${Helpers.esc(p.first_name)} ${Helpers.esc(p.last_name)}</strong> &nbsp;·&nbsp; ${Helpers.esc(p.type)} &nbsp;·&nbsp; ${Helpers.formatDate(p.created_at)}`;

    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
    const m = document.getElementById('paymentModal');
    if (m) m.style.display = 'none';
}

// ── Proof Image Viewer ────────────────────────────────────────────────────────

async function viewProofImage(paymentId) {
    const modal = document.getElementById('proofModal');
    const body  = document.getElementById('proofModalBody');
    body.innerHTML = `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">Loading proof image...</div>`;
    modal.style.display = 'flex';
    try {
        const data = await API.get(`/admin/payments/${paymentId}/proof`);
        body.innerHTML = `
            <img src="${data.proof_image}" alt="Payment proof"
                 style="max-width:100%;max-height:70vh;border-radius:var(--radius-md);object-fit:contain">`;
    } catch(err) {
        body.innerHTML = `<div style="color:var(--color-error);font-size:var(--text-sm)">Failed to load proof image: ${Helpers.esc(err.message)}</div>`;
    }
}

function closeProofModal() {
    const m = document.getElementById('proofModal');
    if (m) m.style.display = 'none';
}

async function exportPaymentsCSV() {
    Helpers.showToast('Exporting', 'Fetching all payments...', 'info');
    let allPayments = _allPayments;
    try {
        const data = await API.get('/admin/payments?limit=10000');
        allPayments = data.payments || allPayments;
    } catch(e) {}
    if (!allPayments.length) { Helpers.showToast('No data', 'No payments to export.', 'info'); return; }
    const headers = ['Name', 'Email', 'Type', 'Method', 'Reference', 'Amount', 'Status', 'Date'];
    const rows = allPayments.map(p => [
        `"${p.first_name} ${p.last_name}"`, `"${p.email}"`, p.type,
        p.payment_method || '', `"${p.reference_number || ''}"`,
        p.amount, p.status,
        p.created_at ? p.created_at.slice(0, 10) : ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Helpers.showToast('Exported', `${allPayments.length} payments exported.`, 'success');
}

function toggleAllPayments(checked) {
    document.querySelectorAll('.pay-bulk-check').forEach(cb => { cb.checked = checked; });
    updatePayBulkBar();
}

function updatePayBulkBar() {
    const checked = document.querySelectorAll('.pay-bulk-check:checked');
    const bar = document.getElementById('payBulkBar');
    const count = document.getElementById('payBulkCount');
    if (bar) bar.style.display = checked.length > 0 ? 'flex' : 'none';
    if (count) count.textContent = `${checked.length} selected`;
}

function clearPayBulk() {
    document.querySelectorAll('.pay-bulk-check').forEach(cb => { cb.checked = false; });
    const headerCb = document.querySelector('#paymentsTable thead input[type=checkbox]');
    if (headerCb) headerCb.checked = false;
    updatePayBulkBar();
}

async function bulkPaymentAction(newStatus) {
    const ids = [...document.querySelectorAll('.pay-bulk-check:checked')].map(cb => cb.dataset.id);
    if (ids.length === 0) return;
    if (!await Helpers.confirmAction('Bulk Update?', `Set ${ids.length} payment(s) to "${newStatus}"?`, { confirmText: 'Update All', type: 'warning' })) return;

    let success = 0;
    for (const id of ids) {
        try {
            await API.put(`/admin/payments/${id}`, { status: newStatus });
            success++;
        } catch(e) {}
    }
    Helpers.showToast('Bulk Update', `${success} of ${ids.length} payments updated.`, 'success');
    _loadPaymentsPage(document.getElementById('app'));
}

async function submitPaymentEdit(e) {
    e.preventDefault();
    const btn = document.getElementById('paymentFormBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = document.getElementById('paymentFormId').value;
    const payload = {
        status:           document.getElementById('paymentFormStatus').value,
        payment_method:   document.getElementById('paymentFormMethod').value,
        amount:           parseFloat(document.getElementById('paymentFormAmount').value),
        reference_number: document.getElementById('paymentFormRef').value.trim(),
        description:      document.getElementById('paymentFormDesc').value.trim(),
    };

    try {
        const updated = await API.put(`/admin/payments/${id}`, payload);
        // Update local cache
        const idx = _allPayments.findIndex(p => p.id === id);
        if (idx !== -1) _allPayments[idx] = { ..._allPayments[idx], ...updated };
        // Refresh table row
        document.getElementById('paymentsTableBody').innerHTML = _renderPaymentRows(_allPayments);
        closePaymentModal();
        Helpers.showToast('Updated!', 'Payment record saved.', 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}


// ── js/pages/admin/admin-spaces.js ──
// Admin Spaces Management
let _adminSpaces = [];
let _spaceTypes  = [];

async function renderAdminSpacesPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading spaces...</div>`,
        'Space Management', 'Add, edit, and manage bookable spaces'
    );

    try {
        [_adminSpaces, _spaceTypes] = await Promise.all([
            API.get('/admin/spaces').catch(() => []),
            API.get('/admin/space-types').catch(() => [])
        ]);
    } catch(e) {}

    _renderSpacesLayout(app);
}

function _getTypeMap() {
    const colors = {};
    const labels = {};
    _spaceTypes.forEach(t => { colors[t.name] = t.badge_color; labels[t.name] = t.label; });
    return { colors, labels };
}

function _renderSpacesLayout(app) {
    const { colors: typeColors, labels: typeLabel } = _getTypeMap();

    const rows = _adminSpaces.length === 0
        ? `<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">No spaces found. Add your first space.</td></tr>`
        : _adminSpaces.map(s => {
            const amenities = Array.isArray(s.amenities) ? s.amenities
                : JSON.parse(s.amenities || '[]');
            return `
            <tr id="space-row-${s.id}">
                <td>
                    <div style="font-weight:var(--weight-medium)">${s.name}</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${s.floor || '—'}</div>
                </td>
                <td><span class="badge badge--${typeColors[s.type] || 'primary'}">${typeLabel[s.type] || s.type}</span></td>
                <td style="text-align:center">${s.capacity} ${s.capacity > 1 ? 'people' : 'person'}</td>
                <td>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;max-width:200px">
                        ${amenities.slice(0,3).map(a => `<span class="badge badge--primary" style="font-size:10px">${a}</span>`).join('')}
                        ${amenities.length > 3 ? `<span style="font-size:var(--text-xs);color:var(--color-text-muted)">+${amenities.length - 3}</span>` : ''}
                    </div>
                </td>
                <td style="font-weight:var(--weight-semibold);color:var(--color-accent)">${Helpers.formatCurrency(s.hourly_rate)}<span style="font-size:var(--text-xs);font-weight:400;color:var(--color-text-muted)">/hr</span></td>
                <td>
                    <label class="toggle-switch" title="${s.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}">
                        <input type="checkbox" ${s.is_active ? 'checked' : ''} onchange="toggleSpaceActive('${s.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <div style="display:flex;gap:var(--space-2)">
                        <button class="btn btn--outline btn--sm" onclick="openSpaceModal('${s.id}')">✏️ Edit</button>
                        <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="deleteSpace('${s.id}', '${s.name.replace(/'/g,"\\'")}')">🗑</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

    const content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
            <div>
                <span style="font-size:var(--text-sm);color:var(--color-text-muted)">${_adminSpaces.length} total · ${_adminSpaces.filter(s=>s.is_active).length} active</span>
            </div>
            <button class="btn btn--accent" onclick="openSpaceModal(null)">+ Add Space</button>
        </div>

        <div class="dashboard-card">
            <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                <table style="width:100%;border-collapse:collapse">
                    <thead>
                        <tr style="border-bottom:2px solid var(--color-border)">
                            <th style="padding:var(--space-3) var(--space-5);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Space</th>
                            <th style="padding:var(--space-3) var(--space-4);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Type</th>
                            <th style="padding:var(--space-3) var(--space-4);text-align:center;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Capacity</th>
                            <th style="padding:var(--space-3) var(--space-4);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Amenities</th>
                            <th style="padding:var(--space-3) var(--space-4);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Rate</th>
                            <th style="padding:var(--space-3) var(--space-4);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Active</th>
                            <th style="padding:var(--space-3) var(--space-5);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="spacesTableBody">
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Space Types Manager -->
        <div class="dashboard-card" style="margin-top:var(--space-8)">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">Space Types</h3>
                <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${_spaceTypes.length} types · cannot delete types in use</span>
            </div>
            <div class="dashboard-card__body">
                <div id="spaceTypesList" style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-5)">
                    ${_spaceTypes.length === 0
                        ? '<span style="color:var(--color-text-muted);font-size:var(--text-sm)">No types yet.</span>'
                        : _spaceTypes.map(t => `
                            <div style="display:flex;align-items:center;gap:var(--space-2);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-full);padding:var(--space-1) var(--space-1) var(--space-1) var(--space-3)">
                                <span class="badge badge--${t.badge_color}">${t.label}</span>
                                <button class="btn btn--ghost btn--xs" style="border-radius:50%;width:22px;height:22px;padding:0;color:var(--color-text-muted)"
                                        onclick="deleteSpaceType(${t.id}, '${t.label.replace(/'/g,"\\'")}')">✕</button>
                            </div>`).join('')}
                </div>
                <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:flex-end">
                    <div class="form-group" style="margin:0;flex:1;min-width:160px">
                        <label class="form-label">Type Label</label>
                        <input type="text" class="form-input" id="newTypeLabel" placeholder="e.g. Hot Desk">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Badge Color</label>
                        <select class="form-input" id="newTypeColor">
                            <option value="primary">Blue (Primary)</option>
                            <option value="accent">Teal (Accent)</option>
                            <option value="success">Green (Success)</option>
                            <option value="warning">Yellow (Warning)</option>
                            <option value="error">Red (Error)</option>
                        </select>
                    </div>
                    <button class="btn btn--accent" onclick="addSpaceType()" style="height:42px">+ Add Type</button>
                </div>
            </div>
        </div>

        <!-- Space Modal -->
        <div id="spaceModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;padding:var(--space-4)">
            <div style="background:var(--color-surface);border-radius:var(--radius-xl);width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-xl)">
                <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                    <h3 id="spaceModalTitle" style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">Add Space</h3>
                    <button class="btn btn--ghost btn--sm" onclick="closeSpaceModal()">✕</button>
                </div>
                <form id="spaceForm" onsubmit="submitSpaceForm(event)" style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-5)">
                    <input type="hidden" id="spaceFormId">

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                        <div class="form-group" style="grid-column:1/-1">
                            <label class="form-label">Space Name <span style="color:var(--color-error)">*</span></label>
                            <input type="text" class="form-input" id="spaceFormName" placeholder="e.g. Study Seat A3" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Type <span style="color:var(--color-error)">*</span></label>
                            <select class="form-input" id="spaceFormType" required>
                                ${_spaceTypes.map(t => `<option value="${t.name}">${t.label}</option>`).join('')}
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Floor</label>
                            <input type="text" class="form-input" id="spaceFormFloor" placeholder="e.g. 1st Floor">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Capacity <span style="color:var(--color-error)">*</span></label>
                            <input type="number" class="form-input" id="spaceFormCapacity" min="1" max="50" value="1" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Hourly Rate (₱)</label>
                            <input type="number" class="form-input" id="spaceFormRate" min="0" step="0.01" placeholder="0.00">
                        </div>

                        <div class="form-group" style="grid-column:1/-1">
                            <label class="form-label">Amenities <span style="font-size:var(--text-xs);color:var(--color-text-muted)">(comma-separated)</span></label>
                            <input type="text" class="form-input" id="spaceFormAmenities" placeholder="WiFi, Power Outlet, Monitor, Whiteboard">
                        </div>

                        <div class="form-group" style="grid-column:1/-1">
                            <label class="form-label">Description</label>
                            <textarea class="form-input" id="spaceFormDesc" rows="2" placeholder="Optional description..."></textarea>
                        </div>

                        <div class="form-group" style="grid-column:1/-1;display:flex;align-items:center;gap:var(--space-3)">
                            <label class="toggle-switch">
                                <input type="checkbox" id="spaceFormActive" checked>
                                <span class="toggle-slider"></span>
                            </label>
                            <span style="font-size:var(--text-sm)">Space is active (visible to users)</span>
                        </div>
                    </div>

                    <div style="display:flex;gap:var(--space-3);justify-content:flex-end;padding-top:var(--space-2)">
                        <button type="button" class="btn btn--outline" onclick="closeSpaceModal()">Cancel</button>
                        <button type="submit" class="btn btn--accent" id="spaceFormSubmitBtn">Save Space</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Space Management', 'Add, edit, and manage bookable spaces');
}

function openSpaceModal(spaceId) {
    const modal = document.getElementById('spaceModal');
    const title = document.getElementById('spaceModalTitle');
    const form  = document.getElementById('spaceForm');
    form.reset();

    if (spaceId) {
        const s = _adminSpaces.find(x => x.id === spaceId);
        if (!s) return;
        title.textContent = 'Edit Space';
        document.getElementById('spaceFormId').value       = s.id;
        document.getElementById('spaceFormName').value     = s.name;
        document.getElementById('spaceFormType').value     = s.type;
        document.getElementById('spaceFormFloor').value    = s.floor || '';
        document.getElementById('spaceFormCapacity').value = s.capacity;
        document.getElementById('spaceFormRate').value     = s.hourly_rate || '';
        document.getElementById('spaceFormDesc').value     = s.description || '';
        document.getElementById('spaceFormActive').checked = s.is_active;
        const amenities = Array.isArray(s.amenities) ? s.amenities : JSON.parse(s.amenities || '[]');
        document.getElementById('spaceFormAmenities').value = amenities.join(', ');
    } else {
        title.textContent = 'Add Space';
        document.getElementById('spaceFormId').value = '';
        document.getElementById('spaceFormActive').checked = true;
    }

    modal.style.display = 'flex';
}

function closeSpaceModal() {
    const modal = document.getElementById('spaceModal');
    if (modal) modal.style.display = 'none';
}

async function submitSpaceForm(e) {
    e.preventDefault();
    const btn = document.getElementById('spaceFormSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = document.getElementById('spaceFormId').value;
    const payload = {
        name:        document.getElementById('spaceFormName').value.trim(),
        type:        document.getElementById('spaceFormType').value,
        floor:       document.getElementById('spaceFormFloor').value.trim(),
        capacity:    parseInt(document.getElementById('spaceFormCapacity').value) || 1,
        hourly_rate: parseFloat(document.getElementById('spaceFormRate').value) || 0,
        amenities:   document.getElementById('spaceFormAmenities').value,
        description: document.getElementById('spaceFormDesc').value.trim(),
        is_active:   document.getElementById('spaceFormActive').checked,
    };

    try {
        let saved;
        if (id) {
            saved = await API.put(`/admin/spaces/${id}`, payload);
            const idx = _adminSpaces.findIndex(s => s.id === id);
            if (idx !== -1) _adminSpaces[idx] = saved;
            Helpers.showToast('Updated!', `${saved.name} has been updated.`, 'success');
        } else {
            saved = await API.post('/admin/spaces', payload);
            _adminSpaces.push(saved);
            Helpers.showToast('Created!', `${saved.name} has been added.`, 'success');
        }
        closeSpaceModal();
        _refreshTable();
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Space';
    }
}

async function toggleSpaceActive(spaceId, isActive) {
    const space = _adminSpaces.find(s => s.id === spaceId);
    if (!space) return;
    try {
        const saved = await API.put(`/admin/spaces/${spaceId}`, { ...space, is_active: isActive });
        space.is_active = saved.is_active;
        Helpers.showToast(isActive ? 'Activated' : 'Deactivated', `${space.name} is now ${isActive ? 'active' : 'inactive'}.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function deleteSpace(spaceId, spaceName) {
    if (!await Helpers.confirmAction('Delete Space?', `Delete "${spaceName}"? If it has active bookings it will be deactivated instead.`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/spaces/${spaceId}`);
        _adminSpaces = _adminSpaces.filter(s => s.id !== spaceId);
        Helpers.showToast('Done', `${spaceName} removed.`, 'success');
        _refreshTable();
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

function _refreshTable() {
    const typeColors = { study_seat:'primary', private_room:'accent', coworking:'success', meeting_room:'warning' };
    const typeLabel  = { study_seat:'Study Seat', private_room:'Private Room', coworking:'Coworking', meeting_room:'Meeting Room' };
    const tbody = document.getElementById('spacesTableBody');
    if (!tbody) return;

    if (_adminSpaces.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">No spaces found. Add your first space.</td></tr>`;
        return;
    }

    tbody.innerHTML = _adminSpaces.map(s => {
        const amenities = Array.isArray(s.amenities) ? s.amenities : JSON.parse(s.amenities || '[]');
        return `
        <tr id="space-row-${s.id}">
            <td style="padding:var(--space-4) var(--space-5)">
                <div style="font-weight:var(--weight-medium)">${s.name}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${s.floor || '—'}</div>
            </td>
            <td style="padding:var(--space-4)"><span class="badge badge--${typeColors[s.type]||'primary'}">${typeLabel[s.type]||s.type}</span></td>
            <td style="padding:var(--space-4);text-align:center">${s.capacity} ${s.capacity>1?'people':'person'}</td>
            <td style="padding:var(--space-4)">
                <div style="display:flex;flex-wrap:wrap;gap:4px;max-width:200px">
                    ${amenities.slice(0,3).map(a=>`<span class="badge badge--primary" style="font-size:10px">${a}</span>`).join('')}
                    ${amenities.length>3?`<span style="font-size:var(--text-xs);color:var(--color-text-muted)">+${amenities.length-3}</span>`:''}
                </div>
            </td>
            <td style="padding:var(--space-4);font-weight:var(--weight-semibold);color:var(--color-accent)">${Helpers.formatCurrency(s.hourly_rate)}<span style="font-size:var(--text-xs);font-weight:400;color:var(--color-text-muted)">/hr</span></td>
            <td style="padding:var(--space-4)">
                <label class="toggle-switch">
                    <input type="checkbox" ${s.is_active?'checked':''} onchange="toggleSpaceActive('${s.id}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </td>
            <td style="padding:var(--space-4) var(--space-5)">
                <div style="display:flex;gap:var(--space-2)">
                    <button class="btn btn--outline btn--sm" onclick="openSpaceModal('${s.id}')">✏️ Edit</button>
                    <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="deleteSpace('${s.id}','${s.name.replace(/'/g,"\\'")}')">🗑</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Update count
    const countEl = document.querySelector('[data-spaces-count]');
    if (countEl) countEl.textContent = `${_adminSpaces.length} total · ${_adminSpaces.filter(s=>s.is_active).length} active`;
}

// ── Space Types ──────────────────────────────────────────────────────────────

async function addSpaceType() {
    const label = document.getElementById('newTypeLabel')?.value.trim();
    const color = document.getElementById('newTypeColor')?.value || 'primary';
    if (!label) { Helpers.showToast('Required', 'Enter a type label.', 'error'); return; }

    try {
        const newType = await API.post('/admin/space-types', { label, badge_color: color });
        _spaceTypes.push(newType);
        document.getElementById('newTypeLabel').value = '';
        _refreshTypesList();
        _refreshTypeDropdown();
        Helpers.showToast('Added!', `"${newType.label}" type created.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function deleteSpaceType(typeId, typeLabel) {
    if (!await Helpers.confirmAction('Delete Type?', `Delete type "${typeLabel}"? This will fail if any spaces use it.`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/space-types/${typeId}`);
        _spaceTypes = _spaceTypes.filter(t => t.id !== typeId);
        _refreshTypesList();
        _refreshTypeDropdown();
        Helpers.showToast('Deleted', `"${typeLabel}" type removed.`, 'success');
    } catch(err) {
        Helpers.showToast('Cannot Delete', err.message, 'error');
    }
}

function _refreshTypesList() {
    const container = document.getElementById('spaceTypesList');
    if (!container) return;
    if (_spaceTypes.length === 0) {
        container.innerHTML = '<span style="color:var(--color-text-muted);font-size:var(--text-sm)">No types yet.</span>';
        return;
    }
    container.innerHTML = _spaceTypes.map(t => `
        <div style="display:flex;align-items:center;gap:var(--space-2);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-full);padding:var(--space-1) var(--space-1) var(--space-1) var(--space-3)">
            <span class="badge badge--${t.badge_color}">${t.label}</span>
            <button class="btn btn--ghost btn--xs" style="border-radius:50%;width:22px;height:22px;padding:0;color:var(--color-text-muted)"
                    onclick="deleteSpaceType(${t.id}, '${t.label.replace(/'/g,"\\'")}')">✕</button>
        </div>`).join('');
}

function _refreshTypeDropdown() {
    const sel = document.getElementById('spaceFormType');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = _spaceTypes.map(t =>
        `<option value="${t.name}" ${t.name === current ? 'selected' : ''}>${t.label}</option>`
    ).join('');
}

// Close modal when clicking backdrop
document.addEventListener('click', e => {
    const modal = document.getElementById('spaceModal');
    if (modal && e.target === modal) closeSpaceModal();
});


// ── js/pages/admin/admin-plans.js ──
let _adminPlans = [];

async function renderAdminPlansPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading plans...</div>`,
        'Pricing Plans', 'Edit and control your membership pricing'
    );
    try {
        _adminPlans = await API.get('/admin/plans');
    } catch(e) { _adminPlans = []; }
    _renderPlansLayout(app);
}

function _renderPlansLayout(app) {
    const planCards = _adminPlans.length === 0
        ? `<div style="text-align:center;padding:var(--space-12);color:var(--color-text-muted)">No plans yet. Create your first plan.</div>`
        : _adminPlans.map(p => {
            const features = Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]');
            const isFree = parseFloat(p.price) === 0;
            return `
            <div style="background:var(--color-surface);border:2px solid ${p.is_featured ? 'var(--color-primary)' : 'var(--color-border)'};border-radius:var(--radius-xl);padding:var(--space-6);position:relative;opacity:${p.is_active ? 1 : 0.5}">
                ${p.badge_text ? `<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:var(--color-primary);color:#fff;padding:4px 18px;border-radius:var(--radius-full);font-size:var(--text-xs);font-weight:700;white-space:nowrap">${p.badge_text}</div>` : ''}
                ${!p.is_active ? `<div style="position:absolute;top:var(--space-3);right:var(--space-3)"><span class="badge badge--error">Inactive</span></div>` : ''}

                <div style="text-align:center;margin-bottom:var(--space-4)">
                    <div style="font-weight:700;font-size:var(--text-lg);margin-bottom:var(--space-2)">${p.name}</div>
                    <div style="font-size:var(--text-3xl);font-weight:800;color:var(--color-primary)">
                        ${isFree ? 'Free' : '&#8369;' + Number(p.price).toLocaleString() + '<span style="font-size:var(--text-base);font-weight:400;color:var(--color-text-muted)">/mo</span>'}
                    </div>
                    <div style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">${p.description || ''}</div>
                </div>

                <ul style="list-style:none;padding:0;margin:0 0 var(--space-5) 0;display:flex;flex-direction:column;gap:var(--space-2)">
                    ${features.map(f => `<li style="display:flex;align-items:flex-start;gap:var(--space-2);font-size:var(--text-sm)"><span style="color:var(--color-primary);flex-shrink:0">✓</span>${f}</li>`).join('')}
                </ul>

                <div style="display:flex;gap:var(--space-2)">
                    <button class="btn btn--accent btn--sm" style="flex:1" onclick="openPlanModal('${p.id}')">✏️ Edit</button>
                    <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="deletePlan('${p.id}','${p.name.replace(/'/g,"\\'")}')">🗑</button>
                </div>
                <div style="margin-top:var(--space-3);display:flex;align-items:center;justify-content:space-between">
                    <span style="font-size:var(--text-xs);color:var(--color-text-muted)">Order: ${p.sort_order}</span>
                    <label class="toggle-switch" title="${p.is_active ? 'Active' : 'Inactive'}">
                        <input type="checkbox" ${p.is_active ? 'checked' : ''} onchange="togglePlanActive('${p.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>`;
        }).join('');

    const content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
            <span style="font-size:var(--text-sm);color:var(--color-text-muted)">${_adminPlans.length} plans · ${_adminPlans.filter(p=>p.is_active).length} active</span>
            <button class="btn btn--accent" onclick="openPlanModal(null)">+ Add Plan</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-6);margin-bottom:var(--space-8)">
            ${planCards}
        </div>

        <!-- Live Preview hint -->
        <div class="dashboard-card">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">💡 How it works</h3>
            </div>
            <div class="dashboard-card__body">
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-4);font-size:var(--text-sm);color:var(--color-text-secondary)">
                    <div><strong style="color:var(--color-text)">Badge Text</strong><br>Shows the pill above the card (e.g. "Most Popular")</div>
                    <div><strong style="color:var(--color-text)">Is Featured</strong><br>Adds a colored border and makes the button solid</div>
                    <div><strong style="color:var(--color-text)">Button Text</strong><br>The CTA label (e.g. "Start Free Trial", "Contact Sales")</div>
                    <div><strong style="color:var(--color-text)">Sort Order</strong><br>Controls left-to-right display order on the pricing page</div>
                </div>
            </div>
        </div>

        <!-- Plan Edit Modal -->
        <div id="planModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:flex-start;justify-content:center;padding:var(--space-6);overflow-y:auto">
            <div style="background:var(--color-surface);border-radius:var(--radius-xl);width:100%;max-width:600px;margin:auto;box-shadow:var(--shadow-xl)">
                <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                    <h3 id="planModalTitle" style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">Add Plan</h3>
                    <button class="btn btn--ghost btn--sm" onclick="closePlanModal()">✕</button>
                </div>
                <form id="planForm" onsubmit="submitPlanForm(event)" style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-5)">
                    <input type="hidden" id="planFormId">

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                        <div class="form-group">
                            <label class="form-label">Plan Name <span style="color:var(--color-error)">*</span></label>
                            <input type="text" class="form-input" id="planFormName" placeholder="e.g. Scholar" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Price (₱/mo) <span style="font-size:var(--text-xs);color:var(--color-text-muted)">0 = Free</span></label>
                            <input type="number" class="form-input" id="planFormPrice" min="0" step="0.01" placeholder="0.00">
                        </div>
                        <div class="form-group" style="grid-column:1/-1">
                            <label class="form-label">Tagline / Description</label>
                            <input type="text" class="form-input" id="planFormDesc" placeholder="e.g. For serious students">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Badge Text <span style="font-size:var(--text-xs);color:var(--color-text-muted)">(optional pill above card)</span></label>
                            <input type="text" class="form-input" id="planFormBadge" placeholder="e.g. Most Popular">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Button Text</label>
                            <input type="text" class="form-input" id="planFormBtn" placeholder="e.g. Start Free Trial">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Sort Order <span style="font-size:var(--text-xs);color:var(--color-text-muted)">(1 = leftmost)</span></label>
                            <input type="number" class="form-input" id="planFormOrder" min="0" value="1">
                        </div>
                        <div class="form-group" style="display:flex;flex-direction:column;gap:var(--space-3);justify-content:flex-end">
                            <label style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer">
                                <label class="toggle-switch"><input type="checkbox" id="planFormFeatured"><span class="toggle-slider"></span></label>
                                <span style="font-size:var(--text-sm)">Featured (colored border + solid button)</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer">
                                <label class="toggle-switch"><input type="checkbox" id="planFormActive" checked><span class="toggle-slider"></span></label>
                                <span style="font-size:var(--text-sm)">Active (visible on pricing page)</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Features <span style="font-size:var(--text-xs);color:var(--color-text-muted)">— one per line</span></label>
                        <div id="planFeaturesList" style="display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-2)"></div>
                        <button type="button" class="btn btn--outline btn--sm" onclick="addFeatureRow()">+ Add Feature</button>
                    </div>

                    <div style="display:flex;gap:var(--space-3);justify-content:flex-end;padding-top:var(--space-2)">
                        <button type="button" class="btn btn--outline" onclick="closePlanModal()">Cancel</button>
                        <button type="submit" class="btn btn--accent" id="planFormSubmitBtn">Save Plan</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Pricing Plans', 'Edit and control your membership pricing');
    document.getElementById('planModal')?.addEventListener('click', e => {
        if (e.target === document.getElementById('planModal')) closePlanModal();
    });
}

// ── Features editor ───────────────────────────────────────────────────────────

function addFeatureRow(value) {
    const list = document.getElementById('planFeaturesList');
    if (!list) return;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:var(--space-2);align-items:center';
    row.innerHTML = `
        <input type="text" class="form-input plan-feature-input" placeholder="e.g. 5 bookings per day" value="${(value||'').replace(/"/g,'&quot;')}" style="flex:1">
        <button type="button" class="btn btn--ghost btn--sm" style="color:var(--color-error);flex-shrink:0" onclick="this.parentElement.remove()">✕</button>`;
    list.appendChild(row);
    row.querySelector('input').focus();
}

function _loadFeatures(features) {
    const list = document.getElementById('planFeaturesList');
    if (!list) return;
    list.innerHTML = '';
    (features || []).forEach(f => addFeatureRow(f));
}

function _collectFeatures() {
    return [...document.querySelectorAll('.plan-feature-input')]
        .map(i => i.value.trim()).filter(Boolean);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openPlanModal(planId) {
    document.getElementById('planForm')?.reset();
    document.getElementById('planFeaturesList').innerHTML = '';

    if (planId) {
        const p = _adminPlans.find(x => x.id === planId);
        if (!p) return;
        document.getElementById('planModalTitle').textContent = 'Edit Plan';
        document.getElementById('planFormId').value      = p.id;
        document.getElementById('planFormName').value    = p.name;
        document.getElementById('planFormPrice').value   = p.price;
        document.getElementById('planFormDesc').value    = p.description || '';
        document.getElementById('planFormBadge').value   = p.badge_text || '';
        document.getElementById('planFormBtn').value     = p.button_text || '';
        document.getElementById('planFormOrder').value   = p.sort_order || 1;
        document.getElementById('planFormFeatured').checked = p.is_featured;
        document.getElementById('planFormActive').checked   = p.is_active;
        const features = Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]');
        _loadFeatures(features);
    } else {
        document.getElementById('planModalTitle').textContent = 'Add Plan';
        document.getElementById('planFormId').value = '';
        document.getElementById('planFormActive').checked   = true;
        document.getElementById('planFormFeatured').checked = false;
        addFeatureRow();
    }
    document.getElementById('planModal').style.display = 'flex';
}

function closePlanModal() {
    const m = document.getElementById('planModal');
    if (m) m.style.display = 'none';
}

async function submitPlanForm(e) {
    e.preventDefault();
    const btn = document.getElementById('planFormSubmitBtn');
    btn.disabled = true; btn.textContent = 'Saving...';

    const id = document.getElementById('planFormId').value;
    const payload = {
        name:        document.getElementById('planFormName').value.trim(),
        price:       parseFloat(document.getElementById('planFormPrice').value) || 0,
        description: document.getElementById('planFormDesc').value.trim(),
        badge_text:  document.getElementById('planFormBadge').value.trim() || null,
        button_text: document.getElementById('planFormBtn').value.trim() || 'Get Started',
        sort_order:  parseInt(document.getElementById('planFormOrder').value) || 1,
        is_featured: document.getElementById('planFormFeatured').checked,
        is_active:   document.getElementById('planFormActive').checked,
        features:    _collectFeatures(),
    };

    try {
        let saved;
        if (id) {
            saved = await API.put(`/admin/plans/${id}`, payload);
            const idx = _adminPlans.findIndex(p => p.id === id);
            if (idx !== -1) _adminPlans[idx] = saved;
            Helpers.showToast('Updated!', `${saved.name} plan saved.`, 'success');
        } else {
            saved = await API.post('/admin/plans', payload);
            _adminPlans.push(saved);
            Helpers.showToast('Created!', `${saved.name} plan added.`, 'success');
        }
        _adminPlans.sort((a, b) => a.sort_order - b.sort_order);
        closePlanModal();
        _renderPlansLayout(document.getElementById('app'));
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Save Plan';
    }
}

async function togglePlanActive(planId, isActive) {
    const plan = _adminPlans.find(p => p.id === planId);
    if (!plan) return;
    try {
        const saved = await API.put(`/admin/plans/${planId}`, {
            ...plan,
            features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]'),
            is_active: isActive
        });
        plan.is_active = saved.is_active;
        Helpers.showToast(isActive ? 'Activated' : 'Deactivated', `${plan.name} is now ${isActive ? 'visible' : 'hidden'} on the pricing page.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function deletePlan(planId, planName) {
    if (!await Helpers.confirmAction('Delete Plan?', `Delete "${planName}"? Users currently on this plan will lose their subscription.`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/plans/${planId}`);
        _adminPlans = _adminPlans.filter(p => p.id !== planId);
        Helpers.showToast('Deleted', `${planName} removed.`, 'success');
        _renderPlansLayout(document.getElementById('app'));
    } catch(err) {
        Helpers.showToast('Cannot Delete', err.message, 'error');
    }
}


// ── js/pages/admin/admin-payment-settings.js ──
let _paymentSettings = [];

// ─── Payment icon palette ──────────────────────────────────────────────
const _PM_ICONS = [
    ['💳','Card / Credit'],['📱','Mobile / GCash'],['🏦','Bank'],['💵','Cash / Bills'],
    ['💰','Money Bag'],['💸','Wire Transfer'],['🏧','ATM'],['🪙','Coin'],
    ['📲','App Payment'],['🌐','Online / Web'],['⚡','Instant Pay'],['🔒','Secure Pay'],
    ['🤝','Agreement'],['🏪','Pay at Store'],['💎','Premium'],['✅','Verified'],
    ['🎁','Voucher / Gift'],['🧾','Receipt'],['🔑','Access / Key'],['💲','Dollar']
];

function _buildIconGrid() {
    return _PM_ICONS.map(([emoji, label]) =>
        `<button type="button" title="${label}" onclick="selectPaymentIcon('${emoji}')"
                 style="font-size:20px;padding:6px 4px;border:1px solid transparent;background:none;
                        cursor:pointer;border-radius:6px;line-height:1;transition:background .12s,border-color .12s"
                 onmouseover="this.style.background='var(--color-surface-hover,var(--color-surface))';this.style.borderColor='var(--color-border)'"
                 onmouseout="this.style.background='none';this.style.borderColor='transparent'">${emoji}</button>`
    ).join('');
}

// ─── Page entry point ──────────────────────────────────────────────────
async function renderAdminPaymentSettingsPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading payment settings...</div>`,
        'Payment Settings', 'Control payment methods and instructions shown at checkout'
    );
    try {
        _paymentSettings = await API.get('/admin/payment-settings');
    } catch(e) { _paymentSettings = []; }
    _renderPaymentSettingsLayout(app);
}

// ─── Layout ────────────────────────────────────────────────────────────
function _renderPaymentSettingsLayout(app) {
    const cards   = _paymentSettings.map(s => _renderMethodCard(s)).join('');
    const iconGrid = _buildIconGrid();

    const content = `
        <div style="margin-bottom:var(--space-6);display:flex;justify-content:space-between;align-items:center;gap:var(--space-4)">
            <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);
                        padding:var(--space-4);font-size:var(--text-sm);color:var(--color-text-secondary);flex:1">
                💡 Changes apply immediately to the checkout page. Disabling a method hides it from users.
            </div>
            <button class="btn btn--primary" onclick="openAddPaymentMethodModal()">＋ Add Method</button>
        </div>

        <div id="payment-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:var(--space-6)">
            ${cards || '<div style="color:var(--color-text-muted);padding:var(--space-8)">No payment methods found.</div>'}
        </div>

        <!-- ── Add Payment Method Modal ── -->
        <div id="add-pm-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center">
            <div style="background:var(--color-bg);border-radius:var(--radius-lg);padding:var(--space-8);
                        width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-xl)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
                    <h2 style="font-size:var(--text-xl);font-weight:700">Add Payment Method</h2>
                    <button class="btn btn--ghost btn--sm btn--icon" onclick="closeAddPaymentMethodModal()">✕</button>
                </div>

                <form id="add-pm-form" onsubmit="submitAddPaymentMethod(event)">
                    <div style="display:flex;flex-direction:column;gap:var(--space-4)">

                        <!-- Label + Icon picker row -->
                        <div style="display:grid;grid-template-columns:1fr auto;gap:var(--space-3);align-items:end">
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Label <span style="color:var(--color-error)">*</span></label>
                                <input type="text" class="form-input" id="new-pm-label" placeholder="e.g. PayMaya" required>
                            </div>
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Icon</label>
                                <!-- Custom icon picker -->
                                <div style="position:relative" id="icon-picker-wrap">
                                    <input type="hidden" id="new-pm-icon" value="💳">
                                    <button type="button" id="icon-picker-btn"
                                            onclick="toggleIconPicker(event)"
                                            style="width:72px;height:44px;font-size:22px;display:flex;align-items:center;
                                                   justify-content:center;background:var(--color-surface);
                                                   border:1px solid var(--color-border);border-radius:var(--radius-md);
                                                   cursor:pointer;gap:4px;transition:border-color .15s"
                                            onmouseover="this.style.borderColor='var(--color-primary)'"
                                            onmouseout="this.style.borderColor='var(--color-border)'">
                                        <span id="icon-picker-preview">💳</span>
                                        <span style="font-size:10px;color:var(--color-text-muted)">▾</span>
                                    </button>
                                    <!-- Dropdown grid -->
                                    <div id="icon-picker-dropdown"
                                         style="display:none;position:absolute;top:calc(100% + 6px);right:0;
                                                width:248px;background:var(--color-bg);
                                                border:1px solid var(--color-border);border-radius:var(--radius-md);
                                                box-shadow:var(--shadow-lg);padding:var(--space-3);z-index:300">
                                        <div style="font-size:var(--text-xs);color:var(--color-text-muted);
                                                    margin-bottom:var(--space-2);font-weight:500">
                                            Choose an icon
                                        </div>
                                        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:2px">
                                            ${iconGrid}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Type selector -->
                        <div class="form-group" style="margin:0">
                            <label class="form-label">Type</label>
                            <select class="form-input" id="new-pm-type" onchange="toggleNewPmFields()">
                                <option value="account">Account-based (number &amp; name)</option>
                                <option value="instruction">Instruction-based (text only)</option>
                            </select>
                        </div>

                        <!-- Account fields -->
                        <div id="new-pm-account-fields" style="display:flex;flex-direction:column;gap:var(--space-3)">
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Account Number</label>
                                <input type="text" class="form-input" id="new-pm-number" placeholder="e.g. 0917-123-4567">
                            </div>
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Account Name</label>
                                <input type="text" class="form-input" id="new-pm-account_name" placeholder="e.g. MugTuon Hub">
                            </div>
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Note (optional)</label>
                                <input type="text" class="form-input" id="new-pm-note" placeholder="e.g. Include your name in the remarks">
                            </div>
                            <div style="display:flex;align-items:center;gap:var(--space-3);
                                        padding:var(--space-3);background:var(--color-surface);border-radius:var(--radius-md)">
                                <label class="toggle-switch" style="flex-shrink:0">
                                    <input type="checkbox" id="new-pm-require_screenshot">
                                    <span class="toggle-slider"></span>
                                </label>
                                <div>
                                    <div style="font-size:var(--text-sm);font-weight:600">📸 Require payment screenshot</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">User must upload proof before checkout completes</div>
                                </div>
                            </div>
                        </div>

                        <!-- Instruction fields -->
                        <div id="new-pm-instruction-fields" style="display:none;flex-direction:column;gap:var(--space-3)">
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Instruction Text</label>
                                <textarea class="form-input" id="new-pm-instruction" rows="3"
                                          placeholder="Instructions shown to the user at checkout"></textarea>
                            </div>
                        </div>

                        <div style="display:flex;justify-content:flex-end;gap:var(--space-3);padding-top:var(--space-2)">
                            <button type="button" class="btn btn--secondary" onclick="closeAddPaymentMethodModal()">Cancel</button>
                            <button type="submit" class="btn btn--primary">Add Method</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Payment Settings', 'Control payment methods and instructions shown at checkout');
}

// ─── Screenshot toggle helper ──────────────────────────────────────────
function _screenshotToggleHtml(method, checked) {
    return `
    <div style="display:flex;align-items:center;gap:var(--space-3);
                padding:var(--space-3);background:var(--color-surface);
                border-radius:var(--radius-md);margin-top:var(--space-1)">
        <label class="toggle-switch" style="flex-shrink:0">
            <input type="checkbox" id="${method}-require_screenshot" ${checked ? 'checked' : ''}>
            <span class="toggle-slider"></span>
        </label>
        <div>
            <div style="font-size:var(--text-sm);font-weight:600">📸 Require payment screenshot</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">
                User must upload proof of transfer before completing checkout
            </div>
        </div>
    </div>`;
}

// ─── Card renderer ─────────────────────────────────────────────────────
function _renderMethodCard(s) {
    const d = (typeof s.details === 'string' ? JSON.parse(s.details) : s.details) || {};
    let detailsHtml = '';

    if ('instruction' in d) {
        detailsHtml = `
            <div class="form-group" style="margin:0">
                <label class="form-label">Instruction Text</label>
                <textarea class="form-input" id="${s.method}-instruction" rows="3"
                          placeholder="Instructions shown to the user at checkout">${(d.instruction||'').replace(/</g,'&lt;')}</textarea>
            </div>`;
    } else if ('bank' in d || 'account_number' in d) {
        detailsHtml = `
            <div style="display:flex;flex-direction:column;gap:var(--space-3)">
                <div class="form-group" style="margin:0">
                    <label class="form-label">Bank Name</label>
                    <input type="text" class="form-input" id="${s.method}-bank" value="${d.bank || ''}" placeholder="e.g. BDO Unibank">
                </div>
                <div class="form-group" style="margin:0">
                    <label class="form-label">Account Number</label>
                    <input type="text" class="form-input" id="${s.method}-account_number" value="${d.account_number || ''}" placeholder="e.g. 1234-5678-90">
                </div>
                <div class="form-group" style="margin:0">
                    <label class="form-label">Account Name</label>
                    <input type="text" class="form-input" id="${s.method}-account_name" value="${d.account_name || ''}" placeholder="e.g. MugTuon Hub Corp.">
                </div>
                ${_screenshotToggleHtml(s.method, d.require_screenshot)}
            </div>`;
    } else {
        detailsHtml = `
            <div style="display:flex;flex-direction:column;gap:var(--space-3)">
                <div class="form-group" style="margin:0">
                    <label class="form-label">Account Number</label>
                    <input type="text" class="form-input" id="${s.method}-number" value="${d.number || ''}" placeholder="e.g. 0917-123-4567">
                </div>
                <div class="form-group" style="margin:0">
                    <label class="form-label">Account Name</label>
                    <input type="text" class="form-input" id="${s.method}-account_name" value="${d.account_name || ''}" placeholder="e.g. MugTuon Hub">
                </div>
                <div class="form-group" style="margin:0">
                    <label class="form-label">Note / Instruction</label>
                    <input type="text" class="form-input" id="${s.method}-note" value="${(d.note||'').replace(/"/g,'&quot;')}"
                           placeholder="e.g. Add your full name in the note field">
                </div>
                ${_screenshotToggleHtml(s.method, d.require_screenshot)}
            </div>`;
    }

    const labelEsc = s.label.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return `
    <div class="dashboard-card" id="card-${s.method}" style="opacity:${s.is_enabled ? 1 : 0.6}">
        <div class="dashboard-card__header">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
                <span style="font-size:24px">${s.icon}</span>
                <h3 class="dashboard-card__title">${s.label}</h3>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-3)">
                <label class="toggle-switch" title="${s.is_enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}">
                    <input type="checkbox" id="${s.method}-enabled" ${s.is_enabled ? 'checked' : ''}
                           onchange="togglePaymentMethod('${s.method}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
                <button class="btn btn--ghost btn--sm btn--icon" title="Delete method"
                        style="color:var(--color-error)"
                        onclick="deletePaymentMethod('${s.method}','${labelEsc}')">🗑</button>
            </div>
        </div>
        <div class="dashboard-card__body" style="display:flex;flex-direction:column;gap:var(--space-5)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
                <div class="form-group" style="margin:0">
                    <label class="form-label">Display Label</label>
                    <input type="text" class="form-input" id="${s.method}-label" value="${s.label}">
                </div>
                <div class="form-group" style="margin:0">
                    <label class="form-label">Icon (emoji)</label>
                    <input type="text" class="form-input" id="${s.method}-icon" value="${s.icon}" maxlength="4"
                           style="font-size:var(--text-xl);text-align:center">
                </div>
            </div>

            ${detailsHtml}

            <div style="display:flex;justify-content:flex-end">
                <button class="btn btn--accent btn--sm" onclick="savePaymentMethod('${s.method}')">
                    💾 Save Changes
                </button>
            </div>
        </div>
    </div>`;
}

// ─── Icon picker ───────────────────────────────────────────────────────
function toggleIconPicker(e) {
    e.stopPropagation();
    const dd = document.getElementById('icon-picker-dropdown');
    if (!dd) return;
    const willOpen = dd.style.display === 'none';
    dd.style.display = willOpen ? 'block' : 'none';
    if (willOpen) {
        const closeOnOutside = (ev) => {
            const wrap = document.getElementById('icon-picker-wrap');
            if (!wrap || !wrap.contains(ev.target)) {
                const d = document.getElementById('icon-picker-dropdown');
                if (d) d.style.display = 'none';
                document.removeEventListener('click', closeOnOutside);
            }
        };
        document.addEventListener('click', closeOnOutside);
    }
}

function selectPaymentIcon(emoji) {
    const preview = document.getElementById('icon-picker-preview');
    const input   = document.getElementById('new-pm-icon');
    if (preview) preview.textContent = emoji;
    if (input)   input.value = emoji;
    const dd = document.getElementById('icon-picker-dropdown');
    if (dd) dd.style.display = 'none';
}

// ─── Modal helpers ─────────────────────────────────────────────────────
function openAddPaymentMethodModal() {
    const modal = document.getElementById('add-pm-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAddPaymentMethodModal() {
    const modal = document.getElementById('add-pm-modal');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('add-pm-form');
    if (form) form.reset();
    // Reset icon picker display
    const preview = document.getElementById('icon-picker-preview');
    if (preview) preview.textContent = '💳';
    const input = document.getElementById('new-pm-icon');
    if (input) input.value = '💳';
    const dd = document.getElementById('icon-picker-dropdown');
    if (dd) dd.style.display = 'none';
    toggleNewPmFields();
}

function toggleNewPmFields() {
    const type        = document.getElementById('new-pm-type')?.value;
    const acctFields  = document.getElementById('new-pm-account-fields');
    const instrFields = document.getElementById('new-pm-instruction-fields');
    if (!acctFields || !instrFields) return;
    if (type === 'instruction') {
        acctFields.style.display  = 'none';
        instrFields.style.display = 'flex';
    } else {
        acctFields.style.display  = 'flex';
        instrFields.style.display = 'none';
    }
}

// ─── Submit new method ─────────────────────────────────────────────────
async function submitAddPaymentMethod(e) {
    e.preventDefault();
    const label = document.getElementById('new-pm-label')?.value.trim();
    const icon  = document.getElementById('new-pm-icon')?.value || '💳';
    const type  = document.getElementById('new-pm-type')?.value;

    if (!label) { Helpers.showToast('Error', 'Label is required.', 'error'); return; }

    let details = {};
    if (type === 'account') {
        details = {
            number:             document.getElementById('new-pm-number')?.value.trim() || '',
            account_name:       document.getElementById('new-pm-account_name')?.value.trim() || '',
            note:               document.getElementById('new-pm-note')?.value.trim() || '',
            require_screenshot: document.getElementById('new-pm-require_screenshot')?.checked || false,
        };
    } else {
        details = { instruction: document.getElementById('new-pm-instruction')?.value.trim() || '' };
    }

    try {
        const created = await API.post('/admin/payment-settings', { label, icon, method_type: type, details });
        _paymentSettings.push(created);
        const app = document.getElementById('app');
        _renderPaymentSettingsLayout(app);
        Helpers.showToast('Created!', `"${label}" payment method added.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ─── Delete method ─────────────────────────────────────────────────────
async function deletePaymentMethod(method, label) {
    if (!await Helpers.confirmAction('Delete Payment Method?', `Delete the "${label}" payment method? This cannot be undone.`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/payment-settings/${method}`);
        _paymentSettings = _paymentSettings.filter(x => x.method !== method);
        const app = document.getElementById('app');
        _renderPaymentSettingsLayout(app);
        Helpers.showToast('Deleted', `"${label}" has been removed.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ─── Toggle enabled ────────────────────────────────────────────────────
async function togglePaymentMethod(method, isEnabled) {
    const s = _paymentSettings.find(x => x.method === method);
    if (!s) return;
    try {
        const saved = await API.put(`/admin/payment-settings/${method}`, { ...s, is_enabled: isEnabled });
        s.is_enabled = saved.is_enabled;
        const card = document.getElementById(`card-${method}`);
        if (card) card.style.opacity = isEnabled ? '1' : '0.6';
        Helpers.showToast(isEnabled ? 'Enabled' : 'Disabled',
            `${s.label} is now ${isEnabled ? 'visible' : 'hidden'} at checkout.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ─── Save changes ──────────────────────────────────────────────────────
async function savePaymentMethod(method) {
    const s = _paymentSettings.find(x => x.method === method);
    if (!s) return;

    const label   = document.getElementById(`${method}-label`)?.value.trim() || s.label;
    const icon    = document.getElementById(`${method}-icon`)?.value.trim()  || s.icon;
    const enabled = document.getElementById(`${method}-enabled`)?.checked ?? s.is_enabled;

    const d = (typeof s.details === 'string' ? JSON.parse(s.details) : s.details) || {};
    let details = {};
    if ('instruction' in d) {
        details = { instruction: document.getElementById(`${method}-instruction`)?.value.trim() || '' };
    } else if ('bank' in d || 'account_number' in d) {
        details = {
            bank:               document.getElementById(`${method}-bank`)?.value.trim() || '',
            account_number:     document.getElementById(`${method}-account_number`)?.value.trim() || '',
            account_name:       document.getElementById(`${method}-account_name`)?.value.trim() || '',
            require_screenshot: document.getElementById(`${method}-require_screenshot`)?.checked || false,
        };
    } else {
        details = {
            number:             document.getElementById(`${method}-number`)?.value.trim() || '',
            account_name:       document.getElementById(`${method}-account_name`)?.value.trim() || '',
            note:               document.getElementById(`${method}-note`)?.value.trim() || '',
            require_screenshot: document.getElementById(`${method}-require_screenshot`)?.checked || false,
        };
    }

    try {
        const saved = await API.put(`/admin/payment-settings/${method}`, {
            label, icon, is_enabled: enabled, details
        });
        Object.assign(s, saved);
        Helpers.showToast('Saved!', `${label} settings updated.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}


// ── js/pages/admin/admin-contact.js ──
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


// ── js/pages/admin/admin-achievements.js ──
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


// ── js/pages/admin/admin-announcements.js ──
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


// ── js/pages/admin/admin-audit.js ──
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


// ── js/pages/admin/admin-site-settings.js ──
function renderAdminSiteSettingsPage(app) {
    const content = `
        <div style="display:grid;grid-template-columns:280px 1fr;gap:var(--space-8);max-width:960px">

            <!-- Sidebar nav -->
            <div>
                <div id="settings-nav" style="position:sticky;top:var(--space-6)">
                    <div style="font-size:var(--text-xs);font-weight:var(--weight-semibold);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted);margin-bottom:var(--space-3)">Settings</div>
                    <a href="#section-contact" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:var(--color-accent);color:white;font-weight:var(--weight-medium);font-size:var(--text-sm);text-decoration:none;margin-bottom:var(--space-2)">
                        📍 Contact Information
                    </a>
                    <a href="#section-business" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);color:var(--color-text-secondary);font-size:var(--text-sm);text-decoration:none;margin-bottom:var(--space-2);transition:background .15s"
                       onmouseover="this.style.background='var(--color-surface)'" onmouseout="this.style.background='none'">
                        🏢 Business Info
                    </a>
                </div>
            </div>

            <!-- Settings panels -->
            <div>
                <!-- Contact Information -->
                <div id="section-contact" class="card" style="padding:var(--space-8)">
                    <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-warm-lighter);display:flex;align-items:center;justify-content:center;font-size:18px">📍</div>
                        <div>
                            <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold);margin:0">Contact Information</h3>
                            <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin:0">Shown on the public Contact page</p>
                        </div>
                    </div>
                    <hr style="border:none;border-top:1px solid var(--color-border);margin:var(--space-5) 0 var(--space-6)">

                    <form onsubmit="saveSiteSettings(event)">
                        <div class="form-group" style="margin-bottom:var(--space-5)">
                            <label class="form-label" style="font-weight:var(--weight-medium)">Address</label>
                            <textarea class="form-input" id="setting-address" rows="2" placeholder="Full business address" style="resize:vertical"></textarea>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);margin-bottom:var(--space-5)">
                            <div class="form-group" style="margin:0">
                                <label class="form-label" style="font-weight:var(--weight-medium)">Email</label>
                                <input type="email" class="form-input" id="setting-email" placeholder="contact@example.com">
                            </div>
                            <div class="form-group" style="margin:0">
                                <label class="form-label" style="font-weight:var(--weight-medium)">Phone</label>
                                <input type="text" class="form-input" id="setting-phone" placeholder="+63 XXX XXX XXXX">
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom:var(--space-6)">
                            <label class="form-label" style="font-weight:var(--weight-medium)">Operating Hours</label>
                            <input type="text" class="form-input" id="setting-hours" placeholder="e.g. Open Daily: 10 AM - 4 AM">
                        </div>

                        <hr style="border:none;border-top:1px solid var(--color-border);margin:0 0 var(--space-5)">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <span id="save-status" style="font-size:var(--text-sm);color:var(--color-text-muted)"></span>
                            <button type="submit" id="saveSettingsBtn" class="btn btn--accent">Save Changes</button>
                        </div>
                    </form>
                </div>

                <!-- Business Info -->
                <div id="section-business" class="card" style="padding:var(--space-8);margin-top:var(--space-6)">
                    <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-warm-lighter);display:flex;align-items:center;justify-content:center;font-size:18px">🏢</div>
                        <div>
                            <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold);margin:0">Business Info</h3>
                            <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin:0">General business details</p>
                        </div>
                    </div>
                    <hr style="border:none;border-top:1px solid var(--color-border);margin:var(--space-5) 0 var(--space-6)">

                    <form onsubmit="saveBusinessSettings(event)">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);margin-bottom:var(--space-5)">
                            <div class="form-group" style="margin:0">
                                <label class="form-label" style="font-weight:var(--weight-medium)">Business Name</label>
                                <input type="text" class="form-input" id="setting-biz-name" placeholder="MugTuon Learning Hub & Cafe">
                            </div>
                            <div class="form-group" style="margin:0">
                                <label class="form-label" style="font-weight:var(--weight-medium)">Tagline</label>
                                <input type="text" class="form-input" id="setting-biz-tagline" placeholder="Where coffee meets productivity">
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom:var(--space-6)">
                            <label class="form-label" style="font-weight:var(--weight-medium)">About (short description)</label>
                            <textarea class="form-input" id="setting-biz-about" rows="3" placeholder="Brief description of your business" style="resize:vertical"></textarea>
                        </div>

                        <hr style="border:none;border-top:1px solid var(--color-border);margin:0 0 var(--space-5)">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <span id="save-biz-status" style="font-size:var(--text-sm);color:var(--color-text-muted)"></span>
                            <button type="submit" id="saveBizBtn" class="btn btn--accent">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;

    app.innerHTML = renderAppLayout(content, 'Site Settings', 'Manage contact information and business details');

    (async () => {
        try {
            const s = await API.get('/admin/site-settings');
            if (s.contact_address) document.getElementById('setting-address').value = s.contact_address;
            if (s.contact_email)   document.getElementById('setting-email').value = s.contact_email;
            if (s.contact_phone)   document.getElementById('setting-phone').value = s.contact_phone;
            if (s.contact_hours)   document.getElementById('setting-hours').value = s.contact_hours;
            if (s.business_name)    document.getElementById('setting-biz-name').value = s.business_name;
            if (s.business_tagline) document.getElementById('setting-biz-tagline').value = s.business_tagline;
            if (s.business_about)   document.getElementById('setting-biz-about').value = s.business_about;
        } catch(e) {}
    })();
}

async function saveSiteSettings(e) {
    e.preventDefault();
    const btn = document.getElementById('saveSettingsBtn');
    const status = document.getElementById('save-status');
    btn.textContent = 'Saving...'; btn.disabled = true;
    try {
        await API.put('/admin/site-settings', {
            contact_address: document.getElementById('setting-address').value.trim(),
            contact_email:   document.getElementById('setting-email').value.trim(),
            contact_phone:   document.getElementById('setting-phone').value.trim(),
            contact_hours:   document.getElementById('setting-hours').value.trim(),
        });
        Helpers.showToast('Saved', 'Contact information updated.', 'success');
        status.textContent = 'Last saved ' + new Date().toLocaleTimeString();
        status.style.color = 'var(--color-success)';
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    } finally {
        btn.textContent = 'Save Changes'; btn.disabled = false;
    }
}

async function saveBusinessSettings(e) {
    e.preventDefault();
    const btn = document.getElementById('saveBizBtn');
    const status = document.getElementById('save-biz-status');
    btn.textContent = 'Saving...'; btn.disabled = true;
    try {
        await API.put('/admin/site-settings', {
            business_name:    document.getElementById('setting-biz-name').value.trim(),
            business_tagline: document.getElementById('setting-biz-tagline').value.trim(),
            business_about:   document.getElementById('setting-biz-about').value.trim(),
        });
        Helpers.showToast('Saved', 'Business info updated.', 'success');
        status.textContent = 'Last saved ' + new Date().toLocaleTimeString();
        status.style.color = 'var(--color-success)';
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    } finally {
        btn.textContent = 'Save Changes'; btn.disabled = false;
    }
}


// ── js/pages/404.js ──
function render404Page(app) {
    app.innerHTML = `
    <div class="auth-page">
        <div class="auth-page__visual">
            <div class="auth-page__visual-content">
                <div style="font-size:64px;margin-bottom:var(--space-6)">🔍</div>
                <h2 class="auth-page__visual-title">Lost in the Hub?</h2>
                <p class="auth-page__visual-desc">The page you're looking for doesn't exist or may have moved.</p>
            </div>
        </div>

        <div class="auth-page__form-side">
            <div class="auth-form">
                <div class="auth-form__header">
                    <a href="/" data-link class="header__logo" style="margin-bottom:var(--space-6)">
                        <img src="images/logo-icon.png" alt="MugTuon" style="width:36px;height:36px;border-radius:50%">
                        <span>MugTuon</span>
                    </a>
                    <h1 class="auth-form__title" style="font-size:72px;color:var(--color-primary);margin-bottom:var(--space-2)">404</h1>
                    <h2 style="font-size:var(--text-xl);margin-bottom:var(--space-3)">Page Not Found</h2>
                    <p class="auth-form__subtitle">The page you requested doesn't exist. It may have been moved or deleted.</p>
                </div>

                <div style="display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-6)">
                    <a href="/" data-link class="btn btn--accent btn--lg btn--full">Go to Home</a>
                    <a href="/contact" data-link class="btn btn--outline btn--lg btn--full">Contact Support</a>
                </div>

                <div class="auth-form__footer">
                    <a href="/login" data-link>Sign in</a> &nbsp;·&nbsp; <a href="/register" data-link>Create account</a>
                </div>
            </div>
        </div>
    </div>`;
}


// ── js/app.js ──
/* ═══════════════════════════════════════════════
   MugTuon Learning Hub & Cafe — App Bootstrap
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Register all routes ──
    Router.register('/', renderHomePage);
    Router.register('/spaces', renderSpacesPage);
    Router.register('/about', renderAboutPage);
    Router.register('/pricing', renderPricingPage);
    Router.register('/contact', renderContactPage);
    Router.register('/login', renderLoginPage);
    Router.register('/forgot-password', renderForgotPasswordPage);
    Router.register('/reset-password', renderResetPasswordPage);
    Router.register('/verify-email', renderVerifyEmailPage);
    Router.register('/register', renderRegisterPage);
    Router.register('/terms', renderTermsPage);
    Router.register('/privacy', renderPrivacyPage);
    Router.register('/checkout', renderCheckoutPage);

    // Authenticated routes
    Router.register('/dashboard', renderDashboardPage);
    Router.register('/profile', renderProfilePage);
    Router.register('/subscription', renderSubscriptionPage);
    Router.register('/bookings', renderBookingsPage);
    Router.register('/leaderboard', renderLeaderboardPage);
    Router.register('/achievements', renderAchievementsPage);
    Router.register('/analytics', renderAnalyticsPage);

    // Admin routes
    Router.register('/admin', renderAdminDashboardPage);
    Router.register('/admin/users', renderAdminUsersPage);
    Router.register('/admin/bookings', renderAdminBookingsPage);
    Router.register('/admin/analytics', renderAdminAnalyticsPage);
    Router.register('/admin/payments', renderAdminPaymentsPage);
    Router.register('/admin/spaces', renderAdminSpacesPage);
    Router.register('/admin/plans', renderAdminPlansPage);
    Router.register('/admin/payment-settings', renderAdminPaymentSettingsPage);
    Router.register('/admin/contact', renderAdminContactPage);
    Router.register('/admin/achievements', renderAdminAchievementsPage);
    Router.register('/admin/announcements', renderAdminAnnouncementsPage);
    Router.register('/admin/audit', renderAdminAuditPage);
    Router.register('/admin/site-settings', renderAdminSiteSettingsPage);

    // ── Start router ──
    Router.init();

    console.log('%c☕ MugTuon Learning Hub & Cafe', 'font-size:16px;font-weight:bold;color:#543020');
    console.log('%cPlatform ready.', 'color:#367267');
})();


