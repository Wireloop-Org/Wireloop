-- +goose Up
-- Fix schema mismatches between code and database

-- Remove full_name column if it exists (was required, now removed)
ALTER TABLE projects DROP COLUMN IF EXISTS full_name;

-- Rename required_value to threshold if needed (for older databases)
-- +goose StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rules' AND column_name = 'required_value'
    ) THEN
        ALTER TABLE rules RENAME COLUMN required_value TO threshold;
    END IF;
END $$;
-- +goose StatementEnd

-- +goose Down
-- Cannot safely reverse these changes as data may have been lost
SELECT 1;

