-- +goose Up
-- Performance indexes for faster loop loading

-- Index for looking up memberships by user (Dashboard load)
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships (user_id);

-- Index for looking up projects by name (Loop page load)
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects (name);

-- Index for looking up projects by owner (Dashboard owned loops)
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects (owner_id);

-- Composite index for channel messages (most common query pattern)
-- Covers: channel_id, parent_id IS NULL, is_deleted, created_at ordering
CREATE INDEX IF NOT EXISTS idx_messages_channel_parent_deleted_time 
ON messages (channel_id, created_at DESC) 
WHERE parent_id IS NULL AND (is_deleted = FALSE OR is_deleted IS NULL);

-- Index for thread replies (loading thread messages)
CREATE INDEX IF NOT EXISTS idx_messages_parent_id_time 
ON messages (parent_id, created_at ASC) 
WHERE parent_id IS NOT NULL AND (is_deleted = FALSE OR is_deleted IS NULL);

-- Index for channels by project (loading loop channels)
CREATE INDEX IF NOT EXISTS idx_channels_project_position 
ON channels (project_id, position, is_default DESC);

-- Index for user lookups by username (profile views)
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- +goose Down
DROP INDEX IF EXISTS idx_memberships_user_id;
DROP INDEX IF EXISTS idx_projects_name;
DROP INDEX IF EXISTS idx_projects_owner_id;
DROP INDEX IF EXISTS idx_messages_channel_parent_deleted_time;
DROP INDEX IF EXISTS idx_messages_parent_id_time;
DROP INDEX IF EXISTS idx_channels_project_position;
DROP INDEX IF EXISTS idx_users_username;
