-- 1. Users Table (GitHub Identity + Profile)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id BIGINT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,                          -- Avatar (GitHub or custom uploaded)
    display_name TEXT,                        -- Custom display name
    access_token TEXT NOT NULL,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects Table (Repo + Channel)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_repo_id BIGINT UNIQUE NOT NULL,
    -- full_name TEXT NOT NULL, -- e.g., 'facebook/react'
    name TEXT NOT NULL,      -- Display name
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Rules Table (The "Gate" logic)
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    criteria_type TEXT NOT NULL, -- 'PR_COUNT', 'STAR_COUNT'
    threshold TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Memberships Table (The Verified "Loop")
CREATE TABLE memberships (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'contributor',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, project_id)
);

-- 5. Messages Table (The Stream)
CREATE TABLE messages (
    id BIGINT PRIMARY KEY, -- Use a Snowflake ID from Go
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    parent_id BIGINT REFERENCES messages(id) ON DELETE SET NULL,  -- For thread replies
    reply_count INT DEFAULT 0,                                     -- Count of replies
    is_deleted BOOLEAN DEFAULT FALSE,                              -- Soft delete flag
    deleted_at TIMESTAMPTZ,                                        -- When deleted
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Channels Table (Sub-channels within a Loop)
CREATE TABLE channels (
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

-- this EXTENSION allows prefix matches and fuzzy search on b-tree indices
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_repos_name_trgm
ON projects USING gin (name gin_trgm_ops);

CREATE INDEX idx_messages_project_time
ON messages (project_id, created_at DESC);

CREATE INDEX idx_messages_channel_time
ON messages (channel_id, created_at DESC);

CREATE INDEX idx_channels_project
ON channels (project_id);
