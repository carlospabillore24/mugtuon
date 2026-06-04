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
