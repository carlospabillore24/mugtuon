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
