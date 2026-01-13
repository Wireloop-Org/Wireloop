-- +goose Up
-- +goose StatementBegin

-- Add thread support to messages (parent_id for replies)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reply_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for fetching thread replies quickly
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_id) WHERE parent_id IS NOT NULL;

-- Index for fetching non-deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON messages(channel_id, created_at DESC) WHERE is_deleted = FALSE;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_messages_not_deleted;
DROP INDEX IF EXISTS idx_messages_parent_id;
ALTER TABLE messages 
DROP COLUMN IF EXISTS deleted_at,
DROP COLUMN IF EXISTS is_deleted,
DROP COLUMN IF EXISTS reply_count,
DROP COLUMN IF EXISTS parent_id;
-- +goose StatementEnd
