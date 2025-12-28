-- +goose Up
CREATE INDEX IF NOT EXISTS idx_messages_project_time
ON messages (project_id, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_messages_project_time;
