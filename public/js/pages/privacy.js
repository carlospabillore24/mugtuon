function renderPrivacyPage(app) {
    app.innerHTML = `
    ${renderHeader()}
    <section class="section" style="padding-top:var(--space-12);padding-bottom:var(--space-12)">
        <div class="container container--narrow">
            <div class="section__eyebrow">Legal</div>
            <h1 style="font-size:var(--text-3xl);font-weight:var(--weight-bold);margin-bottom:var(--space-2)">Privacy Policy</h1>
            <p style="color:var(--color-text-muted);margin-bottom:var(--space-8)">Last updated: May 2026</p>

            <div style="display:flex;flex-direction:column;gap:var(--space-6);line-height:var(--leading-relaxed);color:var(--color-text-secondary)">
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">1. Information We Collect</h3>
                    <p>We collect information you provide directly: name, email address, university, and profile details. We also collect usage data including study sessions, bookings, and productivity metrics to power the gamification and analytics features.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">2. How We Use Your Information</h3>
                    <p>Your information is used to: provide and improve the Platform, process bookings and payments, send email notifications (booking confirmations, reminders, password resets), display leaderboards and analytics, and personalize your experience.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">3. Email Communications</h3>
                    <p>We send transactional emails (booking confirmations, password resets) and optional notifications (renewal reminders, booking reminders). You can manage your email preferences in your profile settings.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">4. Data Storage & Security</h3>
                    <p>Your data is stored securely in our PostgreSQL database. Passwords are hashed using bcrypt. We use JWT tokens for authentication with session invalidation on password change. Payment proof images are stored as encrypted data.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">5. Leaderboard & Public Data</h3>
                    <p>Your name, university, XP, and study streak are visible on the public leaderboard. Your email, bookings, and payment information are never publicly displayed.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">6. Data Sharing</h3>
                    <p>We do not sell, rent, or share your personal information with third parties. Data may be shared with payment processors (GCash, banks) to verify transactions, and with email service providers to deliver notifications.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">7. Your Rights</h3>
                    <p>You have the right to: access your personal data, update or correct your information, request deletion of your account (contact admin), and opt out of non-essential email notifications.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">8. Cookies & Local Storage</h3>
                    <p>We use browser localStorage to maintain your login session, theme preference, and timer state. We do not use third-party tracking cookies.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">9. Contact</h3>
                    <p>For privacy-related inquiries, contact us at <a href="/contact" data-link style="color:var(--color-accent)">our contact page</a> or email mugtuonlhc@gmail.com.</p>
                </div>
            </div>
        </div>
    </section>
    ${renderFooter()}
    `;
    initHeaderScroll();
}
