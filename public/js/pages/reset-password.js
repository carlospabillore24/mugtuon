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
