-- +goose Up
-- Initial schema for Wireloop

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Users Table (GitHub Identity + Profile)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id BIGINT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    display_name TEXT,
    access_token TEXT NOT NULL,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects Table (Repo + Channel)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_repo_id BIGINT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Rules Table (The "Gate" logic)
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    criteria_type TEXT NOT NULL,
    threshold TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Memberships Table (The Verified "Loop")
CREATE TABLE IF NOT EXISTS memberships (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'contributor',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, project_id)
);

-- 5. Messages Table (The Stream)
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fuzzy search on project names
CREATE INDEX IF NOT EXISTS idx_repos_name_trgm
ON projects USING gin (name gin_trgm_ops);

-- +goose Down
DROP INDEX IF EXISTS idx_repos_name_trgm;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS rules;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
DROP EXTENSION IF EXISTS pg_trgm;

