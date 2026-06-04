function renderAboutPage(app) {
    app.innerHTML = `
    ${renderHeader()}

    <section class="about-hero">
        <div class="container">
            <div class="section__eyebrow">Our Story</div>
            <h1 class="about-hero__title">Where coffee meets <span style="color:var(--color-accent)">productivity</span></h1>
            <p class="about-hero__desc">MugTuon started as a simple idea: create a space where students can study, collaborate, and grow together, fueled by great coffee and a focused environment.</p>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="showcase__grid">
                <div class="reveal">
                    <div class="section__eyebrow">Our Mission</div>
                    <h2 style="margin-bottom:var(--space-4)">Empowering learners to achieve more</h2>
                    <p style="color:var(--color-text-secondary);line-height:var(--leading-relaxed);margin-bottom:var(--space-4)">
                        We believe that the right environment, tools, and community can transform how people learn and work. MugTuon combines physical spaces with digital productivity tools to create an ecosystem where every study session counts.
                    </p>
                    <p style="color:var(--color-text-secondary);line-height:var(--leading-relaxed)">
                        From our Pomodoro timer to our detailed study analytics, every feature is designed to help you understand your study patterns, stay motivated, and reach your goals faster.
                    </p>
                </div>
                <div class="reveal" style="background:var(--color-warm-lighter);border-radius:var(--radius-xl);padding:var(--space-10);display:flex;align-items:center;justify-content:center;">
                    <div style="text-align:center">
                        <img src="images/logo-icon.png" alt="MugTuon" style="width:80px;height:80px;border-radius:50%;margin-bottom:var(--space-4)">
                        <div style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-primary)">Est. 2024</div>
                        <div style="color:var(--color-text-secondary)">MugTuon Learning Hub & Cafe</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="section section--alt">
        <div class="container">
            <div class="section__header reveal">
                <div class="section__eyebrow">Our Values</div>
                <h2 class="section__title">What drives us</h2>
            </div>

            <div class="values-grid">
                <div class="card reveal">
                    <div class="value-card__icon">🎯</div>
                    <h3 class="value-card__title">Focus First</h3>
                    <p class="value-card__desc">Every design decision and feature prioritizes deep focus and meaningful productivity.</p>
                </div>
                <div class="card reveal">
                    <div class="value-card__icon">🤝</div>
                    <h3 class="value-card__title">Community Driven</h3>
                    <p class="value-card__desc">We build for and with our community. Study together, grow together, succeed together.</p>
                </div>
                <div class="card reveal">
                    <div class="value-card__icon">🌱</div>
                    <h3 class="value-card__title">Continuous Growth</h3>
                    <p class="value-card__desc">Our gamification system rewards consistency and helps build lasting study habits.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="live-stats">
        <div class="container">
            <div class="live-stats__grid">
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" id="about-stat-members">—</div>
                    <div class="live-stats__label">Members</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" id="about-stat-hours">—</div>
                    <div class="live-stats__label">Study Hours</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" id="about-stat-active">—</div>
                    <div class="live-stats__label">Studying Now</div>
                </div>
                <div class="live-stats__item reveal">
                    <div class="live-stats__value" id="about-stat-bookings">—</div>
                    <div class="live-stats__label">Bookings Today</div>
                </div>
            </div>
        </div>
    </section>

    <section class="cta-section">
        <div class="container">
            <h2 class="cta-section__title reveal">Join our community</h2>
            <p class="cta-section__desc reveal">Be part of a growing community of focused learners and productive professionals.</p>
            <a href="/register" data-link class="btn btn--primary btn--lg reveal">Get Started Free</a>
        </div>
    </section>

    ${renderFooter()}
    `;

    initHeaderScroll();
    Helpers.observeReveal();

    (async () => {
        try {
            const c = await API.get('/analytics/community');
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = Number(val).toLocaleString(); };
            set('about-stat-members', c.totalUsers || 0);
            set('about-stat-hours', c.totalStudyHours || 0);
            set('about-stat-active', c.activeNow || 0);
            set('about-stat-bookings', c.bookingsToday || 0);
        } catch(e) {}
    })();
}
