let _adminBookings = [];
let _bookingPage = 1;
const _bookingLimit = 25;

async function renderAdminBookingsPage(app) {
    const today = new Date().toISOString().split('T')[0];
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading bookings...</div>`,
        'Booking Management', 'View and manage all bookings across spaces'
    );
    _bookingPage = 1;
    await loadAdminBookings(today, '', app);
}

async function loadAdminBookings(date, status, app, page) {
    if (page) _bookingPage = page;
    let data = { bookings: [], total: 0, page: _bookingPage, limit: _bookingLimit };
    try {
        let qs = [`page=${_bookingPage}`, `limit=${_bookingLimit}`];
        if (date)   qs.push(`date=${date}`);
        if (status) qs.push(`status=${status}`);
        data = await API.get(`/admin/bookings?${qs.join('&')}`);
        _adminBookings = data.bookings;
    } catch(e) { _adminBookings = []; }

    const bookings = _adminBookings;
    const totalPages = Math.ceil((data.total || bookings.length) / _bookingLimit);
    const today    = new Date().toISOString().split('T')[0];
    const todayBks = bookings.filter(b => b.booking_date && b.booking_date.startsWith(today));
    const checkedIn= todayBks.filter(b => b.status === 'checked_in').length;
    const todayRev = todayBks.reduce((s,b) => s + parseFloat(b.total_amount||0), 0);
    const noShows  = bookings.filter(b => b.status === 'no_show').length;

    const statusMap = {
        pending:'warning', confirmed:'accent', checked_in:'success',
        completed:'primary', cancelled:'error', no_show:'error'
    };

    const content = `
        <div class="dashboard-stats">
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Showing Bookings</span>
                    <span class="dashboard-stat-card__icon">📅</span>
                </div>
                <div class="dashboard-stat-card__value">${bookings.length}</div>
                <div class="dashboard-stat-card__change">${checkedIn} checked in today</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Today's Bookings</span>
                    <span class="dashboard-stat-card__icon">📊</span>
                </div>
                <div class="dashboard-stat-card__value">${todayBks.length}</div>
                <div class="dashboard-stat-card__change">${checkedIn} checked in</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">Revenue Today</span>
                    <span class="dashboard-stat-card__icon">💰</span>
                </div>
                <div class="dashboard-stat-card__value">${Helpers.formatCurrency(todayRev)}</div>
                <div class="dashboard-stat-card__change">From ${todayBks.length} bookings</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-card__header">
                    <span class="dashboard-stat-card__label">No Shows</span>
                    <span class="dashboard-stat-card__icon">⚠️</span>
                </div>
                <div class="dashboard-stat-card__value">${noShows}</div>
                <div class="dashboard-stat-card__change" style="color:var(--color-error)">In results</div>
            </div>
        </div>

        <!-- QR Check-In Card -->
        <div class="dashboard-card" style="margin-bottom:var(--space-6)">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">QR Check-In</h3>
            </div>
            <div class="dashboard-card__body">
                <div style="display:flex;gap:var(--space-3);align-items:flex-end">
                    <div class="form-group" style="flex:1;margin:0">
                        <label class="form-label">Scan or paste QR code</label>
                        <input type="text" class="form-input" id="qrCodeInput" placeholder="Paste booking QR code here...">
                    </div>
                    <button class="btn btn--accent" onclick="verifyQRCode()">Verify</button>
                    <button class="btn btn--outline" onclick="toggleQRScanner()" id="qrScannerBtn" aria-label="Open camera scanner">📷 Scan</button>
                </div>
                <div id="qrScannerContainer" style="display:none;margin-top:var(--space-4)">
                    <div id="qrReader" style="width:100%;max-width:400px;margin:0 auto"></div>
                    <div style="text-align:center;margin-top:var(--space-2)">
                        <button class="btn btn--ghost btn--sm" onclick="stopQRScanner()">Close Scanner</button>
                    </div>
                </div>
                <div id="qrResult" style="margin-top:var(--space-4)"></div>
            </div>
        </div>

        <!-- Walk-in Booking Card -->
        <div class="dashboard-card" style="margin-bottom:var(--space-6)">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">Walk-in Booking</h3>
            </div>
            <div class="dashboard-card__body">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);align-items:flex-end">
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Guest Name *</label>
                        <input type="text" class="form-input" id="walkinName" placeholder="Guest name">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Email (optional)</label>
                        <input type="email" class="form-input" id="walkinEmail" placeholder="guest@email.com">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Space *</label>
                        <select class="form-input" id="walkinSpace">
                            <option value="">Select space...</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Date *</label>
                        <input type="date" class="form-input" id="walkinDate" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Start *</label>
                        <select class="form-input" id="walkinStart">
                            ${Array.from({length:19},(_,i)=>i+10).map(h=>`<option value="${String(h%24).padStart(2,'0')}:00">${String(h%24).padStart(2,'0')}:00</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">End *</label>
                        <select class="form-input" id="walkinEnd">
                            ${Array.from({length:19},(_,i)=>i+11).map(h=>`<option value="${String(h%24).padStart(2,'0')}:00">${String(h%24).padStart(2,'0')}:00</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="margin-top:var(--space-3);display:flex;gap:var(--space-3);align-items:center">
                    <input type="text" class="form-input" id="walkinNotes" placeholder="Notes (optional)" style="flex:1">
                    <button class="btn btn--accent" onclick="submitWalkinBooking()">Create Walk-in</button>
                </div>
            </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5);flex-wrap:wrap;gap:var(--space-3)">
            <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
                <input type="text" class="form-input" placeholder="Search bookings..." style="width:240px" oninput="filterBookingRows(this.value)">
                <input type="date" class="form-input" style="width:170px" value="${date}"
                       onchange="loadAdminBookings(this.value, document.getElementById('statusFilter')?.value||'', document.getElementById('app')||document.body)">
                <select class="form-input" style="width:150px" id="statusFilter"
                        onchange="loadAdminBookings(document.querySelector('[type=date]')?.value||'', this.value, document.getElementById('app')||document.body)">
                    <option value="">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked_in">Checked In</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                </select>
            </div>
            <button class="btn btn--outline btn--sm" onclick="exportBookingsCSV()">Export CSV</button>
        </div>

        <div id="bulkBar" style="display:none;background:var(--color-accent);color:white;padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);margin-bottom:var(--space-4);display:none;align-items:center;gap:var(--space-4);flex-wrap:wrap">
            <span id="bulkCount" style="font-size:var(--text-sm);font-weight:var(--weight-semibold)">0 selected</span>
            <button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" onclick="bulkBookingAction('confirmed')">Confirm</button>
            <button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" onclick="bulkBookingAction('checked_in')">Check In</button>
            <button class="btn btn--sm" style="background:rgba(255,255,255,.2);color:white;border:1px solid rgba(255,255,255,.3)" onclick="bulkBookingAction('cancelled')">Cancel</button>
            <button class="btn btn--ghost btn--sm" style="color:white;margin-left:auto" onclick="clearBulkSelection()">Clear</button>
        </div>

        <div class="dashboard-card">
            <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                <table class="data-table" id="bookingsTable">
                    <thead>
                        <tr>
                            <th style="width:36px"><input type="checkbox" onchange="toggleAllBookings(this.checked)" style="accent-color:var(--color-accent)"></th>
                            <th>Guest</th><th>Space</th><th>Date</th><th>Time</th>
                            <th>Amount</th><th>Status</th><th>Notes</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.length === 0
                            ? `<tr><td colspan="9" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted)">No bookings found.</td></tr>`
                            : bookings.map(b => {
                                const actions = _getBookingActions(b);
                                return `
                                <tr data-bookingid="${b.id}">
                                    <td><input type="checkbox" class="bulk-check" data-id="${b.id}" onchange="updateBulkBar()" style="accent-color:var(--color-accent)"></td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:var(--space-2)">
                                            <div class="avatar avatar--sm">${Helpers.getInitials(b.first_name, b.last_name)}</div>
                                            <div>
                                                <div style="font-weight:var(--weight-medium);font-size:var(--text-sm)">${Helpers.esc(b.first_name)} ${Helpers.esc(b.last_name)}</div>
                                                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.esc(b.email)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${b.space_name||'—'}</td>
                                    <td>${b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : '—'}</td>
                                    <td style="white-space:nowrap">${b.start_time} – ${b.end_time}</td>
                                    <td style="font-weight:var(--weight-medium)">${Helpers.formatCurrency(b.total_amount||0)}</td>
                                    <td><span class="badge badge--${statusMap[b.status]||'primary'}" id="bstatus-${b.id}">${b.status}</span></td>
                                    <td style="font-size:var(--text-xs);color:var(--color-text-muted);max-width:140px">${Helpers.esc(b.notes) || '—'}</td>
                                    <td>
                                        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
                                            ${actions}
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('')}
                    </tbody>
                </table>
            </div>
            ${totalPages > 1 ? `
            <div style="display:flex;justify-content:center;align-items:center;gap:var(--space-3);padding:var(--space-4);border-top:1px solid var(--color-border)">
                <button class="btn btn--outline btn--sm" onclick="loadAdminBookings('','',document.getElementById('app'),${_bookingPage-1})"
                        ${_bookingPage <= 1 ? 'disabled' : ''}>← Prev</button>
                <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Page ${_bookingPage} of ${totalPages}</span>
                <button class="btn btn--outline btn--sm" onclick="loadAdminBookings('','',document.getElementById('app'),${_bookingPage+1})"
                        ${_bookingPage >= totalPages ? 'disabled' : ''}>Next →</button>
            </div>` : ''}
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Booking Management', 'View and manage all bookings across spaces');

    // Populate walk-in space dropdown
    (async () => {
        try {
            const spaces = await API.get('/spaces');
            const sel = document.getElementById('walkinSpace');
            if (sel) {
                sel.innerHTML = '<option value="">Select space...</option>' +
                    spaces.map(s => `<option value="${s.id}">${s.name} (${s.type.replace(/_/g,' ')})</option>`).join('');
            }
        } catch(e) {}
    })();
}

async function submitWalkinBooking() {
    const name = document.getElementById('walkinName')?.value?.trim();
    const email = document.getElementById('walkinEmail')?.value?.trim();
    const spaceId = document.getElementById('walkinSpace')?.value;
    const date = document.getElementById('walkinDate')?.value;
    const start = document.getElementById('walkinStart')?.value;
    const end = document.getElementById('walkinEnd')?.value;
    const notes = document.getElementById('walkinNotes')?.value?.trim();

    if (!name || !spaceId || !date || !start || !end) {
        Helpers.showToast('Missing Fields', 'Please fill in guest name, space, date, and time.', 'error');
        return;
    }
    if (start >= end) {
        Helpers.showToast('Invalid Time', 'End time must be after start time.', 'error');
        return;
    }

    try {
        const result = await API.post('/admin/bookings/walkin', {
            guestName: name, guestEmail: email, spaceId,
            bookingDate: date, startTime: start, endTime: end, notes
        });
        Helpers.showToast('Walk-in Created', `Booking for ${name} at ${result.space_name} confirmed.`, 'success');
        document.getElementById('walkinName').value = '';
        document.getElementById('walkinEmail').value = '';
        document.getElementById('walkinNotes').value = '';
        loadAdminBookings('', '', document.getElementById('app'));
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

function _getBookingActions(b) {
    const btns = [];
    if (b.status === 'pending')     btns.push(`<button class="btn btn--ghost btn--sm" style="color:var(--color-accent)" onclick="updateBookingStatus('${b.id}','confirmed')">Confirm</button>`);
    if (b.status === 'confirmed')   btns.push(`<button class="btn btn--ghost btn--sm" style="color:var(--color-success)" onclick="updateBookingStatus('${b.id}','checked_in')">Check In</button>`);
    if (b.status === 'checked_in')  btns.push(`<button class="btn btn--ghost btn--sm" style="color:var(--color-primary)" onclick="updateBookingStatus('${b.id}','completed')">Complete</button>`);
    if (b.status === 'confirmed')   btns.push(`<button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="updateBookingStatus('${b.id}','no_show')">No Show</button>`);
    if (['pending','confirmed'].includes(b.status)) btns.push(`<button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="updateBookingStatus('${b.id}','cancelled')">Cancel</button>`);
    if (btns.length === 0) btns.push(`<span style="font-size:var(--text-xs);color:var(--color-text-muted)">—</span>`);
    return btns.join('');
}

function filterBookingRows(query) {
    document.querySelectorAll('#bookingsTable tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
    });
}

async function updateBookingStatus(bookingId, newStatus) {
    if (newStatus === 'cancelled' && !await Helpers.confirmAction('Cancel Booking?', 'Cancel this booking?', { confirmText: 'Yes, Cancel', type: 'warning' })) return;
    if (newStatus === 'no_show' && !await Helpers.confirmAction('No-Show?', 'Mark this booking as a no-show?', { confirmText: 'Confirm', type: 'warning' })) return;

    try {
        const updated = await API.put(`/admin/bookings/${bookingId}/status`, { status: newStatus });
        // Update local cache
        const idx = _adminBookings.findIndex(b => b.id === bookingId);
        if (idx !== -1) _adminBookings[idx].status = newStatus;

        // Refresh the row in-place
        const badge = document.getElementById(`bstatus-${bookingId}`);
        const statusMap = { pending:'warning', confirmed:'accent', checked_in:'success', completed:'primary', cancelled:'error', no_show:'error' };
        if (badge) {
            badge.className = `badge badge--${statusMap[newStatus]||'primary'}`;
            badge.textContent = newStatus;
        }
        // Update action buttons
        const row = document.querySelector(`tr[data-bookingid="${bookingId}"]`);
        if (row) {
            const actionsCell = row.querySelector('td:last-child div');
            if (actionsCell) actionsCell.innerHTML = _getBookingActions({ ...(_adminBookings[idx] || {}), status: newStatus });
        }

        Helpers.showToast('Updated', `Booking status changed to ${newStatus.replace('_',' ')}.`, 'success');
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ── QR Check-In Verification ──────────────────────────────────────────────

async function verifyQRCode() {
    const input = document.getElementById('qrCodeInput');
    const resultEl = document.getElementById('qrResult');
    const code = (input?.value || '').trim();
    if (!code) { Helpers.showToast('Error', 'Please enter a QR code.', 'error'); return; }

    resultEl.innerHTML = `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">Verifying...</div>`;
    try {
        const data = await API.get(`/bookings/verify/${code}`);
        const b = data.booking;
        const statusMap = { pending:'warning', confirmed:'accent', checked_in:'success', completed:'primary', cancelled:'error', no_show:'error' };
        resultEl.innerHTML = `
            <div style="padding:var(--space-4);background:var(--color-surface);border-radius:var(--radius-md);border:1px solid var(--color-border)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3)">
                    <strong>${Helpers.esc(b.first_name)} ${Helpers.esc(b.last_name)}</strong>
                    <span class="badge badge--${statusMap[b.status]||'primary'}">${b.status}</span>
                </div>
                <div style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-3)">
                    ${b.space_name} &middot; ${b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : ''} &middot; ${b.start_time} – ${b.end_time}
                </div>
                ${b.status === 'confirmed'
                    ? `<button class="btn btn--accent btn--sm" onclick="updateBookingStatus('${b.id}','checked_in');document.getElementById('qrResult').innerHTML='<div style=\\'color:var(--color-success);font-weight:600;padding:var(--space-3)\\'>Checked in successfully!</div>'">Check In Now</button>`
                    : b.status === 'checked_in'
                        ? `<div style="color:var(--color-success);font-weight:var(--weight-semibold)">Already checked in</div>`
                        : `<div style="color:var(--color-text-muted)">Cannot check in — status is ${b.status}</div>`}
            </div>`;
    } catch (err) {
        resultEl.innerHTML = `<div style="color:var(--color-error);font-size:var(--text-sm)">${Helpers.esc(err.message)}</div>`;
    }
}

// ── CSV Export ────────────────────────────────────────────────────────────

async function exportBookingsCSV() {
    Helpers.showToast('Exporting', 'Fetching all bookings...', 'info');
    let allBookings = _adminBookings;
    try {
        const data = await API.get('/admin/bookings?limit=10000');
        allBookings = data.bookings || allBookings;
    } catch(e) {}
    if (!allBookings.length) { Helpers.showToast('No data', 'No bookings to export.', 'info'); return; }
    const headers = ['Guest Name', 'Email', 'Space', 'Date', 'Start', 'End', 'Amount', 'Status', 'Notes'];
    const rows = allBookings.map(b => [
        `"${b.first_name} ${b.last_name}"`, `"${b.email}"`, `"${b.space_name||''}"`,
        b.booking_date ? b.booking_date.slice(0,10) : '',
        b.start_time, b.end_time,
        b.total_amount || 0, b.status,
        `"${(b.notes || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bookings-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Helpers.showToast('Exported', `${allBookings.length} bookings exported.`, 'success');
}

// ── Bulk Actions ────────────────────────────────────────────────────────

function toggleAllBookings(checked) {
    document.querySelectorAll('.bulk-check').forEach(cb => { cb.checked = checked; });
    updateBulkBar();
}

function updateBulkBar() {
    const checked = document.querySelectorAll('.bulk-check:checked');
    const bar = document.getElementById('bulkBar');
    const count = document.getElementById('bulkCount');
    if (bar) bar.style.display = checked.length > 0 ? 'flex' : 'none';
    if (count) count.textContent = `${checked.length} selected`;
}

function clearBulkSelection() {
    document.querySelectorAll('.bulk-check').forEach(cb => { cb.checked = false; });
    const headerCb = document.querySelector('#bookingsTable thead input[type=checkbox]');
    if (headerCb) headerCb.checked = false;
    updateBulkBar();
}

async function bulkBookingAction(newStatus) {
    const ids = [...document.querySelectorAll('.bulk-check:checked')].map(cb => cb.dataset.id);
    if (ids.length === 0) return;
    if (!await Helpers.confirmAction('Bulk Update?', `Set ${ids.length} booking(s) to "${newStatus.replace('_',' ')}"?`, { confirmText: 'Update All', type: 'warning' })) return;

    let success = 0;
    for (const id of ids) {
        try {
            await API.put(`/admin/bookings/${id}/status`, { status: newStatus });
            success++;
        } catch(e) {}
    }
    Helpers.showToast('Bulk Update', `${success} of ${ids.length} bookings updated to ${newStatus.replace('_',' ')}.`, 'success');
    loadAdminBookings('', '', document.getElementById('app'));
}

// ── Camera QR Scanner ────────────────────────────────────────────────────

let _qrScanner = null;

function toggleQRScanner() {
    const container = document.getElementById('qrScannerContainer');
    if (!container) return;

    if (container.style.display === 'none') {
        container.style.display = 'block';
        startQRScanner();
    } else {
        stopQRScanner();
    }
}

async function startQRScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        Helpers.showToast('Error', 'QR scanner library not loaded.', 'error');
        stopQRScanner();
        return;
    }

    try {
        _qrScanner = new Html5Qrcode('qrReader');
        await _qrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
                const input = document.getElementById('qrCodeInput');
                if (input) input.value = decodedText;
                stopQRScanner();
                verifyQRCode();
            },
            () => {}
        );
        const btn = document.getElementById('qrScannerBtn');
        if (btn) btn.textContent = '⏹ Stop';
    } catch (err) {
        Helpers.showToast('Camera Error', 'Could not access camera. Please paste the QR code manually.', 'error');
        stopQRScanner();
    }
}

async function stopQRScanner() {
    if (_qrScanner) {
        try { await _qrScanner.stop(); } catch(e) {}
        try { _qrScanner.clear(); } catch(e) {}
        _qrScanner = null;
    }
    const container = document.getElementById('qrScannerContainer');
    if (container) container.style.display = 'none';
    const reader = document.getElementById('qrReader');
    if (reader) reader.innerHTML = '';
    const btn = document.getElementById('qrScannerBtn');
    if (btn) btn.textContent = '📷 Scan';
}
