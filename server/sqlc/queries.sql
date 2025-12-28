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

-- name: GetProjectByOwnerAndName :one
SELECT * FROM projects
WHERE owner_id = $1 AND name = $2
LIMIT 1;

-- name: GetProjectsByOwner :many
SELECT *
FROM projects
WHERE owner_id = $1
ORDER BY created_at DESC;

-- name: CreateProject :one
INSERT INTO projects (github_repo_id, name, owner_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: CreateRule :one
INSERT INTO rules (project_id, criteria_type, threshold)
VALUES ($1, $2, $3)
RETURNING *;

-- name: AddMembership :exec
INSERT INTO memberships (user_id, project_id, role)
VALUES ($1, $2, $3);

-- name: SearchRepos :many
SELECT id, name
FROM projects
WHERE name ILIKE sqlc.arg(q) || '%'
ORDER BY similarity(name, sqlc.arg(q)) DESC
LIMIT sqlc.arg(n);

-- name: SearchReposFuzzy :many
SELECT id, name
FROM projects
WHERE name % sqlc.arg(q)
ORDER BY similarity(name, sqlc.arg(q)) DESC
LIMIT sqlc.arg(n);

-- name: AddMessage :exec
INSERT INTO messages (id, project_id , sender_id, content)
VALUES ($1, $2, $3, $4);


-- name: IsMember :one
SELECT 1 FROM memberships
WHERE user_id = $1 AND project_id = $2 LIMIT 1;
