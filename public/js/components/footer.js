function renderFooter() {
    return `
    <footer class="footer">
        <div class="container">
            <div class="footer__grid">
                <div class="footer__brand">
                    <div class="footer__brand-name" style="display:flex;align-items:center;gap:8px"><img src="images/logo-icon.png" alt="" style="height:28px;width:28px;border-radius:50%;flex-shrink:0">MugTuon</div>
                    <p class="footer__brand-desc">
                        Your premium study hub and coworking space. Track productivity, join the community, and achieve your goals in a focused environment.
                    </p>
                </div>

                <div>
                    <h4 class="footer__col-title">Platform</h4>
                    <ul class="footer__links">
                        <li><a href="/pricing" data-link>Pricing</a></li>
                        <li><a href="/bookings" data-link>Book a Space</a></li>
                        <li><a href="/leaderboard" data-link>Leaderboards</a></li>
                        <li><a href="/about" data-link>About Us</a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="footer__col-title">Features</h4>
                    <ul class="footer__links">
                        <li><a href="/dashboard" data-link>Study Timer</a></li>
                        <li><a href="/analytics" data-link>Productivity Analytics</a></li>
                        <li><a href="/leaderboard" data-link>Community</a></li>
                        <li><a href="/achievements" data-link>Achievements</a></li>
                    </ul>
                </div>

                <div>
                    <h4 class="footer__col-title">Support</h4>
                    <ul class="footer__links">
                        <li><a href="/contact" data-link>Contact Us</a></li>
                        <li><a href="/about" data-link>About Us</a></li>
                        <li><a href="/privacy" data-link>Privacy Policy</a></li>
                        <li><a href="/terms" data-link>Terms of Service</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer__bottom">
                <span>&copy; ${new Date().getFullYear()} MugTuon Learning Hub & Cafe. All rights reserved.</span>
                <span>Built with ☕ and focus</span>
            </div>
        </div>
    </footer>
    `;
}
