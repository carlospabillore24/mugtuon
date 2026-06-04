let _adminPlans = [];

async function renderAdminPlansPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading plans...</div>`,
        'Pricing Plans', 'Edit and control your membership pricing'
    );
    try {
        _adminPlans = await API.get('/admin/plans');
    } catch(e) { _adminPlans = []; }
    _renderPlansLayout(app);
}

function _renderPlansLayout(app) {
    const planCards = _adminPlans.length === 0
        ? `<div style="text-align:center;padding:var(--space-12);color:var(--color-text-muted)">No plans yet. Create your first plan.</div>`
        : _adminPlans.map(p => {
            const features = Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]');
            const isFree = parseFloat(p.price) === 0;
            return `
            <div style="background:var(--color-surface);border:2px solid ${p.is_featured ? 'var(--color-primary)' : 'var(--color-border)'};border-radius:var(--radius-xl);padding:var(--space-6);position:relative;opacity:${p.is_active ? 1 : 0.5}">
                ${p.badge_text ? `<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:var(--color-primary);color:#fff;padding:4px 18px;border-radius:var(--radius-full);font-size:var(--text-xs);font-weight:700;white-space:nowrap">${p.badge_text}</div>` : ''}
                ${!p.is_active ? `<div style="position:absolute;top:var(--space-3);right:var(--space-3)"><span class="badge badge--error">Inactive</span></div>` : ''}

                <div style="text-align:center;margin-bottom:var(--space-4)">
                    <div style="font-weight:700;font-size:var(--text-lg);margin-bottom:var(--space-2)">${p.name}</div>
                    <div style="font-size:var(--text-3xl);font-weight:800;color:var(--color-primary)">
                        ${isFree ? 'Free' : '&#8369;' + Number(p.price).toLocaleString() + '<span style="font-size:var(--text-base);font-weight:400;color:var(--color-text-muted)">/mo</span>'}
                    </div>
                    <div style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-1)">${p.description || ''}</div>
                </div>

                <ul style="list-style:none;padding:0;margin:0 0 var(--space-5) 0;display:flex;flex-direction:column;gap:var(--space-2)">
                    ${features.map(f => `<li style="display:flex;align-items:flex-start;gap:var(--space-2);font-size:var(--text-sm)"><span style="color:var(--color-primary);flex-shrink:0">✓</span>${f}</li>`).join('')}
                </ul>

                <div style="display:flex;gap:var(--space-2)">
                    <button class="btn btn--accent btn--sm" style="flex:1" onclick="openPlanModal('${p.id}')">✏️ Edit</button>
                    <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="deletePlan('${p.id}','${p.name.replace(/'/g,"\\'")}')">🗑</button>
                </div>
                <div style="margin-top:var(--space-3);display:flex;align-items:center;justify-content:space-between">
                    <span style="font-size:var(--text-xs);color:var(--color-text-muted)">Order: ${p.sort_order}</span>
                    <label class="toggle-switch" title="${p.is_active ? 'Active' : 'Inactive'}">
                        <input type="checkbox" ${p.is_active ? 'checked' : ''} onchange="togglePlanActive('${p.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>`;
        }).join('');

    const content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
            <span style="font-size:var(--text-sm);color:var(--color-text-muted)">${_adminPlans.length} plans · ${_adminPlans.filter(p=>p.is_active).length} active</span>
            <button class="btn btn--accent" onclick="openPlanModal(null)">+ Add Plan</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-6);margin-bottom:var(--space-8)">
            ${planCards}
        </div>

        <!-- Live Preview hint -->
        <div class="dashboard-card">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">💡 How it works</h3>
            </div>
            <div class="dashboard-card__body">
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-4);font-size:var(--text-sm);color:var(--color-text-secondary)">
                    <div><strong style="color:var(--color-text)">Badge Text</strong><br>Shows the pill above the card (e.g. "Most Popular")</div>
                    <div><strong style="color:var(--color-text)">Is Featured</strong><br>Adds a colored border and makes the button solid</div>
                    <div><strong style="color:var(--color-text)">Button Text</strong><br>The CTA label (e.g. "Start Free Trial", "Contact Sales")</div>
                    <div><strong style="color:var(--color-text)">Sort Order</strong><br>Controls left-to-right display order on the pricing page</div>
                </div>
            </div>
        </div>

        <!-- Plan Edit Modal -->
        <div id="planModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:flex-start;justify-content:center;padding:var(--space-6);overflow-y:auto">
            <div style="background:var(--color-surface);border-radius:var(--radius-xl);width:100%;max-width:600px;margin:auto;box-shadow:var(--shadow-xl)">
                <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                    <h3 id="planModalTitle" style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">Add Plan</h3>
                    <button class="btn btn--ghost btn--sm" onclick="closePlanModal()">✕</button>
                </div>
                <form id="planForm" onsubmit="submitPlanForm(event)" style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-5)">
                    <input type="hidden" id="planFormId">

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                        <div class="form-group">
                            <label class="form-label">Plan Name <span style="color:var(--color-error)">*</span></label>
                            <input type="text" class="form-input" id="planFormName" placeholder="e.g. Scholar" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Price (₱/mo) <span style="font-size:var(--text-xs);color:var(--color-text-muted)">0 = Free</span></label>
                            <input type="number" class="form-input" id="planFormPrice" min="0" step="0.01" placeholder="0.00">
                        </div>
                        <div class="form-group" style="grid-column:1/-1">
                            <label class="form-label">Tagline / Description</label>
                            <input type="text" class="form-input" id="planFormDesc" placeholder="e.g. For serious students">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Badge Text <span style="font-size:var(--text-xs);color:var(--color-text-muted)">(optional pill above card)</span></label>
                            <input type="text" class="form-input" id="planFormBadge" placeholder="e.g. Most Popular">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Button Text</label>
                            <input type="text" class="form-input" id="planFormBtn" placeholder="e.g. Start Free Trial">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Sort Order <span style="font-size:var(--text-xs);color:var(--color-text-muted)">(1 = leftmost)</span></label>
                            <input type="number" class="form-input" id="planFormOrder" min="0" value="1">
                        </div>
                        <div class="form-group" style="display:flex;flex-direction:column;gap:var(--space-3);justify-content:flex-end">
                            <label style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer">
                                <label class="toggle-switch"><input type="checkbox" id="planFormFeatured"><span class="toggle-slider"></span></label>
                                <span style="font-size:var(--text-sm)">Featured (colored border + solid button)</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:var(--space-3);cursor:pointer">
                                <label class="toggle-switch"><input type="checkbox" id="planFormActive" checked><span class="toggle-slider"></span></label>
                                <span style="font-size:var(--text-sm)">Active (visible on pricing page)</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Features <span style="font-size:var(--text-xs);color:var(--color-text-muted)">— one per line</span></label>
                        <div id="planFeaturesList" style="display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-2)"></div>
                        <button type="button" class="btn btn--outline btn--sm" onclick="addFeatureRow()">+ Add Feature</button>
                    </div>

                    <div style="display:flex;gap:var(--space-3);justify-content:flex-end;padding-top:var(--space-2)">
                        <button type="button" class="btn btn--outline" onclick="closePlanModal()">Cancel</button>
                        <button type="submit" class="btn btn--accent" id="planFormSubmitBtn">Save Plan</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Pricing Plans', 'Edit and control your membership pricing');
    document.getElementById('planModal')?.addEventListener('click', e => {
        if (e.target === document.getElementById('planModal')) closePlanModal();
    });
}

// ── Features editor ───────────────────────────────────────────────────────────

function addFeatureRow(value) {
    const list = document.getElementById('planFeaturesList');
    if (!list) return;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:var(--space-2);align-items:center';
    row.innerHTML = `
        <input type="text" class="form-input plan-feature-input" placeholder="e.g. 5 bookings per day" value="${(value||'').replace(/"/g,'&quot;')}" style="flex:1">
        <button type="button" class="btn btn--ghost btn--sm" style="color:var(--color-error);flex-shrink:0" onclick="this.parentElement.remove()">✕</button>`;
    list.appendChild(row);
    row.querySelector('input').focus();
}

function _loadFeatures(features) {
    const list = document.getElementById('planFeaturesList');
    if (!list) return;
    list.innerHTML = '';
    (features || []).forEach(f => addFeatureRow(f));
}

function _collectFeatures() {
    return [...document.querySelectorAll('.plan-feature-input')]
        .map(i => i.value.trim()).filter(Boolean);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openPlanModal(planId) {
    document.getElementById('planForm')?.reset();
    document.getElementById('planFeaturesList').innerHTML = '';

    if (planId) {
        const p = _adminPlans.find(x => x.id === planId);
        if (!p) return;
        document.getElementById('planModalTitle').textContent = 'Edit Plan';
        document.getElementById('planFormId').value      = p.id;
        document.getElementById('planFormName').value    = p.name;
        document.getElementById('planFormPrice').value   = p.price;
        document.getElementById('planFormDesc').value    = p.description || '';
        document.getElementById('planFormBadge').value   = p.badge_text || '';
        document.getElementById('planFormBtn').value     = p.button_text || '';
        document.getElementById('planFormOrder').value   = p.sort_order || 1;
        document.getElementById('planFormFeatured').checked = p.is_featured;
        document.getElementById('planFormActive').checked   = p.is_active;
        const features = Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]');
        _loadFeatures(features);
    } else {
        document.getElementById('planModalTitle').textContent = 'Add Plan';
        document.getElementById('planFormId').value = '';
        document.getElementById('planFormActive').checked   = true;
        document.getElementById('planFormFeatured').checked = false;
        addFeatureRow();
    }
    document.getElementById('planModal').style.display = 'flex';
}

function closePlanModal() {
    const m = document.getElementById('planModal');
    if (m) m.style.display = 'none';
}

async function submitPlanForm(e) {
    e.preventDefault();
    const btn = document.getElementById('planFormSubmitBtn');
    btn.disabled = true; btn.textContent = 'Saving...';

    const id = document.getElementById('planFormId').value;
    const payload = {
        name:        document.getElementById('planFormName').value.trim(),
        price:       parseFloat(document.getElementById('planFormPrice').value) || 0,
        description: document.getElementById('planFormDesc').value.trim(),
        badge_text:  document.getElementById('planFormBadge').value.trim() || null,
        button_text: document.getElementById('planFormBtn').value.trim() || 'Get Started',
        sort_order:  parseInt(document.getElementById('planFormOrder').value) || 1,
        is_featured: document.getElementById('planFormFeatured').checked,
        is_active:   document.getElementById('planFormActive').checked,
        features:    _collectFeatures(),
    };

    try {
        let saved;
        if (id) {
            saved = await API.put(`/admin/plans/${id}`, payload);
            const idx = _adminPlans.findIndex(p => p.id === id);
            if (idx !== -1) _adminPlans[idx] = saved;
            Helpers.showToast('Updated!', `${saved.name} plan saved.`, 'success');
        } else {
            saved = await API.post('/admin/plans', payload);
            _adminPlans.push(saved);
            Helpers.showToast('Created!', `${saved.name} plan added.`, 'success');
        }
        _adminPlans.sort((a, b) => a.sort_order - b.sort_order);
        closePlanModal();
        _renderPlansLayout(document.getElementById('app'));
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Save Plan';
    }
}

async function togglePlanActive(planId, isActive) {
    const plan = _adminPlans.find(p => p.id === planId);
    if (!plan) return;
    try {
        const saved = await API.put(`/admin/plans/${planId}`, {
            ...plan,
            features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]'),
            is_active: isActive
        });
        plan.is_active = saved.is_active;
        Helpers.showToast(isActive ? 'Activated' : 'Deactivated', `${plan.name} is now ${isActive ? 'visible' : 'hidden'} on the pricing page.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function deletePlan(planId, planName) {
    if (!await Helpers.confirmAction('Delete Plan?', `Delete "${planName}"? Users currently on this plan will lose their subscription.`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/plans/${planId}`);
        _adminPlans = _adminPlans.filter(p => p.id !== planId);
        Helpers.showToast('Deleted', `${planName} removed.`, 'success');
        _renderPlansLayout(document.getElementById('app'));
    } catch(err) {
        Helpers.showToast('Cannot Delete', err.message, 'error');
    }
}
