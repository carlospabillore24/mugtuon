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
