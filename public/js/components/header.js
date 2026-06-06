function renderHeader(isPublic = true) {
    const user = Store.get('user');

    if (!isPublic && user) return '';

    const currentPath = Router.currentPath || '/';
    const link = (href, label) =>
        `<a href="${href}" data-link class="header__link ${currentPath === href ? 'active' : ''}">${label}</a>`;

    return `
    <header class="header" id="mainHeader">
        <div class="header__inner">
            <a href="/" data-link class="header__logo">
                <img src="images/logo-icon.png" alt="MugTuon" class="header__logo-img" style="height:36px;width:36px;border-radius:50%;object-fit:cover">
                <span>MugTuon</span>
            </a>

            <nav class="header__nav" aria-label="Site navigation">
                ${link('/', 'Home')}
                ${link('/spaces', 'Spaces')}
                ${link('/about', 'About')}
                ${link('/pricing', 'Pricing')}
                ${link('/contact', 'Contact')}
            </nav>

            <div class="header__actions">
                <button class="btn btn--ghost btn--sm" onclick="toggleTheme()" title="Toggle dark mode" aria-label="Toggle dark mode" style="font-size:16px;padding:6px 10px">
                    ${document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙'}
                </button>
                ${user ? `
                    <a href="/dashboard" data-link class="btn btn--ghost">Dashboard</a>
                    <button class="btn btn--primary btn--sm" onclick="Store.logout(); Router.navigate('/')">Logout</button>
                ` : `
                    <a href="/login" data-link class="btn btn--ghost">Sign in</a>
                    <a href="/register" data-link class="btn btn--primary">Get Started</a>
                `}
            </div>

            <button class="header__mobile-toggle" onclick="toggleMobileNav()" aria-label="Menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>
        </div>
    </header>

    <div class="mobile-nav" id="mobileNav">
        <a href="/" data-link class="mobile-nav__link" onclick="closeMobileNav()">Home</a>
        <a href="/spaces" data-link class="mobile-nav__link" onclick="closeMobileNav()">Spaces</a>
        <a href="/about" data-link class="mobile-nav__link" onclick="closeMobileNav()">About</a>
        <a href="/pricing" data-link class="mobile-nav__link" onclick="closeMobileNav()">Pricing</a>
        <a href="/contact" data-link class="mobile-nav__link" onclick="closeMobileNav()">Contact</a>
        <hr class="divider">
        ${user ? `
            <a href="/dashboard" data-link class="mobile-nav__link" onclick="closeMobileNav()">Dashboard</a>
            <button class="btn btn--primary btn--full" onclick="Store.logout(); Router.navigate('/'); closeMobileNav()">Logout</button>
        ` : `
            <a href="/login" data-link class="mobile-nav__link" onclick="closeMobileNav()">Sign in</a>
            <a href="/register" data-link class="btn btn--primary btn--full" onclick="closeMobileNav()">Get Started</a>
        `}
    </div>
    `;
}

function toggleMobileNav() {
    document.getElementById('mobileNav').classList.toggle('open');
}

function closeMobileNav() {
    document.getElementById('mobileNav').classList.remove('open');
}

function initHeaderScroll() {
    const header = document.getElementById('mainHeader');
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
}
