let _paymentSettings = [];

// ─── Payment icon palette ──────────────────────────────────────────────
const _PM_ICONS = [
    ['💳','Card / Credit'],['📱','Mobile / GCash'],['🏦','Bank'],['💵','Cash / Bills'],
    ['💰','Money Bag'],['💸','Wire Transfer'],['🏧','ATM'],['🪙','Coin'],
    ['📲','App Payment'],['🌐','Online / Web'],['⚡','Instant Pay'],['🔒','Secure Pay'],
    ['🤝','Agreement'],['🏪','Pay at Store'],['💎','Premium'],['✅','Verified'],
    ['🎁','Voucher / Gift'],['🧾','Receipt'],['🔑','Access / Key'],['💲','Dollar']
];

function _buildIconGrid() {
    return _PM_ICONS.map(([emoji, label]) =>
        `<button type="button" title="${label}" onclick="selectPaymentIcon('${emoji}')"
                 style="font-size:20px;padding:6px 4px;border:1px solid transparent;background:none;
                        cursor:pointer;border-radius:6px;line-height:1;transition:background .12s,border-color .12s"
                 onmouseover="this.style.background='var(--color-surface-hover,var(--color-surface))';this.style.borderColor='var(--color-border)'"
                 onmouseout="this.style.background='none';this.style.borderColor='transparent'">${emoji}</button>`
    ).join('');
}

// ─── Page entry point ──────────────────────────────────────────────────
async function renderAdminPaymentSettingsPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading payment settings...</div>`,
        'Payment Settings', 'Control payment methods and instructions shown at checkout'
    );
    try {
        _paymentSettings = await API.get('/admin/payment-settings');
    } catch(e) { _paymentSettings = []; }
    _renderPaymentSettingsLayout(app);
}

// ─── Layout ────────────────────────────────────────────────────────────
function _renderPaymentSettingsLayout(app) {
    const cards   = _paymentSettings.map(s => _renderMethodCard(s)).join('');
    const iconGrid = _buildIconGrid();

    const content = `
        <div style="margin-bottom:var(--space-6);display:flex;justify-content:space-between;align-items:center;gap:var(--space-4)">
            <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);
                        padding:var(--space-4);font-size:var(--text-sm);color:var(--color-text-secondary);flex:1">
                💡 Changes apply immediately to the checkout page. Disabling a method hides it from users.
            </div>
            <button class="btn btn--primary" onclick="openAddPaymentMethodModal()">＋ Add Method</button>
        </div>

        <div id="payment-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:var(--space-6)">
            ${cards || '<div style="color:var(--color-text-muted);padding:var(--space-8)">No payment methods found.</div>'}
        </div>

        <!-- ── Add Payment Method Modal ── -->
        <div id="add-pm-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center">
            <div style="background:var(--color-bg);border-radius:var(--radius-lg);padding:var(--space-8);
                        width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-xl)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
                    <h2 style="font-size:var(--text-xl);font-weight:700">Add Payment Method</h2>
                    <button class="btn btn--ghost btn--sm btn--icon" onclick="closeAddPaymentMethodModal()">✕</button>
                </div>

                <form id="add-pm-form" onsubmit="submitAddPaymentMethod(event)">
                    <div style="display:flex;flex-direction:column;gap:var(--space-4)">

                        <!-- Label + Icon picker row -->
                        <div style="display:grid;grid-template-columns:1fr auto;gap:var(--space-3);align-items:end">
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Label <span style="color:var(--color-error)">*</span></label>
                                <input type="text" class="form-input" id="new-pm-label" placeholder="e.g. PayMaya" required>
                            </div>
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Icon</label>
                                <!-- Custom icon picker -->
                                <div style="position:relative" id="icon-picker-wrap">
                                    <input type="hidden" id="new-pm-icon" value="💳">
                                    <button type="button" id="icon-picker-btn"
                                            onclick="toggleIconPicker(event)"
                                            style="width:72px;height:44px;font-size:22px;display:flex;align-items:center;
                                                   justify-content:center;background:var(--color-surface);
                                                   border:1px solid var(--color-border);border-radius:var(--radius-md);
                                                   cursor:pointer;gap:4px;transition:border-color .15s"
                                            onmouseover="this.style.borderColor='var(--color-primary)'"
                                            onmouseout="this.style.borderColor='var(--color-border)'">
                                        <span id="icon-picker-preview">💳</span>
                                        <span style="font-size:10px;color:var(--color-text-muted)">▾</span>
                                    </button>
                                    <!-- Dropdown grid -->
                                    <div id="icon-picker-dropdown"
                                         style="display:none;position:absolute;top:calc(100% + 6px);right:0;
                                                width:248px;background:var(--color-bg);
                                                border:1px solid var(--color-border);border-radius:var(--radius-md);
                                                box-shadow:var(--shadow-lg);padding:var(--space-3);z-index:300">
                                        <div style="font-size:var(--text-xs);color:var(--color-text-muted);
                                                    margin-bottom:var(--space-2);font-weight:500">
                                            Choose an icon
                                        </div>
                                        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:2px">
                                            ${iconGrid}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Type selector -->
                        <div class="form-group" style="margin:0">
                            <label class="form-label">Type</label>
                            <select class="form-input" id="new-pm-type" onchange="toggleNewPmFields()">
                                <option value="account">Account-based (number &amp; name)</option>
                                <option value="instruction">Instruction-based (text only)</option>
                            </select>
                        </div>

                        <!-- Account fields -->
                        <div id="new-pm-account-fields" style="display:flex;flex-direction:column;gap:var(--space-3)">
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Account Number</label>
                                <input type="text" class="form-input" id="new-pm-number" placeholder="e.g. 0917-123-4567">
                            </div>
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Account Name</label>
                                <input type="text" class="form-input" id="new-pm-account_name" placeholder="e.g. MugTuon Hub">
                            </div>
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Note (optional)</label>
                                <input type="text" class="form-input" id="new-pm-note" placeholder="e.g. Include your name in the remarks">
                            </div>
                            <div style="display:flex;align-items:center;gap:var(--space-3);
                                        padding:var(--space-3);background:var(--color-surface);border-radius:var(--radius-md)">
                                <label class="toggle-switch" style="flex-shrink:0">
                                    <input type="checkbox" id="new-pm-require_screenshot">
                                    <span class="toggle-slider"></span>
                                </label>
                                <div>
                                    <div style="font-size:var(--text-sm);font-weight:600">📸 Require payment screenshot</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">User must upload proof before checkout completes</div>
                                </div>
                            </div>
                        </div>

                        <!-- Instruction fields -->
                        <div id="new-pm-instruction-fields" style="display:none;flex-direction:column;gap:var(--space-3)">
                            <div class="form-group" style="margin:0">
                                <label class="form-label">Instruction Text</label>
                                <textarea class="form-input" id="new-pm-instruction" rows="3"
                                          placeholder="Instructions shown to the user at checkout"></textarea>
                            </div>
                        </div>

                        <div style="display:flex;justify-content:flex-end;gap:var(--space-3);padding-top:var(--space-2)">
                            <button type="button" class="btn btn--secondary" onclick="closeAddPaymentMethodModal()">Cancel</button>
                            <button type="submit" class="btn btn--primary">Add Method</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Payment Settings', 'Control payment methods and instructions shown at checkout');
}

// ─── Screenshot toggle helper ──────────────────────────────────────────
function _screenshotToggleHtml(method, checked) {
    return `
    <div style="display:flex;align-items:center;gap:var(--space-3);
                padding:var(--space-3);background:var(--color-surface);
                border-radius:var(--radius-md);margin-top:var(--space-1)">
        <label class="toggle-switch" style="flex-shrink:0">
            <input type="checkbox" id="${method}-require_screenshot" ${checked ? 'checked' : ''}>
            <span class="toggle-slider"></span>
        </label>
        <div>
            <div style="font-size:var(--text-sm);font-weight:600">📸 Require payment screenshot</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-muted)">
                User must upload proof of transfer before completing checkout
            </div>
        </div>
    </div>`;
}

// ─── Card renderer ─────────────────────────────────────────────────────
function _renderMethodCard(s) {
    const d = (typeof s.details === 'string' ? JSON.parse(s.details) : s.details) || {};
    let detailsHtml = '';

    if ('instruction' in d) {
        detailsHtml = `
            <div class="form-group" style="margin:0">
                <label class="form-label">Instruction Text</label>
                <textarea class="form-input" id="${s.method}-instruction" rows="3"
                          placeholder="Instructions shown to the user at checkout">${(d.instruction||'').replace(/</g,'&lt;')}</textarea>
            </div>`;
    } else if ('bank' in d || 'account_number' in d) {
        detailsHtml = `
            <div style="display:flex;flex-direction:column;gap:var(--space-3)">
                <div class="form-group" style="margin:0">
                    <label class="form-label">Bank Name</label>
                    <input type="text" class="form-input" id="${s.method}-bank" value="${d.bank || ''}" placeholder="e.g. BDO Unibank">
                </div>
                <div class="form-group" style="margin:0">
                    <label class="form-label">Account Number</label>
                    <input type="text" class="form-input" id="${s.method}-account_number" value="${d.account_number || ''}" placeholder="e.g. 1234-5678-90">
                </div>
                <div class="form-group" style="margin:0">
                    <label class="form-label">Account Name</label>
                    <input type="text" class="form-input" id="${s.method}-account_name" value="${d.account_name || ''}" placeholder="e.g. MugTuon Hub Corp.">
                </div>
                ${_screenshotToggleHtml(s.method, d.require_screenshot)}
            </div>`;
    } else {
        detailsHtml = `
            <div style="display:flex;flex-direction:column;gap:var(--space-3)">
                <div class="form-group" style="margin:0">
                    <label class="form-label">Account Number</label>
                    <input type="text" class="form-input" id="${s.method}-number" value="${d.number || ''}" placeholder="e.g. 0917-123-4567">
                </div>
                <div class="form-group" style="margin:0">
                    <label class="form-label">Account Name</label>
                    <input type="text" class="form-input" id="${s.method}-account_name" value="${d.account_name || ''}" placeholder="e.g. MugTuon Hub">
                </div>
                <div class="form-group" style="margin:0">
                    <label class="form-label">Note / Instruction</label>
                    <input type="text" class="form-input" id="${s.method}-note" value="${(d.note||'').replace(/"/g,'&quot;')}"
                           placeholder="e.g. Add your full name in the note field">
                </div>
                ${_screenshotToggleHtml(s.method, d.require_screenshot)}
            </div>`;
    }

    const labelEsc = s.label.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return `
    <div class="dashboard-card" id="card-${s.method}" style="opacity:${s.is_enabled ? 1 : 0.6}">
        <div class="dashboard-card__header">
            <div style="display:flex;align-items:center;gap:var(--space-3)">
                <span style="font-size:24px">${s.icon}</span>
                <h3 class="dashboard-card__title">${s.label}</h3>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-3)">
                <label class="toggle-switch" title="${s.is_enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}">
                    <input type="checkbox" id="${s.method}-enabled" ${s.is_enabled ? 'checked' : ''}
                           onchange="togglePaymentMethod('${s.method}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
                <button class="btn btn--ghost btn--sm btn--icon" title="Delete method"
                        style="color:var(--color-error)"
                        onclick="deletePaymentMethod('${s.method}','${labelEsc}')">🗑</button>
            </div>
        </div>
        <div class="dashboard-card__body" style="display:flex;flex-direction:column;gap:var(--space-5)">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
                <div class="form-group" style="margin:0">
                    <label class="form-label">Display Label</label>
                    <input type="text" class="form-input" id="${s.method}-label" value="${s.label}">
                </div>
                <div class="form-group" style="margin:0">
                    <label class="form-label">Icon (emoji)</label>
                    <input type="text" class="form-input" id="${s.method}-icon" value="${s.icon}" maxlength="4"
                           style="font-size:var(--text-xl);text-align:center">
                </div>
            </div>

            ${detailsHtml}

            <div style="display:flex;justify-content:flex-end">
                <button class="btn btn--accent btn--sm" onclick="savePaymentMethod('${s.method}')">
                    💾 Save Changes
                </button>
            </div>
        </div>
    </div>`;
}

// ─── Icon picker ───────────────────────────────────────────────────────
function toggleIconPicker(e) {
    e.stopPropagation();
    const dd = document.getElementById('icon-picker-dropdown');
    if (!dd) return;
    const willOpen = dd.style.display === 'none';
    dd.style.display = willOpen ? 'block' : 'none';
    if (willOpen) {
        const closeOnOutside = (ev) => {
            const wrap = document.getElementById('icon-picker-wrap');
            if (!wrap || !wrap.contains(ev.target)) {
                const d = document.getElementById('icon-picker-dropdown');
                if (d) d.style.display = 'none';
                document.removeEventListener('click', closeOnOutside);
            }
        };
        document.addEventListener('click', closeOnOutside);
    }
}

function selectPaymentIcon(emoji) {
    const preview = document.getElementById('icon-picker-preview');
    const input   = document.getElementById('new-pm-icon');
    if (preview) preview.textContent = emoji;
    if (input)   input.value = emoji;
    const dd = document.getElementById('icon-picker-dropdown');
    if (dd) dd.style.display = 'none';
}

// ─── Modal helpers ─────────────────────────────────────────────────────
function openAddPaymentMethodModal() {
    const modal = document.getElementById('add-pm-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAddPaymentMethodModal() {
    const modal = document.getElementById('add-pm-modal');
    if (modal) modal.style.display = 'none';
    const form = document.getElementById('add-pm-form');
    if (form) form.reset();
    // Reset icon picker display
    const preview = document.getElementById('icon-picker-preview');
    if (preview) preview.textContent = '💳';
    const input = document.getElementById('new-pm-icon');
    if (input) input.value = '💳';
    const dd = document.getElementById('icon-picker-dropdown');
    if (dd) dd.style.display = 'none';
    toggleNewPmFields();
}

function toggleNewPmFields() {
    const type        = document.getElementById('new-pm-type')?.value;
    const acctFields  = document.getElementById('new-pm-account-fields');
    const instrFields = document.getElementById('new-pm-instruction-fields');
    if (!acctFields || !instrFields) return;
    if (type === 'instruction') {
        acctFields.style.display  = 'none';
        instrFields.style.display = 'flex';
    } else {
        acctFields.style.display  = 'flex';
        instrFields.style.display = 'none';
    }
}

// ─── Submit new method ─────────────────────────────────────────────────
async function submitAddPaymentMethod(e) {
    e.preventDefault();
    const label = document.getElementById('new-pm-label')?.value.trim();
    const icon  = document.getElementById('new-pm-icon')?.value || '💳';
    const type  = document.getElementById('new-pm-type')?.value;

    if (!label) { Helpers.showToast('Error', 'Label is required.', 'error'); return; }

    let details = {};
    if (type === 'account') {
        details = {
            number:             document.getElementById('new-pm-number')?.value.trim() || '',
            account_name:       document.getElementById('new-pm-account_name')?.value.trim() || '',
            note:               document.getElementById('new-pm-note')?.value.trim() || '',
            require_screenshot: document.getElementById('new-pm-require_screenshot')?.checked || false,
        };
    } else {
        details = { instruction: document.getElementById('new-pm-instruction')?.value.trim() || '' };
    }

    try {
        const created = await API.post('/admin/payment-settings', { label, icon, method_type: type, details });
        _paymentSettings.push(created);
        const app = document.getElementById('app');
        _renderPaymentSettingsLayout(app);
        Helpers.showToast('Created!', `"${label}" payment method added.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ─── Delete method ─────────────────────────────────────────────────────
async function deletePaymentMethod(method, label) {
    if (!await Helpers.confirmAction('Delete Payment Method?', `Delete the "${label}" payment method? This cannot be undone.`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/payment-settings/${method}`);
        _paymentSettings = _paymentSettings.filter(x => x.method !== method);
        const app = document.getElementById('app');
        _renderPaymentSettingsLayout(app);
        Helpers.showToast('Deleted', `"${label}" has been removed.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ─── Toggle enabled ────────────────────────────────────────────────────
async function togglePaymentMethod(method, isEnabled) {
    const s = _paymentSettings.find(x => x.method === method);
    if (!s) return;
    try {
        const saved = await API.put(`/admin/payment-settings/${method}`, { ...s, is_enabled: isEnabled });
        s.is_enabled = saved.is_enabled;
        const card = document.getElementById(`card-${method}`);
        if (card) card.style.opacity = isEnabled ? '1' : '0.6';
        Helpers.showToast(isEnabled ? 'Enabled' : 'Disabled',
            `${s.label} is now ${isEnabled ? 'visible' : 'hidden'} at checkout.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ─── Save changes ──────────────────────────────────────────────────────
async function savePaymentMethod(method) {
    const s = _paymentSettings.find(x => x.method === method);
    if (!s) return;

    const label   = document.getElementById(`${method}-label`)?.value.trim() || s.label;
    const icon    = document.getElementById(`${method}-icon`)?.value.trim()  || s.icon;
    const enabled = document.getElementById(`${method}-enabled`)?.checked ?? s.is_enabled;

    const d = (typeof s.details === 'string' ? JSON.parse(s.details) : s.details) || {};
    let details = {};
    if ('instruction' in d) {
        details = { instruction: document.getElementById(`${method}-instruction`)?.value.trim() || '' };
    } else if ('bank' in d || 'account_number' in d) {
        details = {
            bank:               document.getElementById(`${method}-bank`)?.value.trim() || '',
            account_number:     document.getElementById(`${method}-account_number`)?.value.trim() || '',
            account_name:       document.getElementById(`${method}-account_name`)?.value.trim() || '',
            require_screenshot: document.getElementById(`${method}-require_screenshot`)?.checked || false,
        };
    } else {
        details = {
            number:             document.getElementById(`${method}-number`)?.value.trim() || '',
            account_name:       document.getElementById(`${method}-account_name`)?.value.trim() || '',
            note:               document.getElementById(`${method}-note`)?.value.trim() || '',
            require_screenshot: document.getElementById(`${method}-require_screenshot`)?.checked || false,
        };
    }

    try {
        const saved = await API.put(`/admin/payment-settings/${method}`, {
            label, icon, is_enabled: enabled, details
        });
        Object.assign(s, saved);
        Helpers.showToast('Saved!', `${label} settings updated.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}
