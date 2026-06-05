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

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
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
