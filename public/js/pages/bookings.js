// Bookings page state
let selectedSpaceId = null;
let selectedSpaceName = '';
let selectedSpaceRate = 0;
let selectedSlots = [];
let _cachedSpaces = [];
let _allUserBookings = [];
let _bookingHistoryPage = 1;
const _bookingHistoryLimit = 10;

async function renderBookingsPage(app) {
    selectedSpaceId = null;
    selectedSpaceName = '';
    selectedSpaceRate = 0;
    selectedSlots = [];
    _cachedSpaces = [];
    _allUserBookings = [];
    _bookingHistoryPage = 1;

    const _n = new Date(); const today = _n.getFullYear() + '-' + String(_n.getMonth() + 1).padStart(2, '0') + '-' + String(_n.getDate()).padStart(2, '0');

    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading spaces...</div>`,
        'Book a Space', 'Find and reserve your perfect study spot'
    );

    let spaces = [];
    let bookedSlotsForDate = [];

    try {
        const [spacesData, userBookings] = await Promise.all([
            API.get(`/spaces?date=${today}`),
            API.get('/bookings').catch(() => [])
        ]);
        spaces = spacesData;
        _cachedSpaces = spaces;
        _allUserBookings = userBookings;

        // Build booked slots from ALL users on the selected date (from space data)
        bookedSlotsForDate = _getBookedSlotsFromSpaces(spaces, today);
    } catch(e) {
        spaces = _cachedSpaces;
    }

    _renderBookingLayout(app, spaces, bookedSlotsForDate, today);
}

function _getBookedSlotsFromSpaces(spaces, date) {
    // If a space is selected, show its booked slots; otherwise no slots shown
    if (!selectedSpaceId) return [];
    const space = spaces.find(s => s.id === selectedSpaceId);
    if (!space || !space.booked_slots) return [];
    const slots = [];
    for (const b of space.booked_slots) {
        const startH = parseInt(b.start_time);
        const endH = parseInt(b.end_time);
        for (let h = startH; h < endH; h++) {
            slots.push(`${String(h).padStart(2, '0')}:00`);
        }
    }
    return slots;
}

function _isSlotPast(slot, dateVal) {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    if (dateVal !== todayStr) return false;
    return parseInt(slot) <= now.getHours();
}

function _renderBookingLayout(app, spaces, bookedSlots, today) {
    const timeSlots = [];
    for (let h = 10; h <= 28; h++) timeSlots.push(`${String(h % 24).padStart(2,'0')}:00`);

    const spacesHtml = spaces.map(s => {
        const amenities = Array.isArray(s.amenities) ? s.amenities :
                          (typeof s.amenities === 'string' ? JSON.parse(s.amenities || '[]') : []);
        return `
            <div class="space-card" data-type="${s.type}" data-id="${s.id}"
                 onclick="selectSpace('${s.id}', '${s.name.replace(/'/g,"\\'")}', ${s.hourly_rate})">
                <div class="space-card__type">${s.type.replace(/_/g,' ')}</div>
                <h3 class="space-card__name">${s.name}</h3>
                <div class="space-card__meta">${s.floor || ''} &middot; ${s.capacity} ${s.capacity > 1 ? 'people' : 'person'}</div>
                <div style="display:flex;flex-wrap:wrap;gap:var(--space-1);margin-bottom:var(--space-3)">
                    ${amenities.map(a => `<span class="badge badge--primary">${a}</span>`).join('')}
                </div>
                <div class="space-card__price">${Helpers.formatCurrency(s.hourly_rate)}<span>/hr</span></div>
            </div>`;
    }).join('');

    const recentHtml = _renderBookingHistory();

    const content = `
        <div style="position:relative;width:100%;height:0;padding-top:100%;box-shadow:0 2px 8px 0 rgba(63,69,81,0.16);margin-bottom:var(--space-8);overflow:hidden;border-radius:var(--radius-lg);will-change:transform">
            <iframe loading="lazy" style="position:absolute;width:100%;height:100%;top:0;left:0;border:none;padding:0;margin:0"
                src="https://www.canva.com/design/DAHI25uoaRk/AY4BCaFIx_r0gYDAHJKdrQ/view?embed" allowfullscreen="allowfullscreen" allow="fullscreen">
            </iframe>
        </div>

        <div class="booking-layout">
            <div>
                <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-6)">
                    <button class="btn btn--accent btn--sm booking-filter active" data-filter="all" onclick="filterSpaces('all',this)">All Spaces</button>
                    ${[...new Set(spaces.map(s => s.type))].map(type =>
                        `<button class="btn btn--outline btn--sm booking-filter" data-filter="${type}" onclick="filterSpaces('${type}',this)">${type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</button>`
                    ).join('')}
                </div>
                <div class="space-grid" id="spaceGrid">${spacesHtml}</div>
            </div>

            <div class="booking-summary">
                <div class="dashboard-card">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">Booking Summary</h3>
                    </div>
                    <div class="dashboard-card__body">
                        <div class="form-group">
                            <label class="form-label">Selected Space</label>
                            <div id="selectedSpaceName" style="font-weight:var(--weight-medium);color:var(--color-text-muted)">Select a space</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Date</label>
                            <input type="date" class="form-input" id="bookingDate" value="${today}" min="${today}"
                                   onchange="onDateChange(this.value)">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Time Slots (select start hours)</label>
                            <div class="time-slots" id="timeSlots">
                                ${timeSlots.map(t => {
                                    const booked = bookedSlots.includes(t);
                                    const past = _isSlotPast(t, today);
                                    const disabled = booked || past;
                                    const cls = booked ? 'time-slot--booked' : past ? 'time-slot--past' : '';
                                    const title = booked ? 'Already booked' : past ? 'Time has passed' : '';
                                    return `<div class="time-slot ${cls}"
                                         onclick="${disabled ? '' : `toggleTimeSlot('${t}',this)`}"
                                         ${title ? `title="${title}"` : ''}>
                                        ${t}
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Notes (optional)</label>
                            <input type="text" class="form-input" id="bookingNotes" placeholder="e.g. Need power outlet, group of 3...">
                        </div>
                        <hr class="divider">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-5)">
                            <span style="font-size:var(--text-sm);color:var(--color-text-muted)">Total</span>
                            <span id="bookingTotal" style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-primary)">₱0.00</span>
                        </div>
                        <button class="btn btn--accent btn--lg btn--full" id="confirmBookingBtn" onclick="showBookingConfirmModal()">Confirm Booking</button>
                    </div>
                </div>

                <div class="dashboard-card" style="margin-top:var(--space-6)">
                    <div class="dashboard-card__header">
                        <h3 class="dashboard-card__title">My Bookings</h3>
                        <select class="form-input" style="width:130px;padding:4px 8px;font-size:var(--text-xs);height:auto" id="bookingStatusFilter" onchange="filterBookingHistory(this.value)">
                            <option value="">All</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked In</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    <div class="dashboard-card__body" style="padding:0" id="recentBookingsList">
                        ${recentHtml}
                    </div>
                </div>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Book a Space', 'Find and reserve your perfect study spot');
}

function toggleTimeSlot(time, el) {
    el.classList.toggle('selected');
    if (el.classList.contains('selected')) {
        selectedSlots.push(time);
    } else {
        selectedSlots = selectedSlots.filter(t => t !== time);
    }
    selectedSlots.sort();
    updateBookingTotal();
}

function updateBookingTotal() {
    const total = selectedSlots.length * selectedSpaceRate;
    const el = document.getElementById('bookingTotal');
    if (el) el.textContent = Helpers.formatCurrency(total);
}

function filterSpaces(type, btn) {
    document.querySelectorAll('.booking-filter').forEach(b => {
        b.classList.remove('active');
        b.className = b.className.replace('btn--accent','btn--outline');
    });
    btn.classList.add('active');
    btn.className = btn.className.replace('btn--outline','btn--accent');
    document.querySelectorAll('.space-card').forEach(card => {
        card.style.display = (type === 'all' || card.dataset.type === type) ? '' : 'none';
    });
}

async function onDateChange(dateVal) {
    if (!selectedSpaceId) return;
    try {
        // Fetch ALL bookings for this space+date (all users)
        const slots = await API.get(`/spaces/${selectedSpaceId}/availability?date=${dateVal}`);
        const bookedTimes = new Set();
        for (const s of slots) {
            const startH = parseInt(s.start_time);
            const endH = parseInt(s.end_time);
            for (let h = startH; h < endH; h++) {
                bookedTimes.add(`${String(h).padStart(2, '0')}:00`);
            }
        }
        document.querySelectorAll('.time-slot').forEach(el => {
            const t = el.textContent.trim();
            const past = _isSlotPast(t, dateVal);
            if (bookedTimes.has(t)) {
                el.className = 'time-slot time-slot--booked';
                el.onclick = null;
                el.title = 'Already booked';
            } else if (past) {
                el.className = 'time-slot time-slot--past';
                el.onclick = null;
                el.title = 'Time has passed';
            } else {
                el.className = 'time-slot';
                el.onclick = () => toggleTimeSlot(t, el);
                el.title = '';
            }
        });
        selectedSlots = [];
        updateBookingTotal();
    } catch(e) {}
}

function selectSpace(id, name, rate) {
    selectedSpaceId = id;
    selectedSpaceName = name;
    selectedSpaceRate = parseFloat(rate);
    const el = document.getElementById('selectedSpaceName');
    if (el) { el.textContent = name; el.style.color = 'var(--color-text)'; }
    document.querySelectorAll('.space-card').forEach(c => c.classList.remove('selected'));
    const card = document.querySelector(`.space-card[data-id="${id}"]`);
    if (card) card.classList.add('selected');
    updateBookingTotal();
    // Refresh time slots for this space
    const dateVal = document.getElementById('bookingDate')?.value;
    if (dateVal) onDateChange(dateVal);
}

// ── Booking confirmation modal (Fix 6) ───────────────────────────────────

function showBookingConfirmModal() {
    if (!selectedSpaceId) {
        Helpers.showToast('Select a Space', 'Please choose a space before booking.', 'error'); return;
    }
    if (selectedSlots.length === 0) {
        Helpers.showToast('Select Time', 'Please select at least one time slot.', 'error'); return;
    }
    const date = document.getElementById('bookingDate')?.value;
    if (!date) { Helpers.showToast('Select Date', 'Please pick a date.', 'error'); return; }
    const _n = new Date(); const today = _n.getFullYear() + '-' + String(_n.getMonth() + 1).padStart(2, '0') + '-' + String(_n.getDate()).padStart(2, '0');
    if (date < today) { Helpers.showToast('Invalid Date', 'Cannot book for a past date.', 'error'); return; }

    for (let i = 1; i < selectedSlots.length; i++) {
        if (parseInt(selectedSlots[i]) !== parseInt(selectedSlots[i - 1]) + 1) {
            Helpers.showToast('Invalid Selection', 'Please select consecutive time slots.', 'error');
            return;
        }
    }

    const startTime = selectedSlots[0];
    const lastHour = parseInt(selectedSlots[selectedSlots.length - 1]) + 1;
    const endTime = `${String(lastHour).padStart(2, '0')}:00`;
    const total = selectedSlots.length * selectedSpaceRate;
    const dateFormatted = new Date(date + 'T00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    let modal = document.getElementById('confirm-booking-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-booking-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1100;display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:420px;box-shadow:var(--shadow-xl)" onclick="event.stopPropagation()">
            <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border)">
                <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold);margin-bottom:var(--space-1)">Confirm Booking</h3>
                <p style="font-size:var(--text-sm);color:var(--color-text-muted)">Review your booking details before confirming.</p>
            </div>
            <div style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)">
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm)">
                    <span style="color:var(--color-text-muted)">Space</span>
                    <span style="font-weight:var(--weight-semibold)">${selectedSpaceName}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm)">
                    <span style="color:var(--color-text-muted)">Date</span>
                    <span style="font-weight:var(--weight-medium)">${dateFormatted}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm)">
                    <span style="color:var(--color-text-muted)">Time</span>
                    <span style="font-weight:var(--weight-medium)">${startTime} – ${endTime} (${selectedSlots.length}h)</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:var(--text-sm)">
                    <span style="color:var(--color-text-muted)">Rate</span>
                    <span>${Helpers.formatCurrency(selectedSpaceRate)}/hr</span>
                </div>
                <hr class="divider">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:var(--weight-semibold)">Total</span>
                    <span style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-accent)">${Helpers.formatCurrency(total)}</span>
                </div>
                <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">
                    <button class="btn btn--outline" style="flex:1" onclick="document.getElementById('confirm-booking-modal').style.display='none'">Cancel</button>
                    <button class="btn btn--accent" style="flex:1" id="modalConfirmBtn" onclick="confirmBooking()">Confirm & Book</button>
                </div>
            </div>
        </div>`;
    modal.style.display = 'flex';
    modal.onclick = () => { modal.style.display = 'none'; };
}

async function confirmBooking() {
    const date = document.getElementById('bookingDate')?.value;
    const startTime = selectedSlots[0];
    const lastHour = parseInt(selectedSlots[selectedSlots.length - 1]) + 1;
    const endTime = `${String(lastHour).padStart(2, '0')}:00`;

    const btn = document.getElementById('modalConfirmBtn');
    if (btn) { btn.textContent = 'Booking...'; btn.disabled = true; }

    try {
        await API.post('/bookings', {
            spaceId: selectedSpaceId,
            bookingDate: date,
            startTime,
            endTime,
            notes: document.getElementById('bookingNotes')?.value?.trim() || ''
        });

        // Close modal
        const modal = document.getElementById('confirm-booking-modal');
        if (modal) modal.style.display = 'none';

        Helpers.showToast('Booking Confirmed!', `${selectedSpaceName} booked for ${selectedSlots.length} hour(s) on ${date}.`, 'success');

        // Reset state
        selectedSpaceId = null; selectedSpaceName = ''; selectedSpaceRate = 0; selectedSlots = [];
        document.querySelectorAll('.space-card').forEach(c => c.classList.remove('selected'));
        document.querySelectorAll('.time-slot.selected').forEach(t => t.classList.remove('selected'));
        const nameEl = document.getElementById('selectedSpaceName');
        if (nameEl) { nameEl.textContent = 'Select a space'; nameEl.style.color = 'var(--color-text-muted)'; }
        updateBookingTotal();

        // Reload full bookings list
        _allUserBookings = await API.get('/bookings').catch(() => []);
        _bookingHistoryPage = 1;
        _refreshBookingHistory();
    } catch (err) {
        Helpers.showToast('Booking Failed', err.message, 'error');
        if (btn) { btn.textContent = 'Confirm & Book'; btn.disabled = false; }
    }
}

async function cancelBooking(bookingId) {
    if (!await Helpers.confirmAction('Cancel Booking?', 'This will cancel your reservation. This action cannot be undone.', { confirmText: 'Yes, Cancel', type: 'warning' })) return;
    try {
        await API.put(`/bookings/${bookingId}/cancel`, {});
        Helpers.showToast('Cancelled', 'Booking cancelled successfully.', 'success');
        _allUserBookings = await API.get('/bookings').catch(() => []);
        _refreshBookingHistory();
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

// ── Booking history with pagination (Fix 5) ──────────────────────────────

function _renderBookingHistory() {
    const filtered = _bookingStatusFilter
        ? _allUserBookings.filter(b => b.status === _bookingStatusFilter)
        : _allUserBookings;
    const start = (_bookingHistoryPage - 1) * _bookingHistoryLimit;
    const page = filtered.slice(start, start + _bookingHistoryLimit);
    const totalPages = Math.ceil(filtered.length / _bookingHistoryLimit);

    if (filtered.length === 0) {
        return `<div style="padding:var(--space-4);text-align:center;color:var(--color-text-muted);font-size:var(--text-sm)">No bookings yet.</div>`;
    }

    let html = page.map(b => `
        <div style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border-light);display:flex;justify-content:space-between;align-items:center">
            <div>
                <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${b.space_name || 'Space'}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">
                    ${b.booking_date ? new Date(b.booking_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}, ${b.start_time} – ${b.end_time}
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-2)">
                <span class="badge badge--${b.status === 'confirmed' ? 'success' : b.status === 'checked_in' ? 'accent' : b.status === 'cancelled' ? 'error' : 'primary'}">${b.status}</span>
                ${b.status === 'confirmed' ? `<button class="btn btn--ghost btn--xs" onclick="showBookingQR('${b.id}')" title="Show QR" aria-label="Show QR code">📱</button>` : ''}
                ${b.status === 'confirmed' ? `<button class="btn btn--ghost btn--xs" onclick="showGroupModal('${b.id}')" title="Group members" aria-label="Manage group members">👥</button>` : ''}
                ${b.status === 'confirmed' ? `<button class="btn btn--ghost btn--xs" onclick="showRescheduleModal('${b.id}','${b.booking_date}','${b.start_time}','${b.end_time}')" title="Reschedule" aria-label="Reschedule booking">✏️</button>` : ''}
                ${b.status === 'confirmed' ? `<button class="btn btn--ghost btn--xs" onclick="cancelBooking('${b.id}')" title="Cancel" aria-label="Cancel booking">✕</button>` : ''}
            </div>
        </div>`).join('');

    if (totalPages > 1) {
        html += `<div style="display:flex;justify-content:center;align-items:center;gap:var(--space-3);padding:var(--space-3);border-top:1px solid var(--color-border)">
            <button class="btn btn--ghost btn--xs" onclick="changeBookingHistoryPage(${_bookingHistoryPage - 1})" ${_bookingHistoryPage <= 1 ? 'disabled' : ''}>Prev</button>
            <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${_bookingHistoryPage}/${totalPages}</span>
            <button class="btn btn--ghost btn--xs" onclick="changeBookingHistoryPage(${_bookingHistoryPage + 1})" ${_bookingHistoryPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>`;
    }
    return html;
}

function changeBookingHistoryPage(page) {
    _bookingHistoryPage = page;
    _refreshBookingHistory();
}

function _refreshBookingHistory() {
    const el = document.getElementById('recentBookingsList');
    if (el) el.innerHTML = _renderBookingHistory();
}

let _bookingStatusFilter = '';

function filterBookingHistory(status) {
    _bookingStatusFilter = status;
    _bookingHistoryPage = 1;
    _refreshBookingHistory();
}

function showRescheduleModal(bookingId, currentDate, currentStart, currentEnd) {
    let modal = document.getElementById('reschedule-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reschedule-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1100;display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
        document.body.appendChild(modal);
    }

    const _n = new Date(); const today = _n.getFullYear() + '-' + String(_n.getMonth() + 1).padStart(2, '0') + '-' + String(_n.getDate()).padStart(2, '0');
    const timeSlots = [];
    for (let h = 10; h <= 28; h++) timeSlots.push(`${String(h % 24).padStart(2,'0')}:00`);

    modal.innerHTML = `
        <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:440px;box-shadow:var(--shadow-xl)" onclick="event.stopPropagation()">
            <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">✏️ Reschedule Booking</h3>
                <button class="btn btn--ghost btn--sm" onclick="document.getElementById('reschedule-modal').style.display='none'">✕</button>
            </div>
            <div style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-4)">
                <div class="form-group">
                    <label class="form-label">New Date</label>
                    <input type="date" class="form-input" id="rescheduleDate" value="${currentDate}" min="${today}">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                    <div class="form-group">
                        <label class="form-label">Start Time</label>
                        <select class="form-input" id="rescheduleStart">
                            ${timeSlots.map(t => `<option value="${t}"${t===currentStart?' selected':''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">End Time</label>
                        <select class="form-input" id="rescheduleEnd">
                            ${timeSlots.map(t => `<option value="${t}"${t===currentEnd?' selected':''}>${t}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div id="rescheduleError" class="form-error" style="display:none"></div>
                <div style="display:flex;gap:var(--space-3);justify-content:flex-end">
                    <button class="btn btn--outline" onclick="document.getElementById('reschedule-modal').style.display='none'">Cancel</button>
                    <button class="btn btn--accent" id="rescheduleBtn" onclick="submitReschedule('${bookingId}')">Save Changes</button>
                </div>
            </div>
        </div>`;
    modal.style.display = 'flex';
    modal.onclick = () => { modal.style.display = 'none'; };
}

async function submitReschedule(bookingId) {
    const btn = document.getElementById('rescheduleBtn');
    const errEl = document.getElementById('rescheduleError');
    errEl.style.display = 'none';
    const bookingDate = document.getElementById('rescheduleDate').value;
    const startTime = document.getElementById('rescheduleStart').value;
    const endTime = document.getElementById('rescheduleEnd').value;

    if (startTime >= endTime) {
        errEl.textContent = 'End time must be after start time';
        errEl.style.display = 'block';
        return;
    }
    btn.textContent = 'Saving...'; btn.disabled = true;
    try {
        await API.put(`/bookings/${bookingId}/reschedule`, { bookingDate, startTime, endTime });
        document.getElementById('reschedule-modal').style.display = 'none';
        Helpers.showToast('Rescheduled!', 'Your booking has been updated.', 'success');
        _allUserBookings = await API.get('/bookings').catch(() => []);
        _refreshBookingHistory();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.textContent = 'Save Changes'; btn.disabled = false;
    }
}

async function showBookingQR(bookingId) {
    let modal = document.getElementById('qr-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'qr-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1100;display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:360px;box-shadow:var(--shadow-xl);text-align:center" onclick="event.stopPropagation()">
            <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                <h3 style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">Your QR Code</h3>
                <button class="btn btn--ghost btn--sm" onclick="document.getElementById('qr-modal').style.display='none'">✕</button>
            </div>
            <div style="padding:var(--space-6)" id="qrModalBody">
                <div style="color:var(--color-text-muted);font-size:var(--text-sm)">Loading QR code...</div>
            </div>
        </div>`;
    modal.style.display = 'flex';
    modal.onclick = () => { modal.style.display = 'none'; };

    try {
        const data = await API.get(`/bookings/${bookingId}/qr`);
        document.getElementById('qrModalBody').innerHTML = `
            <img src="${data.qr}" alt="Booking QR Code" style="width:240px;height:240px;margin:0 auto var(--space-4);display:block">
            <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-2)">Show this code at the front desk to check in.</p>
            <div style="font-size:var(--text-xs);color:var(--color-text-muted);word-break:break-all;background:var(--color-surface);padding:var(--space-2);border-radius:var(--radius-sm)">${data.code}</div>`;
    } catch (err) {
        document.getElementById('qrModalBody').innerHTML = `<div style="color:var(--color-error)">${Helpers.esc(err.message)}</div>`;
    }
}

// ── Group Members Modal ─────────────────────────────────────────────────

async function showGroupModal(bookingId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const closeModal = () => { modal.classList.remove('active'); setTimeout(() => modal.remove(), 200); };
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    modal.innerHTML = `
        <div class="modal" style="max-width:480px">
            <div class="modal__header">
                <h3>👥 Group Members</h3>
                <button class="btn btn--ghost btn--sm" id="grpCloseBtn">✕</button>
            </div>
            <div class="modal__body" id="groupModalBody">
                <div style="text-align:center;color:var(--color-text-muted)">Loading...</div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#grpCloseBtn').onclick = closeModal;
    requestAnimationFrame(() => modal.classList.add('active'));

    await refreshGroupMembers(bookingId);
}

async function refreshGroupMembers(bookingId) {
    const body = document.getElementById('groupModalBody');
    if (!body) return;

    let members = [];
    try { members = await API.get(`/bookings/${bookingId}/members`); } catch(e) {}

    body.innerHTML = `
        <div style="margin-bottom:var(--space-4)">
            <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-3)">Add people who will join this booking session.</p>
            <div style="display:flex;gap:var(--space-2);align-items:flex-end">
                <div class="form-group" style="flex:1;margin:0">
                    <label class="form-label">Name *</label>
                    <input type="text" class="form-input" id="grpMemberName" placeholder="Member name">
                </div>
                <div class="form-group" style="flex:1;margin:0">
                    <label class="form-label">Email (optional)</label>
                    <input type="email" class="form-input" id="grpMemberEmail" placeholder="email@example.com">
                </div>
                <button class="btn btn--accent btn--sm" onclick="addGroupMember('${bookingId}')">Add</button>
            </div>
        </div>
        ${members.length > 0 ? `
            <div style="border-top:1px solid var(--color-border);padding-top:var(--space-3)">
                <div style="font-size:var(--text-sm);font-weight:var(--weight-semibold);margin-bottom:var(--space-2)">${members.length} member${members.length !== 1 ? 's' : ''}</div>
                ${members.map(m => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border)">
                        <div>
                            <div style="font-size:var(--text-sm);font-weight:var(--weight-medium)">${Helpers.esc(m.member_name)}</div>
                            ${m.member_email ? `<div style="font-size:var(--text-xs);color:var(--color-text-muted)">${Helpers.esc(m.member_email)}</div>` : ''}
                        </div>
                        <button class="btn btn--ghost btn--xs" style="color:var(--color-error)" onclick="removeGroupMember('${bookingId}',${m.id})" aria-label="Remove member">✕</button>
                    </div>
                `).join('')}
            </div>
        ` : `<div style="text-align:center;color:var(--color-text-muted);font-size:var(--text-sm);padding:var(--space-4)">No group members yet.</div>`}
    `;
}

async function addGroupMember(bookingId) {
    const name = document.getElementById('grpMemberName')?.value?.trim();
    const email = document.getElementById('grpMemberEmail')?.value?.trim();
    if (!name) { Helpers.showToast('Error', 'Member name is required.', 'error'); return; }
    try {
        await API.post(`/bookings/${bookingId}/members`, { members: [{ name, email }] });
        await refreshGroupMembers(bookingId);
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function removeGroupMember(bookingId, memberId) {
    try {
        await API.delete(`/bookings/${bookingId}/members/${memberId}`);
        await refreshGroupMembers(bookingId);
    } catch (err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}
