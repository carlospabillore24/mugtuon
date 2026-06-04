function renderContactPage(app) {
    app.innerHTML = `
    ${renderHeader()}

    <section class="about-hero">
        <div class="container">
            <div class="section__eyebrow">Contact</div>
            <h1 class="about-hero__title">Get in touch</h1>
            <p class="about-hero__desc">Have a question or want to visit? We'd love to hear from you.</p>
        </div>
    </section>

    <section class="section">
        <div class="container" style="max-width:960px">
            <div class="contact-grid">
                <div>
                    <h2 style="margin-bottom:var(--space-6)">Send us a message</h2>
                    <form onsubmit="handleContactSubmit(event)">
                        <div class="form-group">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-input" id="contactName" placeholder="Your name" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email Address</label>
                            <input type="email" class="form-input" id="contactEmail" placeholder="you@example.com" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Subject</label>
                            <select class="form-input" id="contactSubject">
                                <option value="">Select a topic</option>
                                <option>General Inquiry</option>
                                <option>Booking Support</option>
                                <option>Membership</option>
                                <option>Partnership</option>
                                <option>Bug Report</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Message</label>
                            <textarea class="form-input" rows="5" id="contactMessage" placeholder="Tell us how we can help..." required></textarea>
                        </div>
                        <div id="contactError" class="form-error" style="display:none;margin-bottom:var(--space-4)"></div>
                        <button type="submit" class="btn btn--accent btn--lg btn--full" id="contactBtn">Send Message</button>
                    </form>
                </div>

                <div>
                    <h2 style="margin-bottom:var(--space-6)">Contact info</h2>
                    <div class="contact-info">
                        <div class="contact-info__item">
                            <div class="contact-info__icon">📍</div>
                            <div>
                                <div class="contact-info__label">Visit us</div>
                                <div class="contact-info__value" id="contact-address">Loading...</div>
                            </div>
                        </div>
                        <div class="contact-info__item">
                            <div class="contact-info__icon">📧</div>
                            <div>
                                <div class="contact-info__label">Email</div>
                                <div class="contact-info__value" id="contact-email">Loading...</div>
                            </div>
                        </div>
                        <div class="contact-info__item">
                            <div class="contact-info__icon">📱</div>
                            <div>
                                <div class="contact-info__label">Phone</div>
                                <div class="contact-info__value" id="contact-phone">Loading...</div>
                            </div>
                        </div>
                        <div class="contact-info__item">
                            <div class="contact-info__icon">🕐</div>
                            <div>
                                <div class="contact-info__label">Operating Hours</div>
                                <div class="contact-info__value" id="contact-hours">Loading...</div>
                            </div>
                        </div>
                    </div>

                    <div class="card" style="margin-top:var(--space-8);background:var(--color-warm-lighter)">
                        <h4 style="margin-bottom:var(--space-2)">Walk-ins Welcome!</h4>
                        <p style="font-size:var(--text-sm);color:var(--color-text-secondary)">No booking required for our cafe area. Just drop by, grab a coffee, and find your spot.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    ${renderFooter()}
    `;

    initHeaderScroll();

    const defaults = {
        contact_address: '19th St., 2nd Floor - CJB Building, Nazareth, Cagayan de Oro City, 9000',
        contact_email: 'mugtuonlhc@gmail.com',
        contact_phone: '+63 976 076 8475',
        contact_hours: 'Open Daily 10 AM - 4 AM'
    };
    (async () => {
        let info = {};
        try { info = await API.get('/contact/info'); } catch(e) {}
        document.getElementById('contact-address').textContent = info.contact_address || defaults.contact_address;
        document.getElementById('contact-email').textContent   = info.contact_email   || defaults.contact_email;
        document.getElementById('contact-phone').textContent   = info.contact_phone   || defaults.contact_phone;
        document.getElementById('contact-hours').textContent   = info.contact_hours   || defaults.contact_hours;
    })();
}

async function handleContactSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('contactBtn');
    const errEl = document.getElementById('contactError');
    errEl.style.display = 'none';
    btn.textContent = 'Sending...'; btn.disabled = true;

    try {
        await API.post('/contact', {
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            subject: document.getElementById('contactSubject').value,
            message: document.getElementById('contactMessage').value,
        });
        Helpers.showToast('Message Sent', 'Thanks for reaching out! We\'ll get back to you within 24 hours.', 'success');
        e.target.reset();
    } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
    } finally {
        btn.textContent = 'Send Message'; btn.disabled = false;
    }
}
