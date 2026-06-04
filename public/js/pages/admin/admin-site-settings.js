function renderAdminSiteSettingsPage(app) {
    const content = `
        <div style="display:grid;grid-template-columns:280px 1fr;gap:var(--space-8);max-width:960px">

            <!-- Sidebar nav -->
            <div>
                <div id="settings-nav" style="position:sticky;top:var(--space-6)">
                    <div style="font-size:var(--text-xs);font-weight:var(--weight-semibold);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted);margin-bottom:var(--space-3)">Settings</div>
                    <a href="#section-contact" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);background:var(--color-accent);color:white;font-weight:var(--weight-medium);font-size:var(--text-sm);text-decoration:none;margin-bottom:var(--space-2)">
                        📍 Contact Information
                    </a>
                    <a href="#section-business" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);color:var(--color-text-secondary);font-size:var(--text-sm);text-decoration:none;margin-bottom:var(--space-2);transition:background .15s"
                       onmouseover="this.style.background='var(--color-surface)'" onmouseout="this.style.background='none'">
                        🏢 Business Info
                    </a>
                </div>
            </div>

            <!-- Settings panels -->
            <div>
                <!-- Contact Information -->
                <div id="section-contact" class="card" style="padding:var(--space-8)">
                    <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-warm-lighter);display:flex;align-items:center;justify-content:center;font-size:18px">📍</div>
                        <div>
                            <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold);margin:0">Contact Information</h3>
                            <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin:0">Shown on the public Contact page</p>
                        </div>
                    </div>
                    <hr style="border:none;border-top:1px solid var(--color-border);margin:var(--space-5) 0 var(--space-6)">

                    <form onsubmit="saveSiteSettings(event)">
                        <div class="form-group" style="margin-bottom:var(--space-5)">
                            <label class="form-label" style="font-weight:var(--weight-medium)">Address</label>
                            <textarea class="form-input" id="setting-address" rows="2" placeholder="Full business address" style="resize:vertical"></textarea>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);margin-bottom:var(--space-5)">
                            <div class="form-group" style="margin:0">
                                <label class="form-label" style="font-weight:var(--weight-medium)">Email</label>
                                <input type="email" class="form-input" id="setting-email" placeholder="contact@example.com">
                            </div>
                            <div class="form-group" style="margin:0">
                                <label class="form-label" style="font-weight:var(--weight-medium)">Phone</label>
                                <input type="text" class="form-input" id="setting-phone" placeholder="+63 XXX XXX XXXX">
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom:var(--space-6)">
                            <label class="form-label" style="font-weight:var(--weight-medium)">Operating Hours</label>
                            <input type="text" class="form-input" id="setting-hours" placeholder="e.g. Open Daily: 10 AM - 4 AM">
                        </div>

                        <hr style="border:none;border-top:1px solid var(--color-border);margin:0 0 var(--space-5)">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <span id="save-status" style="font-size:var(--text-sm);color:var(--color-text-muted)"></span>
                            <button type="submit" id="saveSettingsBtn" class="btn btn--accent">Save Changes</button>
                        </div>
                    </form>
                </div>

                <!-- Business Info -->
                <div id="section-business" class="card" style="padding:var(--space-8);margin-top:var(--space-6)">
                    <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-warm-lighter);display:flex;align-items:center;justify-content:center;font-size:18px">🏢</div>
                        <div>
                            <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold);margin:0">Business Info</h3>
                            <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin:0">General business details</p>
                        </div>
                    </div>
                    <hr style="border:none;border-top:1px solid var(--color-border);margin:var(--space-5) 0 var(--space-6)">

                    <form onsubmit="saveBusinessSettings(event)">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);margin-bottom:var(--space-5)">
                            <div class="form-group" style="margin:0">
                                <label class="form-label" style="font-weight:var(--weight-medium)">Business Name</label>
                                <input type="text" class="form-input" id="setting-biz-name" placeholder="MugTuon Learning Hub & Cafe">
                            </div>
                            <div class="form-group" style="margin:0">
                                <label class="form-label" style="font-weight:var(--weight-medium)">Tagline</label>
                                <input type="text" class="form-input" id="setting-biz-tagline" placeholder="Where coffee meets productivity">
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom:var(--space-6)">
                            <label class="form-label" style="font-weight:var(--weight-medium)">About (short description)</label>
                            <textarea class="form-input" id="setting-biz-about" rows="3" placeholder="Brief description of your business" style="resize:vertical"></textarea>
                        </div>

                        <hr style="border:none;border-top:1px solid var(--color-border);margin:0 0 var(--space-5)">
                        <div style="display:flex;align-items:center;justify-content:space-between">
                            <span id="save-biz-status" style="font-size:var(--text-sm);color:var(--color-text-muted)"></span>
                            <button type="submit" id="saveBizBtn" class="btn btn--accent">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;

    app.innerHTML = renderAppLayout(content, 'Site Settings', 'Manage contact information and business details');

    (async () => {
        try {
            const s = await API.get('/admin/site-settings');
            if (s.contact_address) document.getElementById('setting-address').value = s.contact_address;
            if (s.contact_email)   document.getElementById('setting-email').value = s.contact_email;
            if (s.contact_phone)   document.getElementById('setting-phone').value = s.contact_phone;
            if (s.contact_hours)   document.getElementById('setting-hours').value = s.contact_hours;
            if (s.business_name)    document.getElementById('setting-biz-name').value = s.business_name;
            if (s.business_tagline) document.getElementById('setting-biz-tagline').value = s.business_tagline;
            if (s.business_about)   document.getElementById('setting-biz-about').value = s.business_about;
        } catch(e) {}
    })();
}

async function saveSiteSettings(e) {
    e.preventDefault();
    const btn = document.getElementById('saveSettingsBtn');
    const status = document.getElementById('save-status');
    btn.textContent = 'Saving...'; btn.disabled = true;
    try {
        await API.put('/admin/site-settings', {
            contact_address: document.getElementById('setting-address').value.trim(),
            contact_email:   document.getElementById('setting-email').value.trim(),
            contact_phone:   document.getElementById('setting-phone').value.trim(),
            contact_hours:   document.getElementById('setting-hours').value.trim(),
        });
        Helpers.showToast('Saved', 'Contact information updated.', 'success');
        status.textContent = 'Last saved ' + new Date().toLocaleTimeString();
        status.style.color = 'var(--color-success)';
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    } finally {
        btn.textContent = 'Save Changes'; btn.disabled = false;
    }
}

async function saveBusinessSettings(e) {
    e.preventDefault();
    const btn = document.getElementById('saveBizBtn');
    const status = document.getElementById('save-biz-status');
    btn.textContent = 'Saving...'; btn.disabled = true;
    try {
        await API.put('/admin/site-settings', {
            business_name:    document.getElementById('setting-biz-name').value.trim(),
            business_tagline: document.getElementById('setting-biz-tagline').value.trim(),
            business_about:   document.getElementById('setting-biz-about').value.trim(),
        });
        Helpers.showToast('Saved', 'Business info updated.', 'success');
        status.textContent = 'Last saved ' + new Date().toLocaleTimeString();
        status.style.color = 'var(--color-success)';
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    } finally {
        btn.textContent = 'Save Changes'; btn.disabled = false;
    }
}
