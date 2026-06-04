async function renderPricingPage(app) {
    // Render full page immediately with a loading placeholder for the cards
    app.innerHTML = `
    ${renderHeader()}

    <section class="about-hero">
        <div class="container">
            <div class="section__eyebrow">Pricing</div>
            <h1 class="about-hero__title">Simple, transparent pricing</h1>
            <p class="about-hero__desc">Choose the plan that fits your study style. Upgrade or downgrade anytime.</p>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="pricing-grid" style="max-width:1060px" id="pricing-cards">
                ${[1,2,3].map(() => `
                <div class="pricing-card reveal" style="opacity:.4;pointer-events:none">
                    <div style="height:24px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-4)"></div>
                    <div style="height:48px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>
                    <div style="height:16px;width:60%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-6)"></div>
                    ${[1,2,3,4,5].map(() => `<div style="height:14px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>`).join('')}
                </div>`).join('')}
            </div>
        </div>
    </section>

    <section class="section section--alt">
        <div class="container container--narrow">
            <div class="section__header reveal">
                <h2 class="section__title">Frequently asked questions</h2>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-4)">
                <div class="card reveal">
                    <h4 style="margin-bottom:var(--space-2)">Can I switch plans anytime?</h4>
                    <p style="color:var(--color-text-secondary);font-size:var(--text-sm)">Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.</p>
                </div>
                <div class="card reveal">
                    <h4 style="margin-bottom:var(--space-2)">Is there a free trial?</h4>
                    <p style="color:var(--color-text-secondary);font-size:var(--text-sm)">The Scholar plan comes with a 7-day free trial. No credit card required to start.</p>
                </div>
                <div class="card reveal">
                    <h4 style="margin-bottom:var(--space-2)">What payment methods do you accept?</h4>
                    <p style="color:var(--color-text-secondary);font-size:var(--text-sm)">We accept GCash, credit/debit cards, and bank transfers. Cash payments are also accepted at our physical locations.</p>
                </div>
                <div class="card reveal">
                    <h4 style="margin-bottom:var(--space-2)">Do you offer student discounts?</h4>
                    <p style="color:var(--color-text-secondary);font-size:var(--text-sm)">Yes! Students with a valid school ID get 20% off any paid plan. Contact us with your student verification.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <h2 class="cta-section__title reveal">Ready to boost your productivity?</h2>
            <p class="cta-section__desc reveal">Start with our free Explorer plan and upgrade anytime.</p>
            <a href="/register" data-link class="btn btn--primary btn--lg reveal">Get Started Free</a>
        </div>
    </section>

    ${renderFooter()}
    `;

    initHeaderScroll();
    Helpers.observeReveal();

    // Fetch plans from the API and replace the skeleton
    try {
        const plans = await API.get('/plans');
        const grid = document.getElementById('pricing-cards');
        if (!grid || !plans || plans.length === 0) return;

        grid.innerHTML = plans.map(plan => {
            const isFree     = parseFloat(plan.price) === 0;
            const isFeatured = plan.is_featured;
            const features   = Array.isArray(plan.features)
                ? plan.features
                : JSON.parse(plan.features || '[]');

            const priceHTML = isFree
                ? `<div class="pricing-card__price">Free</div>`
                : `<div class="pricing-card__price">&#8369;${Number(plan.price).toLocaleString()}<span>${Helpers.billingLabel(plan.billing_period)}</span></div>`;

            const btnClass = isFeatured ? 'btn--accent' : 'btn--outline';
            let btnHref;
            if (plan.button_text === 'Contact Sales') {
                btnHref = '/contact';
            } else if (isFree) {
                btnHref = '/register';
            } else if (Store.isLoggedIn) {
                btnHref = `/checkout?plan=${plan.id}`;
            } else {
                btnHref = `/register?plan=${plan.id}`;
            }

            return `
            <div class="pricing-card ${isFeatured ? 'pricing-card--featured' : ''} reveal">
                ${plan.badge_text ? `<div class="pricing-card__badge">${plan.badge_text}</div>` : ''}
                <h3 class="pricing-card__name">${plan.name}</h3>
                ${priceHTML}
                <p class="pricing-card__desc">${plan.description || ''}</p>
                <ul class="pricing-card__features">
                    ${features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <a href="${btnHref}" data-link class="btn ${btnClass} btn--full">${plan.button_text || 'Get Started'}</a>
            </div>`;
        }).join('');

        // Re-observe new elements for scroll animations
        Helpers.observeReveal();

    } catch (err) {
        // Fallback: show static plans if API is unavailable
        console.warn('Could not load plans from API, showing static fallback:', err.message);
        const grid = document.getElementById('pricing-cards');
        if (grid) {
            grid.innerHTML = `
            <div class="pricing-card reveal">
                <h3 class="pricing-card__name">Explorer</h3>
                <div class="pricing-card__price">Free</div>
                <p class="pricing-card__desc">Try MugTuon risk-free</p>
                <ul class="pricing-card__features">
                    <li>1 booking per day</li><li>Basic study timer</li>
                    <li>Community leaderboard</li><li>2 hours max per session</li>
                </ul>
                <a href="/register" data-link class="btn btn--outline btn--full">Get Started</a>
            </div>
            <div class="pricing-card pricing-card--featured reveal">
                <div class="pricing-card__badge">Most Popular</div>
                <h3 class="pricing-card__name">Scholar</h3>
                <div class="pricing-card__price">&#8369;499<span>/mo</span></div>
                <p class="pricing-card__desc">For serious students</p>
                <ul class="pricing-card__features">
                    <li>5 bookings per day</li><li>All timer modes</li>
                    <li>Study analytics</li><li>Priority booking</li><li>8 hours max per day</li>
                </ul>
                <a href="/register" data-link class="btn btn--accent btn--full">Get Started</a>
            </div>
            <div class="pricing-card reveal">
                <h3 class="pricing-card__name">Pro</h3>
                <div class="pricing-card__price">&#8369;999<span>/mo</span></div>
                <p class="pricing-card__desc">For professionals &amp; teams</p>
                <ul class="pricing-card__features">
                    <li>Unlimited bookings</li><li>Private rooms access</li>
                    <li>Advanced analytics</li><li>Priority support</li><li>Unlimited hours</li>
                </ul>
                <a href="/contact" data-link class="btn btn--outline btn--full">Contact Sales</a>
            </div>`;
            Helpers.observeReveal();
        }
    }
}
