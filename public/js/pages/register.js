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
