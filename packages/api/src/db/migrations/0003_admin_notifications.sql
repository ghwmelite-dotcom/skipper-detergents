-- Migration: persistent admin notifications feed.
-- Feeds the bell icon + dropdown in the admin TopBar. Server-side so the
-- feed survives page refreshes and is shared across admin sessions.

CREATE TABLE IF NOT EXISTS admin_notifications (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  type        TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  title       TEXT NOT NULL,
  body        TEXT,
  metadata    TEXT,
  read_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created
  ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON admin_notifications(read_at)
  WHERE read_at IS NULL;
