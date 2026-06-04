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
