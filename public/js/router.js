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
