<?php
/**
 * SEO handler — serves index.html with route-specific meta tags injected.
 * Used as the SPA fallback instead of serving index.html directly.
 */

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = strtok($uri, '?');
$path = preg_replace('#^/mugtuon/?#', '/', $path);
$path = '/' . trim($path, '/');

$routes = [
    '/'             => ['title' => 'MugTuon Learning Hub & Cafe', 'desc' => 'Your premium study hub, coworking space, and productivity ecosystem. Book spaces, track focus, climb leaderboards.'],
    '/about'        => ['title' => 'About | MugTuon', 'desc' => 'Learn about MugTuon Learning Hub & Cafe — where coffee meets productivity. Our mission, values, and community.'],
    '/pricing'      => ['title' => 'Pricing | MugTuon', 'desc' => 'Affordable study space plans. Explorer (Free), Scholar, and Pro memberships with booking, analytics, and focus tools.'],
    '/contact'      => ['title' => 'Contact | MugTuon', 'desc' => 'Get in touch with MugTuon Learning Hub & Cafe. Visit us in Cagayan de Oro City or send us a message.'],
    '/login'        => ['title' => 'Sign In | MugTuon', 'desc' => 'Sign in to your MugTuon account to access your dashboard, bookings, and study analytics.'],
    '/register'     => ['title' => 'Create Account | MugTuon', 'desc' => 'Join MugTuon for free. Start booking study spaces, tracking focus, and climbing the leaderboard.'],
    '/terms'        => ['title' => 'Terms of Service | MugTuon', 'desc' => 'MugTuon Learning Hub & Cafe terms of service — registration, bookings, plans, and acceptable use policies.'],
    '/privacy'      => ['title' => 'Privacy Policy | MugTuon', 'desc' => 'How MugTuon collects, uses, and protects your personal information.'],
    '/dashboard'    => ['title' => 'Dashboard | MugTuon', 'desc' => 'Your MugTuon dashboard — study stats, XP, streaks, and productivity overview.'],
    '/bookings'     => ['title' => 'Bookings | MugTuon', 'desc' => 'Book study spaces and coworking rooms at MugTuon.'],
    '/leaderboard'  => ['title' => 'Leaderboard | MugTuon', 'desc' => 'See the top students and most productive members at MugTuon.'],
    '/achievements' => ['title' => 'Achievements | MugTuon', 'desc' => 'Earn badges and unlock achievements as you study at MugTuon.'],
    '/analytics'    => ['title' => 'Analytics | MugTuon', 'desc' => 'Your study analytics — focus scores, session history, and productivity trends.'],
];

$meta = $routes[$path] ?? ['title' => 'MugTuon Learning Hub & Cafe', 'desc' => 'Your premium study hub, coworking space, and productivity ecosystem.'];

$html = file_get_contents(__DIR__ . '/index.html');

$html = preg_replace('/<title>.*?<\/title>/', '<title>' . htmlspecialchars($meta['title']) . '</title>', $html, 1);
$html = preg_replace('/(<meta\s+name="description"\s+content=")[^"]*"/', '$1' . htmlspecialchars($meta['desc']) . '"', $html, 1);
$html = preg_replace('/(<meta\s+property="og:title"\s+content=")[^"]*"/', '$1' . htmlspecialchars($meta['title']) . '"', $html, 1);
$html = preg_replace('/(<meta\s+property="og:description"\s+content=")[^"]*"/', '$1' . htmlspecialchars($meta['desc']) . '"', $html, 1);
$html = preg_replace('/(<meta\s+name="twitter:title"\s+content=")[^"]*"/', '$1' . htmlspecialchars($meta['title']) . '"', $html, 1);
$html = preg_replace('/(<meta\s+name="twitter:description"\s+content=")[^"]*"/', '$1' . htmlspecialchars($meta['desc']) . '"', $html, 1);

header('Content-Type: text/html; charset=utf-8');
echo $html;
