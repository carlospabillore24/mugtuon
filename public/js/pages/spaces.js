function renderSpacesPage(app) {

    app.innerHTML = `
    ${renderHeader()}

    <section class="spaces-hero">
        <div class="container">
            <div class="section__eyebrow" style="text-align:center">Our Spaces</div>
            <h1 style="font-size:var(--text-4xl);text-align:center;max-width:700px;margin:0 auto var(--space-4)">Find your perfect <span style="color:var(--color-accent)">study spot</span></h1>
            <p style="text-align:center;color:var(--color-text-secondary);max-width:560px;margin:0 auto;font-size:var(--text-lg);line-height:var(--leading-relaxed)">
                From quiet solo desks to collaborative group tables and private meeting rooms. Reserve in seconds.
            </p>
        </div>
    </section>

    <section class="section" style="padding-top:var(--space-10)">
        <div class="container">
            <div id="spacesFilterBar" style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-8);justify-content:center">
                <button class="btn btn--accent btn--sm spaces-type-filter active" data-filter="all" onclick="_filterPublicSpaces('all',this)">All Spaces</button>
            </div>
            <div class="spaces-public-grid" id="spacesPublicGrid">
                <div style="text-align:center;padding:var(--space-12);color:var(--color-text-muted)">Loading spaces...</div>
            </div>
        </div>
    </section>

    <section class="section section--alt">
        <div class="container">
            <div class="section__header reveal">
                <div class="section__eyebrow">Amenities</div>
                <h2 class="section__title">Everything you need to focus</h2>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-6);max-width:800px;margin:0 auto">
                <div class="card reveal" style="text-align:center;padding:var(--space-6)">
                    <div style="font-size:28px;margin-bottom:var(--space-3)">💡</div>
                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Desk Lamps</div>
                </div>
                <div class="card reveal" style="text-align:center;padding:var(--space-6)">
                    <div style="font-size:28px;margin-bottom:var(--space-3)">📶</div>
                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">High-Speed WiFi</div>
                </div>
                <div class="card reveal" style="text-align:center;padding:var(--space-6)">
                    <div style="font-size:28px;margin-bottom:var(--space-3)">🔌</div>
                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Power Outlets</div>
                </div>
                <div class="card reveal" style="text-align:center;padding:var(--space-6)">
                    <div style="font-size:28px;margin-bottom:var(--space-3)">☕</div>
                    <div style="font-weight:var(--weight-semibold);font-size:var(--text-sm)">Coffee & Snacks</div>
                </div>
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <h2 class="cta-section__title reveal">Ready to study?</h2>
            <p class="cta-section__desc reveal">Book your space now and start your productive session.</p>
            <a href="${Store.isLoggedIn ? '/bookings' : '/register'}" data-link class="btn btn--primary btn--lg reveal">${Store.isLoggedIn ? 'Book Now' : 'Get Started Free'}</a>
        </div>
    </section>

    ${renderFooter()}
    `;

    initHeaderScroll();
    Helpers.observeReveal();

    // ── Load spaces from API ─────────────────────────────────────────────
    (async () => {
        try {
            const spaces = await API.get('/spaces');
            if (!spaces || !spaces.length) {
                document.getElementById('spacesPublicGrid').innerHTML = '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">No spaces available right now.</div>';
                return;
            }

            // Build filter buttons
            const types = [...new Set(spaces.map(s => s.type))];
            const filterBar = document.getElementById('spacesFilterBar');
            if (filterBar) {
                filterBar.innerHTML = `
                    <button class="btn btn--accent btn--sm spaces-type-filter active" data-filter="all" onclick="_filterPublicSpaces('all',this)">All Spaces</button>
                    ${types.map(type => `<button class="btn btn--outline btn--sm spaces-type-filter" data-filter="${type}" onclick="_filterPublicSpaces('${type}',this)">${type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</button>`).join('')}
                `;
            }

            // Render space cards
            const grid = document.getElementById('spacesPublicGrid');
            if (grid) {
                grid.innerHTML = spaces.map((s, i) => {
                    const amenities = Array.isArray(s.amenities) ? s.amenities :
                        (typeof s.amenities === 'string' ? (() => { try { return JSON.parse(s.amenities); } catch(e) { return []; } })() : []);
                    return `
                    <div class="spaces-public-card reveal" data-type="${s.type}" style="opacity:0;transform:translateY(16px)">
                        <div class="spaces-public-card__type">${s.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                        <h3 class="spaces-public-card__name">${Helpers.esc(s.name)}</h3>
                        <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-3)">${s.description || `${s.capacity} ${s.capacity > 1 ? 'people' : 'person'} capacity`}</p>
                        <div style="display:flex;flex-wrap:wrap;gap:var(--space-1);margin-bottom:var(--space-4)">
                            ${amenities.slice(0, 4).map(a => `<span class="badge badge--primary">${Helpers.esc(a)}</span>`).join('')}
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto">
                            <div style="font-size:var(--text-lg);font-weight:var(--weight-bold);color:var(--color-primary)">${Helpers.formatCurrency(s.hourly_rate)}<span style="font-size:var(--text-xs);font-weight:normal;color:var(--color-text-muted)">/hr</span></div>
                            <button class="btn btn--accent btn--sm" onclick="_bookSpaceAction('${s.id}')">Book Now</button>
                        </div>
                    </div>`;
                }).join('');

                // Staggered entrance — 60ms between cards, strong ease-out
                requestAnimationFrame(() => {
                    grid.querySelectorAll('.spaces-public-card').forEach((card, i) => {
                        setTimeout(() => {
                            card.style.transition = 'opacity 500ms cubic-bezier(0.23,1,0.32,1), transform 500ms cubic-bezier(0.23,1,0.32,1)';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 60 * i);
                    });
                });
            }
        } catch (e) {
            document.getElementById('spacesPublicGrid').innerHTML = '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted)">Could not load spaces.</div>';
        }
    })();
}

function _filterPublicSpaces(type, btn) {
    document.querySelectorAll('.spaces-type-filter').forEach(b => {
        b.classList.remove('active');
        b.className = b.className.replace('btn--accent', 'btn--outline');
    });
    btn.classList.add('active');
    btn.className = btn.className.replace('btn--outline', 'btn--accent');

    document.querySelectorAll('.spaces-public-card').forEach(card => {
        const show = type === 'all' || card.dataset.type === type;
        card.style.display = show ? '' : 'none';
    });
}

function _bookSpaceAction(spaceId) {
    if (Store.isLoggedIn) {
        Router.navigate('/bookings');
    } else {
        // Show sign-in prompt modal
        const modal = document.createElement('div');
        modal.id = 'auth-prompt-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1200;display:flex;align-items:center;justify-content:center;padding:var(--space-4);opacity:0;transition:opacity 250ms cubic-bezier(0.23,1,0.32,1)';
        modal.innerHTML = `
            <div style="background:var(--color-bg);border-radius:var(--radius-xl);width:100%;max-width:400px;box-shadow:var(--shadow-xl);overflow:hidden;transform:scale(0.95);opacity:0;transition:transform 300ms cubic-bezier(0.23,1,0.32,1),opacity 300ms cubic-bezier(0.23,1,0.32,1)" id="auth-prompt-inner" onclick="event.stopPropagation()">
                <div style="padding:var(--space-8);text-align:center">
                    <div style="width:56px;height:56px;border-radius:50%;background:rgba(0,66,57,0.08);display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto var(--space-4)">🔒</div>
                    <h3 style="margin-bottom:var(--space-2)">Sign in to book</h3>
                    <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-6)">Create a free account or sign in to reserve your study space.</p>
                    <div style="display:flex;flex-direction:column;gap:var(--space-3)">
                        <a href="/register" data-link class="btn btn--accent btn--lg btn--full" onclick="document.getElementById('auth-prompt-modal').remove()">Create Free Account</a>
                        <a href="/login" data-link class="btn btn--outline btn--lg btn--full" onclick="document.getElementById('auth-prompt-modal').remove()">Sign In</a>
                    </div>
                </div>
            </div>`;
        modal.onclick = () => {
            const inner = document.getElementById('auth-prompt-inner');
            if (inner) { inner.style.transform = 'scale(0.95)'; inner.style.opacity = '0'; }
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 250);
        };
        document.body.appendChild(modal);

        // Trigger entrance animation on next frame
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const inner = document.getElementById('auth-prompt-inner');
            if (inner) { inner.style.transform = 'scale(1)'; inner.style.opacity = '1'; }
        });
    }
}
