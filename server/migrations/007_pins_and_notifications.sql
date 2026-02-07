-- +goose Up
-- ============================================================================
-- Feature: Pinned Messages + Notifications + Mentions
-- ============================================================================

-- Add pin columns to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES users(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

-- Notifications table for @mentions, replies, pins
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,           -- 'mention', 'reply', 'pin'
    message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id),
    actor_username TEXT NOT NULL,
    content_preview TEXT,         -- First ~100 chars of the message
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_time
ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_pinned
ON messages (channel_id, is_pinned) WHERE is_pinned = TRUE;

-- +goose Down
DROP INDEX IF EXISTS idx_messages_pinned;
DROP INDEX IF EXISTS idx_notifications_user_time;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP TABLE IF EXISTS notifications;
ALTER TABLE messages DROP COLUMN IF EXISTS pinned_at;
ALTER TABLE messages DROP COLUMN IF EXISTS pinned_by;
ALTER TABLE messages DROP COLUMN IF EXISTS is_pinned;
