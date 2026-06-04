let _allPayments = [];
let _paymentMethods = [];
let _paymentPage = 1;
const _paymentLimit = 30;

async function renderAdminPaymentsPage(app) {
    _paymentPage = 1;
    await _loadPaymentsPage(app);
}

async function _loadPaymentsPage(app, page) {
    if (page) _paymentPage = page;
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading payments...</div>`,
        'Payments Dashboard',
        'Monitor revenue, transactions, and financial health'
    );

    let data = {
        payments: [], total: 0, page: _paymentPage, limit: _paymentLimit,
        dailyRevenue: [], byType: [], byMethod: [],
        summary: { total_revenue: 0, today_revenue: 0, monthly_revenue: 0, pending_count: 0, pending_amount: 0, refunded_count: 0 }
    };

    try {
        const [paymentsData, methods] = await Promise.all([
            API.get(`/admin/payments?page=${_paymentPage}&limit=${_paymentLimit}`),
            API.get('/admin/payment-settings').catch(() => [])
        ]);
        data = paymentsData;
        _paymentMethods = methods;
    } catch(e) {
        Helpers.showToast('Error', 'Failed to load payments data', 'error');
    }

    _allPayments = data.payments;
    const s = data.summary;

    // Build daily revenue chart (last 30 days)
    const today = new Date();
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        last30Days.push(d.toISOString().split('T')[0]);
    }
    const dayRevMap = {};
    for (const d of data.dailyRevenue) dayRevMap[String(d.date).slice(0, 10)] = parseFloat(d.total);
    const revValues = last30Days.map(d => dayRevMap[d] || 0);
    const maxRev = Math.max(...revValues, 1);
    const normalizedRevBars = revValues.map(v => Math.round((v / maxRev) * 100));

    const totalRevByType   = data.byType.reduce((sum, t) => sum + parseFloat(t.total), 0) || 1;
    const totalMethodCount = data.byMethod.reduce((sum, m) => sum + m.count, 0) || 1;
    const methodIcons = {};
    if (_paymentMethods.length > 0) {
        for (const m of _paymentMethods) methodIcons[m.method] = m.icon;
    } else {
        Object.assign(methodIcons, { gcash: '📱', card: '💳', cash: '💵', bank_transfer: '🏦' });
    }

    const methodSelectOptions = _paymentMethods.length > 0
        ? _paymentMethods.map(m => `<option value="${m.method}">${m.icon} ${m.label}</option>`).join('')
        : `<option value="gcash">GCash</option><option value="card">Card</option><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option>`;

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Today's Revenue</span>
                    <span class="dashboard-stat-card__icon">💰</span>
                </div>
                <div class="dashboard-stat-card__value">${Helpers.formatCurrency(s.today_revenue)}</div>
                <div class="dashboard-stat-card__change">Completed payments</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Monthly Revenue</span>
                    <span class="dashboard-stat-card__icon">📈</span>
                </div>
                <div class="dashboard-stat-card__value">${Helpers.formatCurrency(s.monthly_revenue)}</div>
                <div class="dashboard-stat-card__change">Last 30 days</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Pending</span>
                    <span class="dashboard-stat-card__icon">⏳</span>
                </div>
                <div class="dashboard-stat-card__value">${s.pending_count}</div>
                <div class="dashboard-stat-card__change">${Helpers.formatCurrency(s.pending_amount)} awaiting</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Refunds</span>
                    <span class="dashboard-stat-card__icon">↩️</span>
                </div>
                <div class="dashboard-stat-card__value">${s.refunded_count}</div>
                <div class="dashboard-stat-card__change" style="color:var(--color-warning)">Total refunded</div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Revenue — Last 30 Days</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${Helpers.renderBarChart(normalizedRevBars, null, { height: '200px' })}
                    </div>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3)">
                    <h3 style="font-size:var(--text-base);font-weight:var(--weight-semibold)">Transactions</h3>
                    <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:center">
                        <input type="text" class="form-input" placeholder="Search name, ref, type..." style="width:220px"
                               oninput="filterPaymentRows(this.value)">
                        <select class="form-input" style="width:140px" onchange="filterPaymentRows(document.querySelector('[placeholder*=Search]')?.value||'', this.value)">
                            <option value="">All Statuses</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                        </select>
                        <button class="btn btn--outline btn--sm" onclick="exportPaymentsCSV()">Export CSV</button>
                    </div>
                </div>

                <div id="payBulkBar" style="display:none;background:var(--color-accent);color:white;padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);margin-bottom:var(--space-4);align-items:center;gap:var(--space-4);flex-wrap:wrap">
                    <span id="payBulkCount" style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">0 selected</span>
                    <button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" onclick="bulkPaymentAction('completed')">Approve</button>
                    <button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" onclick="bulkPaymentAction('failed')">Reject</button>
                    <button class="btn btn--ghost btn--sm" style="color:white;margin-left:auto" onclick="clearPayBulk()">Clear</button>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                        <table class="data-table" id="paymentsTable">
                            <thead>
                                <tr>
                                    <th style="width:36px"><input type="checkbox" onchange="toggleAllPayments(this.checked)" style="accent-color:var(--color-accent)"></th>
                                    <th>User</th>
                                    <th>Type</th>
                                    <th>Method</th>
                                    <th>Ref #</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="paymentsTableBody">
                                ${_renderPaymentRows(_allPayments)}
                            </tbody>
                        </table>
                    </div>
                    ${(data.total || 0) > _paymentLimit ? `
                    <div style="display:flex;justify-content:center;align-items:center;gap:var(--space-3);padding:var(--space-4);border-top:1px solid var(--color-border)">
                        <button class="btn btn--outline btn--sm" onclick="_loadPaymentsPage(document.getElementById('app'), ${_paymentPage-1})"
                                ${_paymentPage <= 1 ? 'disabled' : ''}>← Prev</button>
                        <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Page ${_paymentPage} of ${Math.ceil((data.total||1)/_paymentLimit)}</span>
                        <button class="btn btn--outline btn--sm" onclick="_loadPaymentsPage(document.getElementById('app'), ${_paymentPage+1})"
                                ${_paymentPage >= Math.ceil((data.total||1)/_paymentLimit) ? 'disabled' : ''}>Next →</button>
                    </div>` : ''}
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--space-6)">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Revenue by Type</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${data.byType.length === 0
                            ? `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">No revenue data yet.</div>`
                            : data.byType.map(t => {
                                const pct = Math.round((parseFloat(t.total) / totalRevByType) * 100);
                                return `
                                <div style="margin-bottom:var(--space-4)">
                                    <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-1)">
                                        <span style="font-size:var(--text-sm);text-transform:capitalize">${t.type}</span>
                                        <span style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${Helpers.formatCurrency(t.total)}</span>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:var(--space-2)">
                                        <div class="progress" style="flex:1"><div class="progress__bar" style="width:${pct}%"></div></div>
                                        <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${pct}%</span>
                                    </div>
                                </div>`;
                            }).join('')}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Payment Methods</h3>
                    </div>
                    <div class="dashboard-card__body">
                        ${data.byMethod.length === 0
                            ? `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">No method data yet.</div>`
                            : data.byMethod.map(m => {
                                const pct = Math.round((m.count / totalMethodCount) * 100);
                                const key = (m.payment_method || '').toLowerCase().replace(' ', '_');
                                const icon = methodIcons[key] || '💳';
                                const pm = _paymentMethods.find(p => p.method === key);
                                const label = pm ? pm.label : (m.payment_method || 'Unknown');
                                return `
                                <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
                                    <span style="font-size:var(--text-lg)">${icon}</span>
                                    <div style="flex:1">
                                        <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-1)">
                                            <span style="font-size:var(--text-sm)">${label}</span>
                                            <span style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${pct}%</span>
                                        </div>
                                        <div class="progress"><div class="progress__bar" style="width:${pct}%"></div></div>
                                    </div>
                                </div>`;
                            }).join('')}
                    </div>
                </div>

                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Revenue Summary</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-lg)">${Helpers.formatCurrency(s.total_revenue)}</div><div class="stat__label">Total Revenue</div></div>
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-lg)">${Helpers.formatCurrency(s.monthly_revenue)}</div><div class="stat__label">This Month</div></div>
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-lg)">${s.pending_count}</div><div class="stat__label">Pending</div></div>
                            <div class="stat"><div class="stat__value" style="font-size:var(--text-lg)">${s.refunded_count}</div><div class="stat__label">Refunded</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Proof Image Modal -->
        <div id="proofModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:1100;align-items:center;justify-content:center;padding:var(--space-4)" onclick="closeProofModal()">
            <div style="background:var(--color-surface);border-radius:var(--radius-xl);max-width:600px;width:100%;box-shadow:var(--shadow-xl);overflow:hidden" onclick="event.stopPropagation()">
                <div style="padding:var(--space-4) var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                    <h3 style="font-size:var(--text-base);font-weight:var(--weight-semibold)">📸 Payment Proof</h3>
                    <button class="btn btn--ghost btn--sm" onclick="closeProofModal()">✕</button>
                </div>
                <div style="padding:var(--space-4);text-align:center;min-height:200px;display:flex;align-items:center;justify-content:center" id="proofModalBody">
                    <div style="color:var(--color-text-muted);font-size:var(--text-sm)">Loading...</div>
                </div>
            </div>
        </div>

        <!-- Payment Edit Modal -->
        <div id="paymentModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;padding:var(--space-4)">
            <div style="background:var(--color-surface);border-radius:var(--radius-xl);width:100%;max-width:480px;box-shadow:var(--shadow-xl)">
                <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                    <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">Edit Payment</h3>
                    <button class="btn btn--ghost btn--sm" onclick="closePaymentModal()">✕</button>
                </div>
                <div style="padding:var(--space-2) var(--space-6);background:var(--color-bg);border-bottom:1px solid var(--color-border)">
                    <div id="paymentModalMeta" style="font-size:var(--text-sm);color:var(--color-text-muted)"></div>
                </div>
                <form id="paymentForm" onsubmit="submitPaymentEdit(event)" style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)">
                    <input type="hidden" id="paymentFormId">

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-input" id="paymentFormStatus">
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Payment Method</label>
                            <select class="form-input" id="paymentFormMethod">
                                ${methodSelectOptions}
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Amount (₱)</label>
                            <input type="number" class="form-input" id="paymentFormAmount" min="0" step="0.01">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Reference #</label>
                            <input type="text" class="form-input" id="paymentFormRef" placeholder="e.g. GCash ref no.">
                        </div>

                        <div class="form-group" style="grid-column:1/-1">
                            <label class="form-label">Description</label>
                            <input type="text" class="form-input" id="paymentFormDesc" placeholder="Payment description">
                        </div>
                    </div>

                    <div style="display:flex;gap:var(--space-3);justify-content:flex-end;padding-top:var(--space-2)">
                        <button type="button" class="btn btn--outline" onclick="closePaymentModal()">Cancel</button>
                        <button type="submit" class="btn btn--accent" id="paymentFormBtn">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Payments Dashboard', 'Monitor revenue, transactions, and financial health');

    // Close modals on backdrop click
    document.getElementById('paymentModal')?.addEventListener('click', e => {
        if (e.target === document.getElementById('paymentModal')) closePaymentModal();
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _getMethodDisplay(method) {
    if (!method) return '—';
    const pm = _paymentMethods.find(m => m.method === method);
    if (pm) return `${pm.icon} ${pm.label}`;
    const defaults = { gcash: '📱 GCash', card: '💳 Card', cash: '💵 Cash', bank_transfer: '🏦 Bank Transfer' };
    return defaults[method] || `💳 ${method}`;
}

function _renderPaymentRows(payments) {
    if (!payments.length) {
        return `<tr><td colspan="9" style="text-align:center;color:var(--color-text-muted);padding:var(--space-6)">No payments found.</td></tr>`;
    }
    return payments.map(p => {
        const statusBadge = { completed:'success', pending:'warning', failed:'error', refunded:'error' }[p.status] || 'primary';
        return `
        <tr data-id="${p.id}">
            <td><input type="checkbox" class="pay-bulk-check" data-id="${p.id}" onchange="updatePayBulkBar()" style="accent-color:var(--color-accent)"></td>
            <td style="font-weight:var(--weight-medium)">${Helpers.esc(p.first_name)} ${Helpers.esc(p.last_name)}
                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.esc(p.email)}</div>
            </td>
            <td><span class="badge badge--${p.type === 'membership' ? 'accent' : 'primary'}">${p.type}</span></td>
            <td>${_getMethodDisplay(p.payment_method)}</td>
            <td style="font-size:var(--text-xs);color:var(--color-text-muted)">${p.reference_number || '—'}</td>
            <td style="font-weight:var(--weight-semibold)">${Helpers.formatCurrency(p.amount)}</td>
            <td><span class="badge badge--${statusBadge}">${p.status}</span></td>
            <td style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.formatDate(p.created_at)}</td>
            <td style="display:flex;gap:var(--space-2);flex-wrap:wrap">
                <button class="btn btn--outline btn--sm" onclick="openPaymentModal('${p.id}')">✏️ Edit</button>
                ${p.has_proof ? `<button class="btn btn--ghost btn--sm" onclick="viewProofImage('${p.id}')">🖼 Proof</button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

function filterPaymentRows(query, statusFilter) {
    const q = (query || '').toLowerCase();
    const sf = statusFilter !== undefined ? statusFilter
        : document.querySelector('#paymentsTable select')?.value || '';

    document.querySelectorAll('#paymentsTableBody tr[data-id]').forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchQuery  = !q  || text.includes(q);
        const matchStatus = !sf || text.includes(sf);
        row.style.display = matchQuery && matchStatus ? '' : 'none';
    });
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openPaymentModal(paymentId) {
    const p = _allPayments.find(x => x.id === paymentId);
    if (!p) return;

    document.getElementById('paymentFormId').value     = p.id;
    document.getElementById('paymentFormStatus').value = p.status;
    const methodSelect = document.getElementById('paymentFormMethod');
    methodSelect.value = p.payment_method || 'cash';
    if (p.payment_method && methodSelect.value !== p.payment_method) {
        const opt = document.createElement('option');
        opt.value = p.payment_method;
        opt.textContent = '💳 ' + p.payment_method;
        methodSelect.appendChild(opt);
        methodSelect.value = p.payment_method;
    }
    document.getElementById('paymentFormAmount').value = p.amount;
    document.getElementById('paymentFormRef').value    = p.reference_number || '';
    document.getElementById('paymentFormDesc').value   = p.description || '';
    document.getElementById('paymentModalMeta').innerHTML =
        `<strong>${Helpers.esc(p.first_name)} ${Helpers.esc(p.last_name)}</strong> &nbsp;·&nbsp; ${Helpers.esc(p.type)} &nbsp;·&nbsp; ${Helpers.formatDate(p.created_at)}`;

    document.getElementById('paymentModal').style.display = 'flex';
}

function closePaymentModal() {
    const m = document.getElementById('paymentModal');
    if (m) m.style.display = 'none';
}

// ── Proof Image Viewer ────────────────────────────────────────────────────────

async function viewProofImage(paymentId) {
    const modal = document.getElementById('proofModal');
    const body  = document.getElementById('proofModalBody');
    body.innerHTML = `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">Loading proof image...</div>`;
    modal.style.display = 'flex';
    try {
        const data = await API.get(`/admin/payments/${paymentId}/proof`);
        body.innerHTML = `
            <img src="${data.proof_image}" alt="Payment proof"
                 style="max-width:100%;max-height:70vh;border-radius:var(--radius-md);object-fit:contain">`;
    } catch(err) {
        body.innerHTML = `<div style="color:var(--color-error);font-size:var(--text-sm)">Failed to load proof image: ${Helpers.esc(err.message)}</div>`;
    }
}

function closeProofModal() {
    const m = document.getElementById('proofModal');
    if (m) m.style.display = 'none';
}

async function exportPaymentsCSV() {
    Helpers.showToast('Exporting', 'Fetching all payments...', 'info');
    let allPayments = _allPayments;
    try {
        const data = await API.get('/admin/payments?limit=10000');
        allPayments = data.payments || allPayments;
    } catch(e) {}
    if (!allPayments.length) { Helpers.showToast('No data', 'No payments to export.', 'info'); return; }
    const headers = ['Name', 'Email', 'Type', 'Method', 'Reference', 'Amount', 'Status', 'Date'];
    const rows = allPayments.map(p => [
        `"${p.first_name} ${p.last_name}"`, `"${p.email}"`, p.type,
        p.payment_method || '', `"${p.reference_number || ''}"`,
        p.amount, p.status,
        p.created_at ? p.created_at.slice(0, 10) : ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Helpers.showToast('Exported', `${allPayments.length} payments exported.`, 'success');
}

function toggleAllPayments(checked) {
    document.querySelectorAll('.pay-bulk-check').forEach(cb => { cb.checked = checked; });
    updatePayBulkBar();
}

function updatePayBulkBar() {
    const checked = document.querySelectorAll('.pay-bulk-check:checked');
    const bar = document.getElementById('payBulkBar');
    const count = document.getElementById('payBulkCount');
    if (bar) bar.style.display = checked.length > 0 ? 'flex' : 'none';
    if (count) count.textContent = `${checked.length} selected`;
}

function clearPayBulk() {
    document.querySelectorAll('.pay-bulk-check').forEach(cb => { cb.checked = false; });
    const headerCb = document.querySelector('#paymentsTable thead input[type=checkbox]');
    if (headerCb) headerCb.checked = false;
    updatePayBulkBar();
}

async function bulkPaymentAction(newStatus) {
    const ids = [...document.querySelectorAll('.pay-bulk-check:checked')].map(cb => cb.dataset.id);
    if (ids.length === 0) return;
    if (!await Helpers.confirmAction('Bulk Update?', `Set ${ids.length} payment(s) to "${newStatus}"?`, { confirmText: 'Update All', type: 'warning' })) return;

    let success = 0;
    for (const id of ids) {
        try {
            await API.put(`/admin/payments/${id}`, { status: newStatus });
            success++;
        } catch(e) {}
    }
    Helpers.showToast('Bulk Update', `${success} of ${ids.length} payments updated.`, 'success');
    _loadPaymentsPage(document.getElementById('app'));
}

async function submitPaymentEdit(e) {
    e.preventDefault();
    const btn = document.getElementById('paymentFormBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = document.getElementById('paymentFormId').value;
    const payload = {
        status:           document.getElementById('paymentFormStatus').value,
        payment_method:   document.getElementById('paymentFormMethod').value,
        amount:           parseFloat(document.getElementById('paymentFormAmount').value),
        reference_number: document.getElementById('paymentFormRef').value.trim(),
        description:      document.getElementById('paymentFormDesc').value.trim(),
    };

    try {
        const updated = await API.put(`/admin/payments/${id}`, payload);
        // Update local cache
        const idx = _allPayments.findIndex(p => p.id === id);
        if (idx !== -1) _allPayments[idx] = { ..._allPayments[idx], ...updated };
        // Refresh table row
        document.getElementById('paymentsTableBody').innerHTML = _renderPaymentRows(_allPayments);
        closePaymentModal();
        Helpers.showToast('Updated!', 'Payment record saved.', 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}
