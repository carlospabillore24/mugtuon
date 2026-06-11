/* ═══════════════════════════════════════════════
   MugTuon Learning Hub & Cafe — App Bootstrap
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Register all routes ──
    Router.register('/', renderHomePage);
    Router.register('/spaces', renderSpacesPage);
    Router.register('/about', renderAboutPage);
    Router.register('/pricing', renderPricingPage);
    Router.register('/contact', renderContactPage);
    Router.register('/login', renderLoginPage);
    Router.register('/forgot-password', renderForgotPasswordPage);
    Router.register('/reset-password', renderResetPasswordPage);
    Router.register('/verify-email', renderVerifyEmailPage);
    Router.register('/register', renderRegisterPage);
    Router.register('/terms', renderTermsPage);
    Router.register('/privacy', renderPrivacyPage);
    Router.register('/checkout', renderCheckoutPage);

    // Authenticated routes
    Router.register('/dashboard', renderDashboardPage);
    Router.register('/profile', renderProfilePage);
    Router.register('/subscription', renderSubscriptionPage);
    Router.register('/bookings', renderBookingsPage);
    Router.register('/leaderboard', renderLeaderboardPage);
    Router.register('/achievements', renderAchievementsPage);
    Router.register('/analytics', renderAnalyticsPage);

    // Admin routes
    Router.register('/admin', renderAdminDashboardPage);
    Router.register('/admin/users', renderAdminUsersPage);
    Router.register('/admin/bookings', renderAdminBookingsPage);
    Router.register('/admin/analytics', renderAdminAnalyticsPage);
    Router.register('/admin/payments', renderAdminPaymentsPage);
    Router.register('/admin/spaces', renderAdminSpacesPage);
    Router.register('/admin/plans', renderAdminPlansPage);
    Router.register('/admin/payment-settings', renderAdminPaymentSettingsPage);
    Router.register('/admin/contact', renderAdminContactPage);
    Router.register('/admin/achievements', renderAdminAchievementsPage);
    Router.register('/admin/announcements', renderAdminAnnouncementsPage);
    Router.register('/admin/audit', renderAdminAuditPage);
    Router.register('/admin/site-settings', renderAdminSiteSettingsPage);

    // ── Start router ──
    Router.init();

    console.log('%c☕ MugTuon Learning Hub & Cafe', 'font-size:16px;font-weight:bold;color:#006241');
    console.log('%cPlatform ready.', 'color:#00754a');
})();
