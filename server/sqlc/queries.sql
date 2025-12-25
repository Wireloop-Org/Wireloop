-- name: UpsertUser :one
INSERT INTO users (
    github_id, username, avatar_url, access_token
) VALUES (
    $1, $2, $3, $4
)
ON CONFLICT (github_id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    access_token = EXCLUDED.access_token
RETURNING *;

-- name: GetUserByGithubID :one
SELECT * FROM users WHERE github_id = $1 LIMIT 1;