<?php
/**
 * MugTuon JS Bundler — concatenates all JS files into a single bundle.
 *
 * Usage:  php tools/build.php
 * Output: public/js/bundle.js
 *
 * Reads the <script> tags from index.html to preserve the correct load order.
 * The QR library (html5-qrcode.min.js) is excluded — it stays as a separate file.
 */

$root = dirname(__DIR__);
$indexFile = $root . '/public/index.html';
$outputFile = $root . '/public/js/bundle.js';

if (!file_exists($indexFile)) {
    fwrite(STDERR, "Error: index.html not found at $indexFile\n");
    exit(1);
}

$html = file_get_contents($indexFile);

// Extract all JS file paths from <script ... src="js/..."> tags
preg_match_all('/src="(js\/[^"?]+)/', $html, $matches);
$files = $matches[1] ?? [];

if (empty($files)) {
    fwrite(STDERR, "Error: No JS files found in index.html\n");
    exit(1);
}

$bundle = "/* MugTuon Bundle — generated " . date('Y-m-d H:i:s') . " */\n\n";
$count = 0;
$skipped = [];

foreach ($files as $relPath) {
    // Skip vendor libraries and the bundle itself
    if (strpos($relPath, 'lib/') !== false || $relPath === 'js/bundle.js') {
        $skipped[] = $relPath;
        continue;
    }

    $fullPath = $root . '/public/' . $relPath;
    if (!file_exists($fullPath)) {
        fwrite(STDERR, "Warning: $relPath not found, skipping\n");
        continue;
    }

    $content = file_get_contents($fullPath);
    $bundle .= "// ── $relPath ──\n";
    $bundle .= $content;
    $bundle .= "\n\n";
    $count++;
}

file_put_contents($outputFile, $bundle);
$size = round(strlen($bundle) / 1024);

echo "Bundled $count files into bundle.js ({$size} KB)\n";
if (!empty($skipped)) {
    echo "Skipped (load separately): " . implode(', ', $skipped) . "\n";
}
echo "Output: $outputFile\n";
