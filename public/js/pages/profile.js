async function renderProfilePage(app) {
    const user = Store.get('user');
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading profile...</div>`,
        'My Profile', 'Manage your account and view your stats'
    );

    let stats = { total_sessions:0, total_minutes:0, xp: user.xp||0, streak_days: user.streak_days||0, badge_count:0, total_bookings:0 };
    let profile = user;
    try {
        [profile, stats] = await Promise.all([
            API.get('/users/profile').catch(() => user),
            API.get('/users/stats').catch(() => stats),
        ]);
    } catch(e) {}

    const xp    = stats.xp || profile.xp || 0;
    const level = Helpers.getLevel(xp);
    const xpInLevel  = xp % 1000;
    const xpForNext  = 1000;
    const totalHours = Math.floor((stats.total_minutes||0)/60);
    const memberSince = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-PH',{month:'long',year:'numeric'})
        : 'Unknown';

    const levelTitles = ['','Beginner','Scholar','Achiever','Expert','Master','Legend'];
    const levelTitle  = levelTitles[Math.min(level, levelTitles.length-1)] || 'Legend';

    const isVerified = profile.is_verified !== false;
    const verifyBanner = !isVerified ? `
        <div style="background:rgba(255,180,0,.1);border:1px solid var(--color-warning);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-6);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-3)">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
                <span style="font-size:20px">⚠️</span>
                <div>
                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Email not verified</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Check your inbox for the verification link.</div>
                </div>
            </div>
            <button class="btn btn--outline btn--sm" onclick="resendVerificationEmail()">Resend Email</button>
        </div>` : '';

    const content = `
        ${verifyBanner}
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:var(--space-6)">
            <div class="dashboard-card">
                <div class="dashboard-card__body" style="text-align:center">
                    <div style="position:relative;display:inline-block;margin-bottom:var(--space-4);cursor:pointer" onclick="document.getElementById('avatarInput').click()" title="Click to change photo">
                        ${profile.avatar_url
                            ? `<img src="${profile.avatar_url}" alt="Avatar" style="width:80px;height:80px;border-radius:50%;object-fit:cover">`
                            : `<div class="avatar avatar--xl">${Helpers.getInitials(profile.first_name, profile.last_name)}</div>`}
                        <div style="position:absolute;bottom:0;right:0;width:26px;height:26px;background:var(--color-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid white">📷</div>
                    </div>
                    <input type="file" id="avatarInput" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="handleAvatarUpload(this)">
                    <h3 style="margin-bottom:var(--space-1)">${profile.first_name} ${profile.last_name}</h3>
                    <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">${profile.email}</p>
                    <span class="badge badge--accent" style="margin-bottom:var(--space-6)">${profile.role}</span>
                    <hr class="divider">
                    <div style="display:flex;flex-direction:column;gap:var(--space-4);text-align:left">
                        <div>
                            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Level ${level} — ${levelTitle}</div>
                            <div style="font-weight:var(--weight-semibold)">${xp.toLocaleString()} XP</div>
                            <div class="progress" style="margin-top:var(--space-2)">
                                <div class="progress__bar" style="width:${Math.round((xpInLevel/xpForNext)*100)}%"></div>
                            </div>
                            <div style="font-size:11px;color:var(--color-text-muted);margin-top:var(--space-1)">${xpInLevel} / ${xpForNext} XP to next level</div>
                        </div>
                        <div>
                            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Member Since</div>
                            <div style="font-weight:var(--weight-medium);font-size:var(--text-sm)">${memberSince}</div>
                        </div>
                        <div>
                            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Study Streak</div>
                            <div style="font-weight:var(--weight-medium);font-size:var(--text-sm)">🔥 ${profile.streak_days||stats.streak_days||0} days</div>
                        </div>
                        ${profile.university ? `<div>
                            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">University</div>
                            <div style="font-weight:var(--weight-medium);font-size:var(--text-sm)">${profile.university}</div>
                        </div>` : ''}
                    </div>
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Profile Settings</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <form onsubmit="handleProfileUpdate(event)">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                                <div class="form-group">
                                    <label class="form-label">First Name</label>
                                    <input type="text" class="form-input" value="${profile.first_name||''}" id="profileFirstName" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Last Name</label>
                                    <input type="text" class="form-input" value="${profile.last_name||''}" id="profileLastName" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-input" value="${profile.email||''}" disabled>
                                <div class="form-hint">Email cannot be changed</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">University / School</label>
                                <input type="text" class="form-input" value="${profile.university||''}" id="profileUniversity" placeholder="Your university">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Course / Program</label>
                                <input type="text" class="form-input" value="${profile.course||''}" id="profileCourse" placeholder="e.g. BS Computer Science">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Bio</label>
                                <textarea class="form-input" rows="3" id="profileBio" placeholder="Tell us about yourself...">${profile.bio||''}</textarea>
                            </div>
                            <div id="profileError" class="form-error" style="display:none;margin-bottom:var(--space-4)"></div>
                            <button type="submit" class="btn btn--accent" id="profileSaveBtn">Save Changes</button>
                        </form>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Change Password</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <form onsubmit="handlePasswordChange(event)">
                            <div class="form-group">
                                <label class="form-label">Current Password</label>
                                <input type="password" class="form-input" id="currentPassword" required>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                                <div class="form-group">
                                    <label class="form-label">New Password</label>
                                    <input type="password" class="form-input" id="newPassword" required minlength="8">
                                    <div id="profilePwStrength"></div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Confirm New Password</label>
                                    <input type="password" class="form-input" id="confirmPassword" required minlength="8">
                                </div>
                            </div>
                            <div id="passwordError" class="form-error" style="display:none;margin-bottom:var(--space-4)"></div>
                            <button type="submit" class="btn btn--outline" id="passwordSaveBtn">Update Password</button>
                        </form>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Email Preferences</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
                                <div>
                                    <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">Booking confirmations</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Receive email when a booking is confirmed or cancelled</div>
                                </div>
                                <input type="checkbox" id="prefBooking" ${profile.email_booking !== false ? 'checked' : ''} onchange="saveEmailPrefs()" style="accent-color:var(--color-accent);width:18px;height:18px">
                            </label>
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
                                <div>
                                    <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">Booking reminders</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Day-before reminders for upcoming bookings</div>
                                </div>
                                <input type="checkbox" id="prefReminder" ${profile.email_reminder !== false ? 'checked' : ''} onchange="saveEmailPrefs()" style="accent-color:var(--color-accent);width:18px;height:18px">
                            </label>
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
                                <div>
                                    <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">Renewal reminders</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Get notified before your subscription expires</div>
                                </div>
                                <input type="checkbox" id="prefRenewal" ${profile.email_renewal !== false ? 'checked' : ''} onchange="saveEmailPrefs()" style="accent-color:var(--color-accent);width:18px;height:18px">
                            </label>
                        </div>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Lifetime Stats</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-6);text-align:center">
                            <div class="stat"><div class="stat__value">${totalHours}</div><div class="stat__label">Total Hours</div></div>
                            <div class="stat"><div class="stat__value">${stats.total_sessions||0}</div><div class="stat__label">Sessions</div></div>
                            <div class="stat"><div class="stat__value">${stats.badge_count||0}</div><div class="stat__label">Badges</div></div>
                            <div class="stat"><div class="stat__value">${stats.total_bookings||0}</div><div class="stat__label">Bookings</div></div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Your Data</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-4)">Download a copy of all your data including your profile, bookings, study sessions, achievements, and payment history.</p>
                        <button class="btn btn--outline btn--sm" onclick="exportMyData()">Download My Data</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'My Profile', 'Manage your account and view your stats');
    Helpers.renderPasswordStrength('newPassword', 'profilePwStrength');
}

async function resendVerificationEmail() {
    try {
        await API.post('/auth/resend-verification');
        Helpers.showToast('Email Sent', 'Verification email resent. Check your inbox.', 'success');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function handleAvatarUpload(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
        Helpers.showToast('Error', 'Image must be under 2MB', 'error');
        return;
    }
    try {
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read image'));
            reader.readAsDataURL(file);
        });
        await API.put('/users/avatar', { avatar: base64 });
        Helpers.showToast('Avatar Updated', 'Your profile photo has been changed.', 'success');
        Router.navigate('/profile');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const btn = document.getElementById('passwordSaveBtn');
    const errEl = document.getElementById('passwordError');
    errEl.style.display = 'none';

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        errEl.textContent = 'New passwords do not match';
        errEl.style.display = 'block';
        return;
    }
    const strength = Helpers.getPasswordStrength(newPassword);
    if (strength.score < 3) {
        errEl.textContent = 'Password needs at least 8 characters with uppercase, lowercase, and a number';
        errEl.style.display = 'block';
        return;
    }

    btn.textContent = 'Updating...'; btn.disabled = true;
    try {
        await API.put('/users/password', { currentPassword, newPassword });
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        Helpers.showToast('Password Updated', 'Your password has been changed. Other sessions have been signed out.', 'success');
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.textContent = 'Update Password'; btn.disabled = false;
    }
}

async function saveEmailPrefs() {
    try {
        await API.put('/users/email-preferences', {
            email_booking: document.getElementById('prefBooking')?.checked !== false,
            email_reminder: document.getElementById('prefReminder')?.checked !== false,
            email_renewal: document.getElementById('prefRenewal')?.checked !== false,
        });
        Helpers.showToast('Saved', 'Email preferences updated.', 'success');
    } catch(e) {
        Helpers.showToast('Error', e.message, 'error');
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const btn  = document.getElementById('profileSaveBtn');
    const errEl = document.getElementById('profileError');
    errEl.style.display = 'none';
    btn.textContent = 'Saving...'; btn.disabled = true;

    try {
        const updated = await API.put('/users/profile', {
            firstName:  document.getElementById('profileFirstName').value,
            lastName:   document.getElementById('profileLastName').value,
            university: document.getElementById('profileUniversity').value,
            course:     document.getElementById('profileCourse').value,
            bio:        document.getElementById('profileBio').value,
            phone:      Store.get('user')?.phone || null,
        });

        // Update stored user
        const user = Store.get('user');
        Object.assign(user, {
            first_name: updated.first_name,
            last_name:  updated.last_name,
            university: updated.university,
            course:     updated.course,
            bio:        updated.bio,
        });
        Store.set('user', user);
        localStorage.setItem('mugtuon_user', JSON.stringify(user));
        Helpers.showToast('Profile Updated', 'Your changes have been saved.', 'success');
    } catch(err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.textContent = 'Save Changes'; btn.disabled = false;
    }
}

async function exportMyData() {
    try {
        Helpers.showToast('Exporting', 'Preparing your data...', 'info');
        const data = await API.get('/users/export');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mugtuon-my-data.json';
        a.click();
        URL.revokeObjectURL(url);
        Helpers.showToast('Downloaded', 'Your data has been exported.', 'success');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}
