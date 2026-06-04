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

