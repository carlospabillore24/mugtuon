/* ═══════════════════════════════════════
   Checkout Page — Plan subscription flow
   ═══════════════════════════════════════ */

let _checkoutPlan = null; // holds plan data while the page is open

// ── Payment instruction partials (driven by live settings) ───────────────────

let _paymentMethodSettings = null; // cached after first fetch

async function _loadPaymentSettings() {
    if (_paymentMethodSettings) return _paymentMethodSettings;
    try {
        _paymentMethodSettings = await API.get('/payment-settings');
    } catch(e) {
        // Fallback defaults if API unavailable
        _paymentMethodSettings = [
            { method:'gcash',         label:'GCash',          icon:'📱', is_enabled:true, details:{ number:'0917-123-4567', account_name:'MugTuon Hub', note:'Add your full name in the GCash message/note field.' }},
            { method:'card',          label:'Credit Card',     icon:'💳', is_enabled:true, details:{ instruction:'Our staff will process your card in person at the counter.' }},
            { method:'bank_transfer', label:'Bank Transfer',   icon:'🏦', is_enabled:true, details:{ bank:'BDO Unibank', account_number:'1234-5678-90', account_name:'MugTuon Hub Corp.' }},
            { method:'cash',          label:'Cash at Counter', icon:'💵', is_enabled:true, details:{ instruction:'Pay when you arrive at MugTuon Hub. Your plan will be activated by our staff upon receipt.' }},
        ];
    }
    return _paymentMethodSettings;
}

function _buildInstructions(setting, price) {
    const d = setting.details || {};
    const title = `${setting.icon} ${setting.label}`;

    if (setting.method === 'gcash') {
        return `
        <div class="checkout-instructions">
            <div class="checkout-instructions__title">${title} Instructions</div>
            <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-3)">
                Send <strong>&#8369;${Number(price).toLocaleString()}</strong> to this number:
            </p>
            <div style="background:var(--color-background);border:1px solid var(--color-border);border-radius:var(--radius);padding:var(--space-3) var(--space-4);font-family:'JetBrains Mono',monospace;font-size:var(--text-lg);font-weight:700;letter-spacing:.05em;margin-bottom:var(--space-2)">
                ${d.number || '—'}
            </div>
            ${d.account_name ? `<p style="font-size:var(--text-xs);color:var(--color-text-secondary)">Account name: <strong>${d.account_name}</strong></p>` : ''}
            ${d.note ? `<p style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-1)">${d.note}</p>` : ''}
        </div>`;
    }

    if (setting.method === 'bank_transfer') {
        const rows = [
            d.bank           ? ['Bank',           d.bank]           : null,
            d.account_number ? ['Account Number', d.account_number] : null,
            d.account_name   ? ['Account Name',   d.account_name]   : null,
            ['Amount', `&#8369;${Number(price).toLocaleString()}`],
        ].filter(Boolean);
        return `
        <div class="checkout-instructions">
            <div class="checkout-instructions__title">${title} Details</div>
            <div style="display:grid;gap:var(--space-2);margin-top:var(--space-3)">
                ${rows.map(([label, value]) => `
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:var(--text-sm)">
                        <span style="color:var(--color-text-secondary)">${label}</span>
                        <span style="font-weight:600${label==='Amount'?';color:var(--color-accent)':''}">${value}</span>
                    </div>`).join('')}
            </div>
        </div>`;
    }

    // card or cash — plain instruction text
    return `
    <div class="checkout-instructions">
        <div class="checkout-instructions__title">${title}</div>
        <p style="font-size:var(--text-sm);color:var(--color-text-secondary)">${d.instruction || ''}</p>
    </div>`;
}

// ── Called when user picks a payment method ───────────────────────────────────

function updateCheckoutMethod(method) {
    const settings = _paymentMethodSettings || [];
    settings.forEach(s => {
        const el = document.getElementById(`method-lbl-${s.method}`);
        if (el) el.style.borderColor = (s.method === method) ? 'var(--color-accent)' : 'var(--color-border)';
    });

    const instrEl     = document.getElementById('checkout-instr');
    const refGroup    = document.getElementById('ref-group');
    const proofSection = document.getElementById('proof-upload-section');
    if (!instrEl || !_checkoutPlan) return;

    const setting = settings.find(s => s.method === method);
    if (setting) {
        instrEl.innerHTML = _buildInstructions(setting, _checkoutPlan.price);
        refGroup.style.display = method === 'cash' ? 'none' : 'block';
        // Show proof upload only if this method requires screenshot
        if (proofSection) {
            proofSection.style.display = setting.details?.require_screenshot ? 'block' : 'none';
        }
    }
}

function previewProofImage(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        Helpers.showToast('File Too Large', 'Please upload an image smaller than 5 MB.', 'error');
        input.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const img         = document.getElementById('proof-img-preview');
        const previewWrap = document.getElementById('proof-preview-wrap');
        const placeholder = document.getElementById('proof-upload-placeholder');
        if (img)         img.src = e.target.result;
        if (previewWrap) previewWrap.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// ── Form submission ───────────────────────────────────────────────────────────

async function handleCheckoutSubmit(planId, planName, isFree) {
    const btn     = document.getElementById('checkoutBtn');
    const errorEl = document.getElementById('checkoutError');
    errorEl.style.display = 'none';

    let paymentMethod  = 'gcash';
    let referenceNumber = null;

    let proofImage = null;

    if (!isFree) {
        const methodInput = document.querySelector('input[name="payMethod"]:checked');
        paymentMethod = methodInput ? methodInput.value : 'gcash';
        referenceNumber = document.getElementById('refNumber')?.value?.trim() || null;

        if (paymentMethod !== 'cash' && !referenceNumber) {
            errorEl.textContent = 'Please enter your payment reference number.';
            errorEl.style.display = 'block';
            return;
        }

        // Check if this method requires a proof screenshot
        const methodSetting = (_paymentMethodSettings || []).find(s => s.method === paymentMethod);
        if (methodSetting?.details?.require_screenshot) {
            const proofInput = document.getElementById('proofFile');
            if (!proofInput?.files?.length) {
                errorEl.textContent = 'Please upload a screenshot of your payment as proof.';
                errorEl.style.display = 'block';
                return;
            }
            proofImage = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload  = e => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Failed to read image'));
                reader.readAsDataURL(proofInput.files[0]);
            });
        }
    }

    btn.textContent = 'Processing…';
    btn.disabled = true;

    try {
        await API.post('/payments/subscribe', { planId, paymentMethod, referenceNumber, proofImage });

        // Persist plan name in local user store so header / dashboard can show it
        const user = Store.get('user');
        if (user) {
            const updated = { ...user, plan: planName };
            Store.set('user', updated);
            localStorage.setItem('mugtuon_user', JSON.stringify(updated));
        }

        Router.navigate('/dashboard');
        if (isFree) {
            Helpers.showToast('Plan Activated!', `You\'re now on the ${planName} plan. Enjoy!`, 'success');
        } else {
            Helpers.showToast('Subscription Complete! 🎉', `Welcome to ${planName}! Your plan is now active.`, 'success');
        }
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
        const price = _checkoutPlan ? Number(_checkoutPlan.price).toLocaleString() : '0';
        btn.textContent = isFree
            ? 'Activate Free Plan'
            : `Complete Subscription — &#8369;${price}`;
        btn.disabled = false;
    }
}

// ── Main render function ──────────────────────────────────────────────────────

async function renderCheckoutPage(app) {
    // Auth guard — redirect to register (preserving plan param)
    if (!Store.isLoggedIn) {
        const { plan } = Router.getQuery();
        Router.navigate(plan ? `/register?plan=${plan}` : '/register');
        return;
    }

    const { plan: planId } = Router.getQuery();
    if (!planId) {
        Router.navigate('/pricing');
        return;
    }

    // ── Skeleton ──────────────────────────────────────────────────────────────
    app.innerHTML = `
    ${renderHeader()}
    <section class="section" style="min-height:80vh;padding-top:var(--space-6);padding-bottom:var(--space-12)">
        <div class="container" style="max-width:920px">

            <a href="/pricing" data-link
               style="display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);color:var(--color-text-secondary);text-decoration:none;margin-bottom:var(--space-6)">
                ← Back to Pricing
            </a>

            <h1 style="font-size:var(--text-2xl);font-weight:700;margin-bottom:var(--space-2)">Complete your subscription</h1>
            <p style="color:var(--color-text-secondary);margin-bottom:var(--space-8)">Review your order and enter payment details below.</p>

            <div style="display:grid;grid-template-columns:5fr 7fr;gap:var(--space-8);align-items:start">

                <!-- Order Summary skeleton -->
                <div class="card" id="checkout-summary" style="padding:var(--space-6)">
                    <div style="height:14px;width:40%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-5)"></div>
                    <div style="height:28px;width:65%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>
                    <div style="height:40px;width:45%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-5)"></div>
                    ${[1,2,3,4].map(() => `<div style="height:13px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>`).join('')}
                </div>

                <!-- Payment form skeleton -->
                <div class="card" id="checkout-payment" style="padding:var(--space-6)">
                    <div style="height:14px;width:40%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-6)"></div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-5)">
                        ${[1,2,3,4].map(() => `<div style="height:60px;background:var(--color-border);border-radius:var(--radius-md)"></div>`).join('')}
                    </div>
                    <div style="height:100px;background:var(--color-border);border-radius:var(--radius-md);margin-bottom:var(--space-5)"></div>
                    <div style="height:48px;background:var(--color-border);border-radius:var(--radius-md)"></div>
                </div>
            </div>
        </div>
    </section>
    ${renderFooter()}
    `;

    initHeaderScroll();

    // ── Fetch plan + payment settings in parallel ─────────────────────────────
    let plan;
    try {
        [plan] = await Promise.all([
            API.get(`/plans/${planId}`),
            _loadPaymentSettings(),
        ]);
        _checkoutPlan = plan;
    } catch (err) {
        document.getElementById('checkout-summary').innerHTML = `
            <div style="text-align:center;padding:var(--space-8) var(--space-4)">
                <div style="font-size:48px;margin-bottom:var(--space-4)">⚠️</div>
                <h3 style="margin-bottom:var(--space-2)">Plan not found</h3>
                <p style="color:var(--color-text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-5)">
                    This plan may no longer be available.
                </p>
                <a href="/pricing" data-link class="btn btn--outline">View All Plans</a>
            </div>`;
        document.getElementById('checkout-payment').innerHTML = '';
        return;
    }

    const isFree    = parseFloat(plan.price) === 0;
    const features  = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]');
    const user      = Store.get('user');

    // ── Order summary ─────────────────────────────────────────────────────────
    document.getElementById('checkout-summary').innerHTML = `
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.07em;margin-bottom:var(--space-5)">
            Order Summary
        </div>

        ${plan.badge_text ? `
        <div class="pricing-card__badge" style="margin-bottom:var(--space-3)">${plan.badge_text}</div>` : ''}

        <h2 style="font-size:var(--text-2xl);font-weight:700;margin-bottom:var(--space-2)">${plan.name}</h2>

        <div class="pricing-card__price" style="margin-bottom:var(--space-2)">
            ${isFree ? 'Free' : `&#8369;${Number(plan.price).toLocaleString()}<span>/mo</span>`}
        </div>

        <p style="color:var(--color-text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-5)">
            ${plan.description || ''}
        </p>

        <ul class="pricing-card__features" style="margin-bottom:var(--space-6)">
            ${features.map(f => `<li>${f}</li>`).join('')}
        </ul>

        <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2)">
                <span style="font-size:var(--text-sm);color:var(--color-text-secondary)">Billing period</span>
                <span style="font-size:var(--text-sm);font-weight:500;text-transform:capitalize">${plan.billing_period || 'monthly'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:600">Total today</span>
                <span style="font-weight:700;font-size:var(--text-xl);color:var(--color-accent)">
                    ${isFree ? 'Free' : `&#8369;${Number(plan.price).toLocaleString()}`}
                </span>
            </div>
            ${!isFree ? `
            <p style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-2)">
                Billed ${plan.billing_period || 'monthly'} · Cancel anytime
            </p>` : ''}
        </div>
    `;

    // ── Payment form ──────────────────────────────────────────────────────────
    const activeMethods = (_paymentMethodSettings || []).filter(s => s.is_enabled);

    if (isFree) {
        document.getElementById('checkout-payment').innerHTML = `
            <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.07em;margin-bottom:var(--space-5)">
                Activation
            </div>

            <div style="text-align:center;padding:var(--space-6) var(--space-4)">
                <div style="font-size:52px;margin-bottom:var(--space-4)">🎉</div>
                <h3 style="margin-bottom:var(--space-2)">No payment needed!</h3>
                <p style="color:var(--color-text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-6)">
                    The Explorer plan is completely free. Click below to activate it on your account.
                </p>
                <div id="checkoutError" class="form-error" style="margin-bottom:var(--space-4);display:none"></div>
                <button
                    id="checkoutBtn"
                    onclick="handleCheckoutSubmit('${plan.id}', '${plan.name}', true)"
                    class="btn btn--accent btn--full btn--lg">
                    Activate Free Plan
                </button>
            </div>
        `;
    } else {
        const methods = activeMethods.length > 0
            ? activeMethods.map(s => ({ value: s.method, label: s.label, icon: s.icon }))
            : [
                { value: 'gcash',         label: 'GCash',          icon: '📱' },
                { value: 'card',          label: 'Credit Card',     icon: '💳' },
                { value: 'bank_transfer', label: 'Bank Transfer',   icon: '🏦' },
                { value: 'cash',          label: 'Cash at Counter', icon: '💵' },
            ];
        const firstMethod  = methods[0]?.value || 'gcash';
        const firstSetting = (_paymentMethodSettings || []).find(s => s.method === firstMethod);
        const firstRequiresProof = firstSetting?.details?.require_screenshot || false;

        document.getElementById('checkout-payment').innerHTML = `
            <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.07em;margin-bottom:var(--space-5)">
                Payment Details
            </div>

            <!-- Account info -->
            <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-5);display:flex;align-items:center;gap:var(--space-3)">
                <div style="width:38px;height:38px;border-radius:50%;background:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:var(--text-sm);font-weight:700;color:#fff;flex-shrink:0">
                    ${Helpers.getInitials(user?.first_name, user?.last_name)}
                </div>
                <div>
                    <div style="font-weight:600;font-size:var(--text-sm)">${user?.first_name || ''} ${user?.last_name || ''}</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">${user?.email || ''}</div>
                </div>
            </div>

            <!-- Payment method selector -->
            <div class="form-label" style="margin-bottom:var(--space-3)">Payment Method</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-5)">
                ${methods.map((m, i) => `
                <label
                    id="method-lbl-${m.value}"
                    onclick="updateCheckoutMethod('${m.value}')"
                    style="display:flex;align-items:center;gap:var(--space-3);border:2px solid ${i === 0 ? 'var(--color-accent)' : 'var(--color-border)'};border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);cursor:pointer;transition:border-color .15s">
                    <input type="radio" name="payMethod" value="${m.value}" ${i === 0 ? 'checked' : ''} style="display:none">
                    <span style="font-size:20px">${m.icon}</span>
                    <span style="font-size:var(--text-sm);font-weight:500">${m.label}</span>
                </label>`).join('')}
                ${methods.length === 0 ? '<p style="color:var(--color-text-muted);font-size:var(--text-sm);grid-column:1/-1">No payment methods available. Please contact us.</p>' : ''}
            </div>

            <!-- Dynamic instructions -->
            <div id="checkout-instr">
                ${firstSetting ? _buildInstructions(firstSetting, plan.price) : ''}
            </div>

            <!-- Reference number -->
            <div class="form-group" id="ref-group">
                <label class="form-label">
                    Reference Number <span style="color:var(--color-error)">*</span>
                </label>
                <input
                    type="text"
                    id="refNumber"
                    class="form-input"
                    placeholder="e.g. 1234567890">
                <span style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-1);display:block">
                    Enter the reference number shown in your payment confirmation.
                </span>
            </div>

            <!-- Proof of payment upload (shown when method requires screenshot) -->
            <div id="proof-upload-section" style="display:${firstRequiresProof ? 'block' : 'none'};margin-bottom:var(--space-1)">
                <label class="form-label" style="margin-bottom:var(--space-2)">
                    📸 Proof of Payment <span style="color:var(--color-error)">*</span>
                </label>
                <div id="proof-dropzone"
                     onclick="document.getElementById('proofFile').click()"
                     style="border:2px dashed var(--color-border);border-radius:var(--radius-md);
                            padding:var(--space-5);text-align:center;cursor:pointer;
                            transition:border-color .2s,background .2s"
                     onmouseover="this.style.borderColor='var(--color-accent)';this.style.background='var(--color-surface)'"
                     onmouseout="this.style.borderColor='var(--color-border)';this.style.background='transparent'">
                    <div id="proof-preview-wrap" style="display:none;margin-bottom:var(--space-2)">
                        <img id="proof-img-preview"
                             style="max-width:100%;max-height:180px;border-radius:var(--radius-sm);object-fit:contain">
                        <p style="font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-1)">
                            Click to change
                        </p>
                    </div>
                    <div id="proof-upload-placeholder">
                        <div style="font-size:36px;margin-bottom:var(--space-2)">📷</div>
                        <div style="font-size:var(--text-sm);font-weight:600;margin-bottom:4px">
                            Upload screenshot of your transfer
                        </div>
                        <div style="font-size:var(--text-xs);color:var(--color-text-muted)">
                            JPG or PNG · max 5 MB
                        </div>
                    </div>
                </div>
                <input type="file" id="proofFile" accept="image/jpeg,image/png,image/jpg,image/webp"
                       style="display:none" onchange="previewProofImage(this)">
            </div>

            <div id="checkoutError" class="form-error" style="margin-bottom:var(--space-4);display:none"></div>

            <button
                id="checkoutBtn"
                onclick="handleCheckoutSubmit('${plan.id}', '${plan.name}', false)"
                class="btn btn--accent btn--full btn--lg">
                Complete Subscription &mdash; &#8369;${Number(plan.price).toLocaleString()}
            </button>

            <p style="text-align:center;font-size:var(--text-xs);color:var(--color-text-secondary);margin-top:var(--space-3)">
                🔒 Secure payment &nbsp;·&nbsp; Cancel anytime
            </p>
        `;
    }
}
