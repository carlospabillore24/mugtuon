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
