-- +goose Up
-- Add channels table for Discord-like sub-channels within loops

-- 6. Channels Table (Sub-channels within a Loop)
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,                      -- e.g., 'general', 'dev', 'random'
    description TEXT,                        -- Optional channel description
    is_default BOOLEAN DEFAULT FALSE,        -- First channel users see
    position INTEGER DEFAULT 0,              -- Order in the channel list
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, name)                 -- No duplicate channel names per project
);

-- Add channel_id to messages (nullable initially for migration)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE CASCADE;

-- Create index on messages for channel-based queries
CREATE INDEX IF NOT EXISTS idx_messages_channel_time 
ON messages (channel_id, created_at DESC);

-- Create index on channels for project lookup
CREATE INDEX IF NOT EXISTS idx_channels_project 
ON channels (project_id);

-- +goose Down
DROP INDEX IF EXISTS idx_channels_project;
DROP INDEX IF EXISTS idx_messages_channel_time;
ALTER TABLE messages DROP COLUMN IF EXISTS channel_id;
DROP TABLE IF EXISTS channels;
