-- +goose Up
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id);

-- +goose Down
DROP INDEX IF EXISTS idx_messages_sender_id;
