-- Password reset tokens for admin users.
-- The plaintext token is sent via email; we store only its SHA-256 hash so a
-- leaked DB row can't be replayed. Tokens are one-shot (used_at clears them)
-- and expire 30 minutes after creation.
CREATE TABLE IF NOT EXISTS admin_password_resets (
  id            TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  expires_at    TEXT NOT NULL,
  used_at       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address    TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_password_resets_user
  ON admin_password_resets(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_password_resets_token
  ON admin_password_resets(token_hash);
