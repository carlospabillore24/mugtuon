-- Migration 003: Clean up dead DB artifacts (B12-B14) + add soft delete (G4)
-- Run after 002_bugfix_session11.sql

-- ── B12: Drop unused notifications table ──────────────────────────────────
DROP TABLE IF EXISTS notifications;

-- ── B13: Drop dead columns from productivity_scores ───────────────────────
ALTER TABLE productivity_scores DROP COLUMN IF EXISTS streak_days;
ALTER TABLE productivity_scores DROP COLUMN IF EXISTS level;

-- ── B13: Drop dead slug column from spaces ────────────────────────────────
ALTER TABLE spaces DROP COLUMN IF EXISTS slug;

-- ── G4: Add soft-delete column to users ───────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at DATETIME DEFAULT NULL;
CREATE INDEX idx_users_deleted ON users (deleted_at);
