-- name: UpsertUser :one
INSERT INTO users (
    github_id, username, avatar_url, access_token
) VALUES (
    $1, $2, $3, $4
)
ON CONFLICT (github_id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = COALESCE(users.avatar_url, EXCLUDED.avatar_url),
    access_token = EXCLUDED.access_token,
    updated_at = NOW()
RETURNING *;

-- name: GetUserByGithubID :one
SELECT * FROM users WHERE github_id = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 LIMIT 1;

-- name: GetUserByUsername :one
SELECT * FROM users WHERE username = $1 LIMIT 1;

-- name: UpdateUserProfile :one
UPDATE users SET
    display_name = COALESCE($2, display_name),
    profile_completed = TRUE,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserAvatar :one
UPDATE users SET
    avatar_url = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetUserProfile :one
SELECT 
    id,
    github_id,
    username,
    avatar_url,
    display_name,
    profile_completed,
    created_at
FROM users WHERE id = $1 LIMIT 1;

-- name: GetPublicProfile :one
SELECT 
    id,
    username,
    avatar_url,
    display_name,
    created_at
FROM users WHERE username = $1 LIMIT 1;
