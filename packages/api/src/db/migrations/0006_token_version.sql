-- 0006_token_version.sql
-- Adds a per-user counter that lets password changes / resets invalidate every
-- existing JWT. The token carries the current value at issue-time; the middleware
-- rejects any JWT whose `tv` claim is behind the row.

ALTER TABLE admin_users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
