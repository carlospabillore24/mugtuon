function renderTermsPage(app) {
    app.innerHTML = `
    ${renderHeader()}
    <section class="section" style="padding-top:var(--space-12);padding-bottom:var(--space-12)">
        <div class="container container--narrow">
            <div class="section__eyebrow">Legal</div>
            <h1 style="font-size:var(--text-3xl);font-weight:var(--weight-bold);margin-bottom:var(--space-2)">Terms of Service</h1>
            <p style="color:var(--color-text-muted);margin-bottom:var(--space-8)">Last updated: May 2026</p>

            <div style="display:flex;flex-direction:column;gap:var(--space-6);line-height:var(--leading-relaxed);color:var(--color-text-secondary)">
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">1. Acceptance of Terms</h3>
                    <p>By accessing and using MugTuon Learning Hub & Cafe ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">2. Account Registration</h3>
                    <p>You must provide accurate, complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 16 years old to create an account.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">3. Bookings & Spaces</h3>
                    <p>Bookings are subject to availability. MugTuon reserves the right to cancel or modify bookings due to unforeseen circumstances. No-shows may result in penalties as determined by the management. Check-in is required via QR code or staff verification.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">4. Membership Plans</h3>
                    <p>Paid plans are billed according to the selected billing period (monthly, quarterly, or yearly). You may cancel your subscription at any time; access continues until the end of the current billing period. Refunds are handled on a case-by-case basis.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">5. Acceptable Use</h3>
                    <p>You agree not to misuse the Platform, including but not limited to: creating multiple accounts, manipulating gamification features, disrupting other users, or using the space for purposes other than studying or working.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">6. Intellectual Property</h3>
                    <p>All content, branding, and features of the Platform are the property of MugTuon Learning Hub & Cafe. You may not reproduce, distribute, or create derivative works without written permission.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">7. Limitation of Liability</h3>
                    <p>MugTuon provides the Platform "as is" and makes no warranties regarding availability, accuracy, or fitness for a particular purpose. MugTuon shall not be liable for any indirect, incidental, or consequential damages.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">8. Changes to Terms</h3>
                    <p>We reserve the right to modify these terms at any time. Continued use of the Platform after changes constitutes acceptance of the new terms. Users will be notified of significant changes via email.</p>
                </div>
                <div>
                    <h3 style="color:var(--color-text);margin-bottom:var(--space-2)">9. Contact</h3>
                    <p>For questions about these Terms, please contact us at <a href="/contact" data-link style="color:var(--color-accent)">our contact page</a> or email mugtuonlhc@gmail.com.</p>
                </div>
            </div>
        </div>
    </section>
    ${renderFooter()}
    `;
    initHeaderScroll();
}
