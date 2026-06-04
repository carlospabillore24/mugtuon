// Admin Spaces Management
let _adminSpaces = [];
let _spaceTypes  = [];

async function renderAdminSpacesPage(app) {
    app.innerHTML = renderAppLayout(
        `<div style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)">Loading spaces...</div>`,
        'Space Management', 'Add, edit, and manage bookable spaces'
    );

    try {
        [_adminSpaces, _spaceTypes] = await Promise.all([
            API.get('/admin/spaces').catch(() => []),
            API.get('/admin/space-types').catch(() => [])
        ]);
    } catch(e) {}

    _renderSpacesLayout(app);
}

function _getTypeMap() {
    const colors = {};
    const labels = {};
    _spaceTypes.forEach(t => { colors[t.name] = t.badge_color; labels[t.name] = t.label; });
    return { colors, labels };
}

function _renderSpacesLayout(app) {
    const { colors: typeColors, labels: typeLabel } = _getTypeMap();

    const rows = _adminSpaces.length === 0
        ? `<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">No spaces found. Add your first space.</td></tr>`
        : _adminSpaces.map(s => {
            const amenities = Array.isArray(s.amenities) ? s.amenities
                : JSON.parse(s.amenities || '[]');
            return `
            <tr id="space-row-${s.id}">
                <td>
                    <div style="font-weight:var(--weight-medium)">${s.name}</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${s.floor || '—'}</div>
                </td>
                <td><span class="badge badge--${typeColors[s.type] || 'primary'}">${typeLabel[s.type] || s.type}</span></td>
                <td style="text-align:center">${s.capacity} ${s.capacity > 1 ? 'people' : 'person'}</td>
                <td>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;max-width:200px">
                        ${amenities.slice(0,3).map(a => `<span class="badge badge--primary" style="font-size:10px">${a}</span>`).join('')}
                        ${amenities.length > 3 ? `<span style="font-size:var(--text-xs);color:var(--color-text-muted)">+${amenities.length - 3}</span>` : ''}
                    </div>
                </td>
                <td style="font-weight:var(--weight-semibold);color:var(--color-accent)">${Helpers.formatCurrency(s.hourly_rate)}<span style="font-size:var(--text-xs);font-weight:400;color:var(--color-text-muted)">/hr</span></td>
                <td>
                    <label class="toggle-switch" title="${s.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}">
                        <input type="checkbox" ${s.is_active ? 'checked' : ''} onchange="toggleSpaceActive('${s.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </td>
                <td>
                    <div style="display:flex;gap:var(--space-2)">
                        <button class="btn btn--outline btn--sm" onclick="openSpaceModal('${s.id}')">✏️ Edit</button>
                        <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="deleteSpace('${s.id}', '${s.name.replace(/'/g,"\\'")}')">🗑</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

    const content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-6)">
            <div>
                <span style="font-size:var(--text-sm);color:var(--color-text-muted)">${_adminSpaces.length} total · ${_adminSpaces.filter(s=>s.is_active).length} active</span>
            </div>
            <button class="btn btn--accent" onclick="openSpaceModal(null)">+ Add Space</button>
        </div>

        <div class="dashboard-card">
            <div class="dashboard-card__body" style="padding:0;overflow-x:auto">
                <table style="width:100%;border-collapse:collapse">
                    <thead>
                        <tr style="border-bottom:2px solid var(--color-border)">
                            <th style="padding:var(--space-3) var(--space-5);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Space</th>
                            <th style="padding:var(--space-3) var(--space-4);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Type</th>
                            <th style="padding:var(--space-3) var(--space-4);text-align:center;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Capacity</th>
                            <th style="padding:var(--space-3) var(--space-4);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Amenities</th>
                            <th style="padding:var(--space-3) var(--space-4);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Rate</th>
                            <th style="padding:var(--space-3) var(--space-4);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Active</th>
                            <th style="padding:var(--space-3) var(--space-5);text-align:left;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted)">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="spacesTableBody">
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Space Types Manager -->
        <div class="dashboard-card" style="margin-top:var(--space-8)">
            <div class="dashboard-card__header">
                <h3 class="dashboard-card__title">Space Types</h3>
                <span style="font-size:var(--text-xs);color:var(--color-text-muted)">${_spaceTypes.length} types · cannot delete types in use</span>
            </div>
            <div class="dashboard-card__body">
                <div id="spaceTypesList" style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-5)">
                    ${_spaceTypes.length === 0
                        ? '<span style="color:var(--color-text-muted);font-size:var(--text-sm)">No types yet.</span>'
                        : _spaceTypes.map(t => `
                            <div style="display:flex;align-items:center;gap:var(--space-2);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-full);padding:var(--space-1) var(--space-1) var(--space-1) var(--space-3)">
                                <span class="badge badge--${t.badge_color}">${t.label}</span>
                                <button class="btn btn--ghost btn--xs" style="border-radius:50%;width:22px;height:22px;padding:0;color:var(--color-text-muted)"
                                        onclick="deleteSpaceType(${t.id}, '${t.label.replace(/'/g,"\\'")}')">✕</button>
                            </div>`).join('')}
                </div>
                <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:flex-end">
                    <div class="form-group" style="margin:0;flex:1;min-width:160px">
                        <label class="form-label">Type Label</label>
                        <input type="text" class="form-input" id="newTypeLabel" placeholder="e.g. Hot Desk">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label class="form-label">Badge Color</label>
                        <select class="form-input" id="newTypeColor">
                            <option value="primary">Blue (Primary)</option>
                            <option value="accent">Teal (Accent)</option>
                            <option value="success">Green (Success)</option>
                            <option value="warning">Yellow (Warning)</option>
                            <option value="error">Red (Error)</option>
                        </select>
                    </div>
                    <button class="btn btn--accent" onclick="addSpaceType()" style="height:42px">+ Add Type</button>
                </div>
            </div>
        </div>

        <!-- Space Modal -->
        <div id="spaceModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;padding:var(--space-4)">
            <div style="background:var(--color-surface);border-radius:var(--radius-xl);width:100%;max-width:560px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-xl)">
                <div style="padding:var(--space-6);border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;align-items:center">
                    <h3 id="spaceModalTitle" style="font-size:var(--text-lg);font-weight:var(--weight-semibold)">Add Space</h3>
                    <button class="btn btn--ghost btn--sm" onclick="closeSpaceModal()">✕</button>
                </div>
                <form id="spaceForm" onsubmit="submitSpaceForm(event)" style="padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-5)">
                    <input type="hidden" id="spaceFormId">

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
                        <div class="form-group" style="grid-column:1/-1">
                            <label class="form-label">Space Name <span style="color:var(--color-error)">*</span></label>
                            <input type="text" class="form-input" id="spaceFormName" placeholder="e.g. Study Seat A3" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Type <span style="color:var(--color-error)">*</span></label>
                            <select class="form-input" id="spaceFormType" required>
                                ${_spaceTypes.map(t => `<option value="${t.name}">${t.label}</option>`).join('')}
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Floor</label>
                            <input type="text" class="form-input" id="spaceFormFloor" placeholder="e.g. 1st Floor">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Capacity <span style="color:var(--color-error)">*</span></label>
                            <input type="number" class="form-input" id="spaceFormCapacity" min="1" max="50" value="1" required>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Hourly Rate (₱)</label>
                            <input type="number" class="form-input" id="spaceFormRate" min="0" step="0.01" placeholder="0.00">
                        </div>

                        <div class="form-group" style="grid-column:1/-1">
                            <label class="form-label">Amenities <span style="font-size:var(--text-xs);color:var(--color-text-muted)">(comma-separated)</span></label>
                            <input type="text" class="form-input" id="spaceFormAmenities" placeholder="WiFi, Power Outlet, Monitor, Whiteboard">
                        </div>

                        <div class="form-group" style="grid-column:1/-1">
                            <label class="form-label">Description</label>
                            <textarea class="form-input" id="spaceFormDesc" rows="2" placeholder="Optional description..."></textarea>
                        </div>

                        <div class="form-group" style="grid-column:1/-1;display:flex;align-items:center;gap:var(--space-3)">
                            <label class="toggle-switch">
                                <input type="checkbox" id="spaceFormActive" checked>
                                <span class="toggle-slider"></span>
                            </label>
                            <span style="font-size:var(--text-sm)">Space is active (visible to users)</span>
                        </div>
                    </div>

                    <div style="display:flex;gap:var(--space-3);justify-content:flex-end;padding-top:var(--space-2)">
                        <button type="button" class="btn btn--outline" onclick="closeSpaceModal()">Cancel</button>
                        <button type="submit" class="btn btn--accent" id="spaceFormSubmitBtn">Save Space</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    app.innerHTML = renderAppLayout(content, 'Space Management', 'Add, edit, and manage bookable spaces');
}

function openSpaceModal(spaceId) {
    const modal = document.getElementById('spaceModal');
    const title = document.getElementById('spaceModalTitle');
    const form  = document.getElementById('spaceForm');
    form.reset();

    if (spaceId) {
        const s = _adminSpaces.find(x => x.id === spaceId);
        if (!s) return;
        title.textContent = 'Edit Space';
        document.getElementById('spaceFormId').value       = s.id;
        document.getElementById('spaceFormName').value     = s.name;
        document.getElementById('spaceFormType').value     = s.type;
        document.getElementById('spaceFormFloor').value    = s.floor || '';
        document.getElementById('spaceFormCapacity').value = s.capacity;
        document.getElementById('spaceFormRate').value     = s.hourly_rate || '';
        document.getElementById('spaceFormDesc').value     = s.description || '';
        document.getElementById('spaceFormActive').checked = s.is_active;
        const amenities = Array.isArray(s.amenities) ? s.amenities : JSON.parse(s.amenities || '[]');
        document.getElementById('spaceFormAmenities').value = amenities.join(', ');
    } else {
        title.textContent = 'Add Space';
        document.getElementById('spaceFormId').value = '';
        document.getElementById('spaceFormActive').checked = true;
    }

    modal.style.display = 'flex';
}

function closeSpaceModal() {
    const modal = document.getElementById('spaceModal');
    if (modal) modal.style.display = 'none';
}

async function submitSpaceForm(e) {
    e.preventDefault();
    const btn = document.getElementById('spaceFormSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = document.getElementById('spaceFormId').value;
    const payload = {
        name:        document.getElementById('spaceFormName').value.trim(),
        type:        document.getElementById('spaceFormType').value,
        floor:       document.getElementById('spaceFormFloor').value.trim(),
        capacity:    parseInt(document.getElementById('spaceFormCapacity').value) || 1,
        hourly_rate: parseFloat(document.getElementById('spaceFormRate').value) || 0,
        amenities:   document.getElementById('spaceFormAmenities').value,
        description: document.getElementById('spaceFormDesc').value.trim(),
        is_active:   document.getElementById('spaceFormActive').checked,
    };

    try {
        let saved;
        if (id) {
            saved = await API.put(`/admin/spaces/${id}`, payload);
            const idx = _adminSpaces.findIndex(s => s.id === id);
            if (idx !== -1) _adminSpaces[idx] = saved;
            Helpers.showToast('Updated!', `${saved.name} has been updated.`, 'success');
        } else {
            saved = await API.post('/admin/spaces', payload);
            _adminSpaces.push(saved);
            Helpers.showToast('Created!', `${saved.name} has been added.`, 'success');
        }
        closeSpaceModal();
        _refreshTable();
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Space';
    }
}

async function toggleSpaceActive(spaceId, isActive) {
    const space = _adminSpaces.find(s => s.id === spaceId);
    if (!space) return;
    try {
        const saved = await API.put(`/admin/spaces/${spaceId}`, { ...space, is_active: isActive });
        space.is_active = saved.is_active;
        Helpers.showToast(isActive ? 'Activated' : 'Deactivated', `${space.name} is now ${isActive ? 'active' : 'inactive'}.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function deleteSpace(spaceId, spaceName) {
    if (!await Helpers.confirmAction('Delete Space?', `Delete "${spaceName}"? If it has active bookings it will be deactivated instead.`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/spaces/${spaceId}`);
        _adminSpaces = _adminSpaces.filter(s => s.id !== spaceId);
        Helpers.showToast('Done', `${spaceName} removed.`, 'success');
        _refreshTable();
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

function _refreshTable() {
    const typeColors = { study_seat:'primary', private_room:'accent', coworking:'success', meeting_room:'warning' };
    const typeLabel  = { study_seat:'Study Seat', private_room:'Private Room', coworking:'Coworking', meeting_room:'Meeting Room' };
    const tbody = document.getElementById('spacesTableBody');
    if (!tbody) return;

    if (_adminSpaces.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">No spaces found. Add your first space.</td></tr>`;
        return;
    }

    tbody.innerHTML = _adminSpaces.map(s => {
        const amenities = Array.isArray(s.amenities) ? s.amenities : JSON.parse(s.amenities || '[]');
        return `
        <tr id="space-row-${s.id}">
            <td style="padding:var(--space-4) var(--space-5)">
                <div style="font-weight:var(--weight-medium)">${s.name}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${s.floor || '—'}</div>
            </td>
            <td style="padding:var(--space-4)"><span class="badge badge--${typeColors[s.type]||'primary'}">${typeLabel[s.type]||s.type}</span></td>
            <td style="padding:var(--space-4);text-align:center">${s.capacity} ${s.capacity>1?'people':'person'}</td>
            <td style="padding:var(--space-4)">
                <div style="display:flex;flex-wrap:wrap;gap:4px;max-width:200px">
                    ${amenities.slice(0,3).map(a=>`<span class="badge badge--primary" style="font-size:10px">${a}</span>`).join('')}
                    ${amenities.length>3?`<span style="font-size:var(--text-xs);color:var(--color-text-muted)">+${amenities.length-3}</span>`:''}
                </div>
            </td>
            <td style="padding:var(--space-4);font-weight:var(--weight-semibold);color:var(--color-accent)">${Helpers.formatCurrency(s.hourly_rate)}<span style="font-size:var(--text-xs);font-weight:400;color:var(--color-text-muted)">/hr</span></td>
            <td style="padding:var(--space-4)">
                <label class="toggle-switch">
                    <input type="checkbox" ${s.is_active?'checked':''} onchange="toggleSpaceActive('${s.id}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </td>
            <td style="padding:var(--space-4) var(--space-5)">
                <div style="display:flex;gap:var(--space-2)">
                    <button class="btn btn--outline btn--sm" onclick="openSpaceModal('${s.id}')">✏️ Edit</button>
                    <button class="btn btn--ghost btn--sm" style="color:var(--color-error)" onclick="deleteSpace('${s.id}','${s.name.replace(/'/g,"\\'")}')">🗑</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Update count
    const countEl = document.querySelector('[data-spaces-count]');
    if (countEl) countEl.textContent = `${_adminSpaces.length} total · ${_adminSpaces.filter(s=>s.is_active).length} active`;
}

// ── Space Types ──────────────────────────────────────────────────────────────

async function addSpaceType() {
    const label = document.getElementById('newTypeLabel')?.value.trim();
    const color = document.getElementById('newTypeColor')?.value || 'primary';
    if (!label) { Helpers.showToast('Required', 'Enter a type label.', 'error'); return; }

    try {
        const newType = await API.post('/admin/space-types', { label, badge_color: color });
        _spaceTypes.push(newType);
        document.getElementById('newTypeLabel').value = '';
        _refreshTypesList();
        _refreshTypeDropdown();
        Helpers.showToast('Added!', `"${newType.label}" type created.`, 'success');
    } catch(err) {
        Helpers.showToast('Error', err.message, 'error');
    }
}

async function deleteSpaceType(typeId, typeLabel) {
    if (!await Helpers.confirmAction('Delete Type?', `Delete type "${typeLabel}"? This will fail if any spaces use it.`, { confirmText: 'Delete', type: 'danger' })) return;
    try {
        await API.delete(`/admin/space-types/${typeId}`);
        _spaceTypes = _spaceTypes.filter(t => t.id !== typeId);
        _refreshTypesList();
        _refreshTypeDropdown();
        Helpers.showToast('Deleted', `"${typeLabel}" type removed.`, 'success');
    } catch(err) {
        Helpers.showToast('Cannot Delete', err.message, 'error');
    }
}

function _refreshTypesList() {
    const container = document.getElementById('spaceTypesList');
    if (!container) return;
    if (_spaceTypes.length === 0) {
        container.innerHTML = '<span style="color:var(--color-text-muted);font-size:var(--text-sm)">No types yet.</span>';
        return;
    }
    container.innerHTML = _spaceTypes.map(t => `
        <div style="display:flex;align-items:center;gap:var(--space-2);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-full);padding:var(--space-1) var(--space-1) var(--space-1) var(--space-3)">
            <span class="badge badge--${t.badge_color}">${t.label}</span>
            <button class="btn btn--ghost btn--xs" style="border-radius:50%;width:22px;height:22px;padding:0;color:var(--color-text-muted)"
                    onclick="deleteSpaceType(${t.id}, '${t.label.replace(/'/g,"\\'")}')">✕</button>
        </div>`).join('');
}

function _refreshTypeDropdown() {
    const sel = document.getElementById('spaceFormType');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = _spaceTypes.map(t =>
        `<option value="${t.name}" ${t.name === current ? 'selected' : ''}>${t.label}</option>`
    ).join('');
}

// Close modal when clicking backdrop
document.addEventListener('click', e => {
    const modal = document.getElementById('spaceModal');
    if (modal && e.target === modal) closeSpaceModal();
});
