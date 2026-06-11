function renderHomePage(app) {
    const barHeights = Helpers.generateMockChartBars(12);

    app.innerHTML = `
    ${renderHeader()}

    <section class="hero" style="position:relative;overflow:hidden">
        <img src="images/hero-cafe.jpg" alt="" id="heroParallaxBg" style="position:absolute;inset:0;width:100%;height:120%;object-fit:cover;z-index:0;will-change:transform">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(242,240,235,0.86) 0%,rgba(242,240,235,0.94) 100%);z-index:1"></div>
        <div class="container" style="position:relative;z-index:2">
            <div class="hero__inner">
                <div class="hero__content">
                    <div class="hero__eyebrow hero-animate" style="opacity:0;transform:translateY(12px)" id="hero-active-now">
                        <span style="width:8px;height:8px;border-radius:50%;background:#00a862;display:inline-block"></span>
                        <span id="hero-active-count">Study smarter, together</span>
                    </div>

                    <h1 class="hero__title hero-animate" style="opacity:0;transform:translateY(16px)">
                        Study Smarter,<br>
                        <span>Together.</span>
                    </h1>

                    <p class="hero__desc hero-animate" style="opacity:0;transform:translateY(16px)">
                        MugTuon is your premium study hub and coworking cafe. Book spaces, track your focus, compete on leaderboards, and fuel your productivity with great coffee.
                    </p>

                    <div class="hero__actions hero-animate" style="opacity:0;transform:translateY(16px)">
                        <a href="/register" data-link class="btn btn--accent btn--lg">Start for Free</a>
                        <a href="/pricing" data-link class="btn btn--outline btn--lg">View Plans</a>
                    </div>

                    <div class="hero__stats hero-animate" style="opacity:0;transform:translateY(16px)">
                        <div>
                            <div class="hero__stat-value" data-counter="0">&mdash;</div>
                            <div class="hero__stat-label">Active Members</div>
                        </div>
                        <div>
                            <div class="hero__stat-value" data-counter="0">&mdash;</div>
                            <div class="hero__stat-label">Study Hours Logged</div>
                        </div>
                        <div>
                            <div class="hero__stat-value" data-counter="0">&mdash;</div>
                            <div class="hero__stat-label">Bookings Today</div>
                        </div>
                    </div>
                </div>

                <div class="hero__visual hero-animate" style="opacity:0;transform:translateY(24px)">
                    <div class="hero__dashboard-preview">
                        <div class="mock-header">
                            <div class="mock-dots">
                                <div class="mock-dot mock-dot--red"></div>
                                <div class="mock-dot mock-dot--yellow"></div>
                                <div class="mock-dot mock-dot--green"></div>
                            </div>
                            <span style="font-size:12px;color:var(--color-text-muted)">Live Community</span>
                        </div>
                        <div class="mock-stats">
                            <div class="mock-stat-card">
                                <div class="mock-stat-card__label">Members</div>
                                <div class="mock-stat-card__value" id="hero-mock-members">—</div>
                            </div>
                            <div class="mock-stat-card">
                                <div class="mock-stat-card__label">Studying Now</div>
                                <div class="mock-stat-card__value" id="hero-mock-active">—</div>
                            </div>
                            <div class="mock-stat-card">
                                <div class="mock-stat-card__label">Study Hours</div>
                                <div class="mock-stat-card__value" id="hero-mock-hours">—</div>
                            </div>
                        </div>
                        <div class="mock-chart">
                            ${barHeights.map(h => `<div class="mock-bar" style="height:${h}%"></div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="section__header reveal">
                <div class="section__eyebrow">Features</div>
                <h2 class="section__title">Everything you need to focus</h2>
                <p class="section__desc">A complete productivity ecosystem designed for students and professionals who want to do their best work.</p>
            </div>

            <div class="features-grid">
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--booking">📅</div>
                    <h3 class="feature-card__title">Smart Booking</h3>
                    <p class="feature-card__desc">Reserve study seats, private rooms, and coworking spaces with real-time availability and QR check-in.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--gamify">🏆</div>
                    <h3 class="feature-card__title">Gamification</h3>
                    <p class="feature-card__desc">Earn XP, unlock achievements, maintain study streaks, and compete on leaderboards with the community.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--analytics">📊</div>
                    <h3 class="feature-card__title">Study Analytics</h3>
                    <p class="feature-card__desc">Track your productivity with detailed session analytics, focus scores, and study pattern insights.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--timer">⏱</div>
                    <h3 class="feature-card__title">Focus Timer</h3>
                    <p class="feature-card__desc">Built-in Pomodoro and Deep Work timers with session tracking and focus scoring.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--community">👥</div>
                    <h3 class="feature-card__title">Community Leaderboard</h3>
                    <p class="feature-card__desc">Compete on weekly and monthly leaderboards, maintain study streaks, and stay motivated alongside fellow learners.</p>
                </div>
                <div class="feature-card reveal">
                    <div class="feature-card__icon feature-card__icon--cafe">☕</div>
                    <h3 class="feature-card__title">Cafe & Workspace</h3>
                    <p class="feature-card__desc">Premium coffee and snacks available on-site to fuel your study sessions in a comfortable environment.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="live-stats">
        <div class="container">
            <div class="live-stats__grid">
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" data-counter="0">&mdash;</div>
                    <div class="live-stats__label">Active Members</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" data-counter="0">&mdash;</div>
                    <div class="live-stats__label">Total Study Hours</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" data-counter="0">&mdash;</div>
                    <div class="live-stats__label">Studying Right Now</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" data-counter="0">&mdash;</div>
                    <div class="live-stats__label">Bookings Today</div>
                </div>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="showcase__grid">
                <div class="showcase__content reveal">
                    <div class="section__eyebrow">Productivity Tools</div>
                    <h2 class="section__title" style="text-align:left">Built for deep focus</h2>
                    <p class="section__desc" style="text-align:left">Our integrated timer system helps you maintain focus with proven techniques like Pomodoro and Deep Work sessions.</p>

                    <div class="showcase__features">
                        <div class="showcase__feature">
                            <div class="showcase__feature-icon">⏱</div>
                            <div class="showcase__feature-text">
                                <h4>Pomodoro Mode</h4>
                                <p>25-minute focused sessions with 5-minute breaks. Proven to boost concentration.</p>
                            </div>
                        </div>
                        <div class="showcase__feature">
                            <div class="showcase__feature-icon">🧠</div>
                            <div class="showcase__feature-text">
                                <h4>Deep Work Mode</h4>
                                <p>90-minute uninterrupted sessions for complex tasks requiring sustained attention.</p>
                            </div>
                        </div>
                        <div class="showcase__feature">
                            <div class="showcase__feature-icon">📈</div>
                            <div class="showcase__feature-text">
                                <h4>Focus Analytics</h4>
                                <p>Track your productivity patterns with detailed session stats and focus scoring.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="reveal">
                    <div class="timer-preview">
                        <div class="timer-preview__mode">
                            <span class="timer-preview__mode-btn active">Pomodoro</span>
                            <span class="timer-preview__mode-btn">Deep Work</span>
                            <span class="timer-preview__mode-btn">Break</span>
                        </div>
                        <div class="timer-preview__time">18:42</div>
                        <div class="timer-preview__progress">
                            <div class="timer-preview__progress-fill"></div>
                        </div>
                        <div class="timer-preview__actions">
                            <span class="btn btn--accent">⏸ Pause</span>
                            <span class="btn btn--ghost">↺ Reset</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="section section--alt">
        <div class="container">
            <div class="section__header reveal">
                <div class="section__eyebrow">Testimonials</div>
                <h2 class="section__title">Loved by productive people</h2>
                <p class="section__desc">See what our community members have to say about their MugTuon experience.</p>
            </div>

            <div class="testimonials-grid" id="testimonials-grid"></div>
        </div>
    </section>

    <section class="section" id="pricing">
        <div class="container">
            <div class="section__header reveal">
                <div class="section__eyebrow">Pricing</div>
                <h2 class="section__title">Simple, transparent pricing</h2>
                <p class="section__desc">Choose the plan that fits your study style. Upgrade or downgrade anytime.</p>
            </div>

            <div class="pricing-grid" id="home-pricing-grid">
                ${[1,2,3].map((_, i) => `
                <div class="pricing-card ${i === 1 ? 'pricing-card--featured' : ''} reveal" style="opacity:.4;pointer-events:none">
                    <div style="height:24px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-4)"></div>
                    <div style="height:48px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>
                    <div style="height:16px;width:60%;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-6)"></div>
                    ${[1,2,3,4].map(() => `<div style="height:14px;background:var(--color-border);border-radius:4px;margin-bottom:var(--space-3)"></div>`).join('')}
                </div>`).join('')}
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <h2 class="cta-section__title reveal">Ready to level up your productivity?</h2>
            <p class="cta-section__desc reveal">Join thousands of students and professionals who study smarter at MugTuon.</p>
            <a href="/register" data-link class="btn btn--primary btn--lg reveal">Get Started Free</a>
        </div>
    </section>

    ${renderFooter()}
    `;

    initHeaderScroll();

    // ── Hero entrance animation (staggered fade-up) ──────────────────────
    requestAnimationFrame(() => {
        const heroEls = document.querySelectorAll('.hero-animate');
        heroEls.forEach((el, i) => {
            setTimeout(() => {
                el.style.transition = `opacity 600ms cubic-bezier(0.23,1,0.32,1), transform 600ms cubic-bezier(0.23,1,0.32,1)`;
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 80 * i);
        });
    });

    // ── Hero parallax on scroll (background image moves slower) ──────────
    const parallaxBg = document.getElementById('heroParallaxBg');
    if (parallaxBg) {
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    parallaxBg.style.transform = `translateY(${scrollY * 0.3}px)`;
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    const observer = Helpers.observeReveal();

    // Async: populate homepage pricing grid with live plan data + correct button hrefs
    (async () => {
        try {
            const plans = await API.get('/plans');
            const grid = document.getElementById('home-pricing-grid');
            if (!grid || !plans || !plans.length) return;

            grid.innerHTML = plans.map(plan => {
                const isFree     = parseFloat(plan.price) === 0;
                const isFeatured = plan.is_featured;
                const features   = Array.isArray(plan.features)
                    ? plan.features
                    : JSON.parse(plan.features || '[]');

                const priceHTML = isFree
                    ? '<div class="pricing-card__price">Free</div>'
                    : '<div class="pricing-card__price">&#8369;' + Number(plan.price).toLocaleString() + '<span>' + Helpers.billingLabel(plan.billing_period) + '</span></div>';

                let btnHref;
                if (plan.button_text === 'Contact Sales') {
                    btnHref = '/contact';
                } else if (isFree) {
                    btnHref = '/register';
                } else if (Store.isLoggedIn) {
                    btnHref = '/checkout?plan=' + plan.id;
                } else {
                    btnHref = '/register?plan=' + plan.id;
                }

                const btnClass = isFeatured ? 'btn--accent' : 'btn--outline';

                return '<div class="pricing-card ' + (isFeatured ? 'pricing-card--featured' : '') + ' reveal">' +
                    (plan.badge_text ? '<div class="pricing-card__badge">' + plan.badge_text + '</div>' : '') +
                    '<h3 class="pricing-card__name">' + plan.name + '</h3>' +
                    priceHTML +
                    '<p class="pricing-card__desc">' + (plan.description || '') + '</p>' +
                    '<ul class="pricing-card__features">' + features.map(f => '<li>' + f + '</li>').join('') + '</ul>' +
                    '<a href="' + btnHref + '" data-link class="btn ' + btnClass + ' btn--full">' + (plan.button_text || 'Get Started') + '</a>' +
                    '</div>';
            }).join('');

            Helpers.observeReveal();
        } catch (e) {
            // API unavailable — restore static fallback cards
            const grid = document.getElementById('home-pricing-grid');
            if (grid) grid.innerHTML =
                '<div class="pricing-card reveal"><h3 class="pricing-card__name">Explorer</h3><div class="pricing-card__price">Free</div><p class="pricing-card__desc">Try MugTuon risk-free</p><ul class="pricing-card__features"><li>1 booking per day</li><li>Basic study timer</li><li>Community leaderboard</li><li>2 hours max per session</li></ul><a href="/register" data-link class="btn btn--outline btn--full">Get Started</a></div>' +
                '<div class="pricing-card pricing-card--featured reveal"><div class="pricing-card__badge">Most Popular</div><h3 class="pricing-card__name">Scholar</h3><div class="pricing-card__price">&#8369;499<span>/mo</span></div><p class="pricing-card__desc">For serious students</p><ul class="pricing-card__features"><li>5 bookings per day</li><li>All timer modes</li><li>Study analytics</li><li>Priority booking</li><li>8 hours max per day</li></ul><a href="/pricing" data-link class="btn btn--accent btn--full">Get Started</a></div>' +
                '<div class="pricing-card reveal"><h3 class="pricing-card__name">Pro</h3><div class="pricing-card__price">&#8369;999<span>/mo</span></div><p class="pricing-card__desc">For professionals &amp; teams</p><ul class="pricing-card__features"><li>Unlimited bookings</li><li>Private rooms access</li><li>Advanced analytics</li><li>Priority support</li><li>Unlimited hours</li></ul><a href="/contact" data-link class="btn btn--outline btn--full">Contact Sales</a></div>';
            Helpers.observeReveal();
        }
    })();

    function startCounterAnimations() {
        document.querySelectorAll('[data-counter]').forEach(el => {
            if (el._counterObserver) el._counterObserver.disconnect();
            const target = parseInt(el.dataset.counter);
            const io = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        Helpers.animateCounter(el, target);
                        io.unobserve(el);
                    }
                });
            }, { threshold: 0.5 });
            el._counterObserver = io;
            io.observe(el);
        });
    }

    // Randomized testimonials
    const _testimonials = [
        { text: 'MugTuon transformed my study routine. The gamification keeps me motivated, and the analytics helped me find my peak focus hours.', name: 'Ana Santos', role: 'Computer Science Student' },
        { text: 'The coworking space is perfect for remote work. Great coffee, reliable WiFi, and the booking system is seamless.', name: 'Marco Reyes', role: 'Freelance Developer' },
        { text: 'I love competing on the leaderboard. The study streaks feature makes me come back every day. My grades have never been better.', name: 'Jasmine Lim', role: 'Business Student' },
        { text: 'The Pomodoro timer with XP rewards is genius. I went from 2 hours of studying per day to 5 hours without even noticing.', name: 'Rafael Cruz', role: 'Medical Student' },
        { text: 'Best study cafe in the city. The booking system means I always have my favorite spot reserved. Worth every peso.', name: 'Bea Villanueva', role: 'Architecture Student' },
        { text: 'As a freelancer, I needed a reliable workspace. MugTuon gives me productivity tools that even my coworking space back home didn\'t have.', name: 'Daniel Tan', role: 'UX Designer' },
        { text: 'The achievements system keeps me accountable. I have unlocked 15 badges and my study consistency has improved dramatically.', name: 'Sofia Aquino', role: 'Law Student' },
        { text: 'I brought my entire study group here. The private rooms are perfect for group projects and the analytics show our collective progress.', name: 'Miguel Torres', role: 'Engineering Student' },
    ];
    const shuffled = _testimonials.sort(() => Math.random() - 0.5).slice(0, 3);
    const tGrid = document.getElementById('testimonials-grid');
    if (tGrid) {
        tGrid.innerHTML = shuffled.map(t => {
            const initials = t.name.split(' ').map(w => w[0]).join('');
            return `<div class="testimonial-card reveal">
                <div class="testimonial-card__stars">★★★★★</div>
                <p class="testimonial-card__text">"${t.text}"</p>
                <div class="testimonial-card__author">
                    <div class="avatar avatar--sm">${initials}</div>
                    <div>
                        <div class="testimonial-card__name">${t.name}</div>
                        <div class="testimonial-card__role">${t.role}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
        Helpers.observeReveal();
    }

    // Fetch live community stats
    (async () => {
        try {
            const c = await API.get('/analytics/community');
            const map = {
                'Active Members': c.totalUsers || 0,
                'Study Hours Logged': c.totalStudyHours || 0,
                'Total Study Hours': c.totalStudyHours || 0,
                'Studying Right Now': c.activeNow || 0,
                'Bookings Today': c.bookingsToday || 0
            };
            document.querySelectorAll('[data-counter]').forEach(el => {
                const label = el.closest('.hero__stats > div, .live-stats__item')?.querySelector('.hero__stat-label, .live-stats__label')?.textContent;
                if (label && map[label] !== undefined) {
                    el.dataset.counter = map[label];
                    el.textContent = Number(map[label]).toLocaleString();
                }
            });
            const activeEl = document.getElementById('hero-active-count');
            if (activeEl) {
                const count = c.activeNow || 0;
                activeEl.textContent = count > 0
                    ? count + (count === 1 ? ' person' : ' people') + ' studying right now, together'
                    : 'Study smarter, together';
            }

            const mockMembers = document.getElementById('hero-mock-members');
            const mockActive = document.getElementById('hero-mock-active');
            const mockHours = document.getElementById('hero-mock-hours');
            if (mockMembers) mockMembers.textContent = (c.totalUsers || 0).toLocaleString();
            if (mockActive) mockActive.textContent = (c.activeNow || 0).toLocaleString();
            if (mockHours) mockHours.textContent = (c.totalStudyHours || 0).toLocaleString();
            startCounterAnimations();
        } catch(e) {
            startCounterAnimations();
        }
    })();
}
