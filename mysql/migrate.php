<?php
/**
 * MugTuon Database Migration Runner
 *
 * Usage:
 *   php mysql/migrate.php           — run all pending migrations
 *   php mysql/migrate.php status    — show migration status
 *   php mysql/migrate.php create NAME — create a new migration file
 *
 * Migrations live in mysql/migrations/ as numbered SQL files:
 *   001_create_notifications.sql
 *   002_add_user_timezone.sql
 */

require_once __DIR__ . '/../php/config.php';

$pdo = db();

$pdo->exec("CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$applied = [];
foreach ($pdo->query("SELECT name FROM migrations ORDER BY id")->fetchAll() as $r) {
    $applied[] = $r['name'];
}

$migrationsDir = __DIR__ . '/migrations';
$files = glob($migrationsDir . '/*.sql');
sort($files);

$action = $argv[1] ?? 'run';

if ($action === 'status') {
    echo "=== Migration Status ===\n";
    foreach ($files as $f) {
        $name = basename($f);
        $status = in_array($name, $applied) ? '[APPLIED]' : '[PENDING]';
        echo "  $status $name\n";
    }
    if (empty($files)) echo "  No migration files found.\n";
    echo "\n" . count($applied) . " applied, " . (count($files) - count($applied)) . " pending\n";
    exit(0);
}

if ($action === 'create') {
    $label = $argv[2] ?? 'unnamed';
    $label = preg_replace('/[^a-z0-9_]/', '_', strtolower($label));
    $num = str_pad(count($files) + 1, 3, '0', STR_PAD_LEFT);
    $filename = $migrationsDir . "/{$num}_{$label}.sql";
    file_put_contents($filename, "-- Migration: {$num}_{$label}\n-- Created: " . date('Y-m-d H:i:s') . "\n\n");
    echo "Created: $filename\n";
    exit(0);
}

$pending = 0;
foreach ($files as $f) {
    $name = basename($f);
    if (in_array($name, $applied)) continue;

    echo "Applying: $name ... ";
    $sql = file_get_contents($f);

    try {
        $pdo->exec($sql);
        $pdo->prepare("INSERT INTO migrations (name) VALUES (?)")->execute([$name]);
        echo "OK\n";
        $pending++;
    } catch (PDOException $e) {
        echo "FAILED\n";
        echo "  Error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

if ($pending === 0) {
    echo "No pending migrations.\n";
} else {
    echo "\n$pending migration(s) applied successfully.\n";
}
