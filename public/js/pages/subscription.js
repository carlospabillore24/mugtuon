async function renderSubscriptionPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading subscription...</div>`,
        'My Subscription',
        'Manage your membership plan'
    );

    let sub = { plan: { name: 'Explorer', price: 0, features: [], expires_at: null, cancelled_at: null }, payments: [] };
    try {
        sub = await API.get('/users/subscription');
    } catch (e) {
        Helpers.showToast('Error', 'Failed to load subscription data', 'error');
    }

    const p = sub.plan;
    const isFree = !p.id || p.price === 0;
    const isCancelled = !!p.cancelled_at;
    const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
    const planIcon = isFree ? '✨' : '🎓';
    const planColor = isFree ? 'var(--color-text-secondary)' : 'var(--color-accent)';
    const expiryDate = p.expires_at
        ? new Date(p.expires_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';

    const defaultExplorerFeatures = ['1 booking per day', 'Basic study timer', 'Community leaderboard', 'Access to community areas'];
    let features = Array.isArray(p.features) ? p.features : [];
    if (features.length === 0 && (!p.id || p.price === 0)) features = defaultExplorerFeatures;
    const featuresList = features.length > 0
        ? features.map(f => `
            <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0">
                <span style="color:var(--color-success);font-size:var(--text-sm)">&#10003;</span>
                <span style="font-size:var(--text-sm)">${f}</span>
            </div>`).join('')
        : `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">Basic access included</div>`;

    let expiryInfo = '';
    let statusBadge = '';
    let actionButtons = '';

    if (isFree) {
        expiryInfo = '<span style="font-size:var(--text-sm);color:var(--color-text-secondary)">Free forever</span>';
        statusBadge = '<span class="badge badge--primary">Free</span>';
        actionButtons = `<a href="/pricing" data-link class="btn btn--accent">Upgrade Now</a>`;
    } else if (isExpired) {
        expiryInfo = `<span style="font-size:var(--text-sm);color:var(--color-error);font-weight:var(--weight-medium)">Expired ${expiryDate}</span>`;
        statusBadge = '<span class="badge badge--error">Expired</span>';
        actionButtons = `<a href="/pricing" data-link class="btn btn--accent">Renew Subscription</a>`;
    } else if (isCancelled) {
        expiryInfo = `<span style="font-size:var(--text-sm);color:var(--color-warning);font-weight:var(--weight-medium)">Cancels ${expiryDate}</span>`;
        statusBadge = '<span class="badge badge--warning">Cancelling</span>';
        actionButtons = `<button class="btn btn--accent" onclick="reactivateSubscription()">Reactivate</button>
                         <a href="/pricing" data-link class="btn btn--outline">Change Plan</a>`;
    } else {
        expiryInfo = p.expires_at
            ? `<span style="font-size:var(--text-sm);color:var(--color-text-secondary)">Renews ${expiryDate}</span>`
            : '';
        statusBadge = '<span class="badge badge--success">Active</span>';
        actionButtons = `<a href="/pricing" data-link class="btn btn--outline">Change Plan</a>
                         <button class="btn btn--ghost" style="color:var(--color-error)" onclick="cancelSubscription()">Cancel Subscription</button>`;
    }

    const cancelNote = isCancelled && !isExpired
        ? `<div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-4);margin-bottom:var(--space-5);font-size:var(--text-sm);color:var(--color-text-secondary)">
               Your plan remains active until <strong>${expiryDate}</strong>. After that, you'll be moved to the free Explorer plan. You can reactivate anytime before then.
           </div>`
        : '';

    const content = `
        <div style="max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:var(--space-6)">
            <div class="dashboard-card">
                <div class="dashboard-card__header">
                    <h3 class="dashboard-card__title">Current Plan</h3>
                    ${statusBadge}
                </div>
                <div class="dashboard-card__body">
                    <div style="display:flex;align-items:center;gap:var(--space-4);margin-bottom:var(--space-5)">
                        <div style="width:56px;height:56px;border-radius:var(--radius-lg);background:var(--color-bg);border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">${planIcon}</div>
                        <div style="flex:1">
                            <div style="font-weight:var(--weight-bold);font-size:var(--text-xl);color:${planColor}">${p.name}</div>
                            ${expiryInfo}
                        </div>
                        ${!isFree ? `
                        <div style="text-align:right">
                            <div style="font-weight:var(--weight-bold);font-size:var(--text-xl);color:var(--color-accent)">&#8369;${Number(p.price).toLocaleString()}</div>
                            <div style="font-size:var(--text-xs);color:var(--color-text-secondary)">/${p.billing_period || 'month'}</div>
                        </div>` : ''}
                    </div>

                    ${cancelNote}

                    ${p.description ? `<p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4)">${p.description}</p>` : ''}

                    <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4);margin-bottom:var(--space-5)">
                        <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm);margin-bottom:var(--space-2)">Plan Features</div>
                        ${featuresList}
                    </div>

                    <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
                        ${actionButtons}
                    </div>
                </div>
            </div>

            <div class="dashboard-card">
                <div class="dashboard-card__header">
                    <h3 class="dashboard-card__title">Payment History</h3>
                    <span class="badge badge--primary">${sub.payments.length} record${sub.payments.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                    ${sub.payments.length === 0
                        ? `<div style="padding:var(--space-6);text-align:center;color:var(--color-text-muted);font-size:var(--text-sm)">No membership payments yet.</div>`
                        : `<table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Method</th>
                                    <th>Reference</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sub.payments.map(pay => {
                                    const badge = { completed: 'success', pending: 'warning', failed: 'error', refunded: 'error' }[pay.status] || 'primary';
                                    return `<tr>
                                        <td style="font-size:var(--text-sm)">${Helpers.formatDate(pay.created_at)}</td>
                                        <td style="font-size:var(--text-sm);text-transform:capitalize">${pay.payment_method || '—'}</td>
                                        <td style="font-size:var(--text-xs);color:var(--color-text-muted)">${pay.reference_number || '—'}</td>
                                        <td style="font-weight:var(--weight-semibold)">${Helpers.formatCurrency(pay.amount)}</td>
                                        <td><span class="badge badge--${badge}">${pay.status}</span></td>
                                        <td>${pay.status === 'completed' ? `<button class="btn btn--ghost btn--xs" onclick="downloadReceipt(${JSON.stringify(pay).replace(/"/g,'&quot;')}, '${p.name}')">📄</button>` : ''}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>`}
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'My Subscription', 'Manage your membership plan');
}

async function cancelSubscription() {
    if (!await Helpers.confirmAction('Cancel Subscription?', 'Your plan will remain active until the current billing period ends.', { confirmText: 'Yes, Cancel', type: 'warning' })) return;
    try {
        await API.post('/users/subscription/cancel');
        Helpers.showToast('Cancelled', 'Your subscription will end at the current billing period.', 'success');
        Router.navigate('/subscription');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

function downloadReceipt(payment, planName) {
    const user = Store.get('user');
    const date = Helpers.formatDate(payment.created_at);
    const receiptHTML = `
<!DOCTYPE html>
<html><head><title>Receipt</title>
<style>
    body { font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #1a1612; }
    .header { text-align: center; border-bottom: 2px solid #543020; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #543020; margin: 0; font-size: 24px; }
    .header p { color: #6b5e54; margin: 5px 0 0; font-size: 14px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8e3df; font-size: 14px; }
    .row .label { color: #6b5e54; }
    .row .value { font-weight: 600; }
    .total { display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; font-size: 18px; font-weight: 700; border-top: 2px solid #543020; }
    .total .amount { color: #004239; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #9b8e84; }
    @media print { body { margin: 0; } }
</style></head><body>
    <div class="header">
        <h1>MugTuon Learning Hub & Cafe</h1>
        <p>Payment Receipt</p>
    </div>
    <div class="row"><span class="label">Receipt No.</span><span class="value">${payment.id ? payment.id.slice(0, 8).toUpperCase() : 'N/A'}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
    <div class="row"><span class="label">Customer</span><span class="value">${user?.first_name || ''} ${user?.last_name || ''}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${user?.email || ''}</span></div>
    <div class="row"><span class="label">Plan</span><span class="value">${planName}</span></div>
    <div class="row"><span class="label">Payment Method</span><span class="value" style="text-transform:capitalize">${payment.payment_method || 'N/A'}</span></div>
    <div class="row"><span class="label">Reference No.</span><span class="value">${payment.reference_number || 'N/A'}</span></div>
    <div class="row"><span class="label">Status</span><span class="value" style="color:#1a7a5c">Completed</span></div>
    <div class="total"><span>Total Paid</span><span class="amount">PHP ${Number(payment.amount).toLocaleString(undefined, {minimumFractionDigits:2})}</span></div>
    <div class="footer">
        <p>Thank you for your payment!</p>
        <p>MugTuon Learning Hub & Cafe &bull; mugtuonlhc@gmail.com</p>
    </div>
</body></html>`;

    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
        w.onload = () => { w.print(); };
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function reactivateSubscription() {
    try {
        await API.post('/users/subscription/reactivate');
        Helpers.showToast('Reactivated', 'Your subscription is active again.', 'success');
        Router.navigate('/subscription');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}
