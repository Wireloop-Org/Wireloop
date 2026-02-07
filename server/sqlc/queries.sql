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
INSERT INTO messages (id, project_id, channel_id, sender_id, content, parent_id)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: AddReply :exec
INSERT INTO messages (id, project_id, channel_id, sender_id, content, parent_id)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: IncrementReplyCount :exec
UPDATE messages SET reply_count = reply_count + 1 WHERE id = $1;

-- name: DecrementReplyCount :exec
UPDATE messages SET reply_count = GREATEST(0, reply_count - 1) WHERE id = $1;


-- name: IsMember :one
SELECT 1 FROM memberships
WHERE user_id = $1 AND project_id = $2 LIMIT 1;

-- name: GetMessages :many
SELECT 
    m.id,
    m.content,
    m.created_at,
    m.sender_id,
    m.channel_id,
    m.parent_id,
    m.reply_count,
    u.username AS sender_username,
    u.avatar_url AS sender_avatar
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.channel_id = $1 
  AND m.parent_id IS NULL 
  AND (m.is_deleted = FALSE OR m.is_deleted IS NULL)
ORDER BY m.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetThreadReplies :many
SELECT 
    m.id,
    m.content,
    m.created_at,
    m.sender_id,
    m.channel_id,
    m.parent_id,
    u.username AS sender_username,
    u.avatar_url AS sender_avatar
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.parent_id = $1 
  AND (m.is_deleted = FALSE OR m.is_deleted IS NULL)
ORDER BY m.created_at ASC
LIMIT $2 OFFSET $3;

-- name: GetMessageByID :one
SELECT * FROM messages WHERE id = $1 LIMIT 1;

-- name: SoftDeleteMessage :exec
UPDATE messages 
SET is_deleted = TRUE, deleted_at = NOW(), content = '[Message deleted]'
WHERE id = $1;

-- name: HardDeleteMessage :exec
DELETE FROM messages WHERE id = $1;

-- name: GetMessagesByProject :many
SELECT 
    m.id,
    m.content,
    m.created_at,
    m.sender_id,
    m.channel_id,
    m.parent_id,
    m.reply_count,
    u.username AS sender_username,
    u.avatar_url AS sender_avatar
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.project_id = $1 
  AND m.parent_id IS NULL
  AND (m.is_deleted = FALSE OR m.is_deleted IS NULL)
ORDER BY m.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetProjectByID :one
SELECT * FROM projects WHERE id = $1 LIMIT 1;

-- name: GetProjectByName :one
SELECT * FROM projects WHERE name = $1 LIMIT 1;

-- name: GetLoopMembers :many
SELECT 
    u.id,
    u.username,
    u.avatar_url,
    u.display_name,
    mem.role,
    mem.joined_at
FROM memberships mem
JOIN users u ON mem.user_id = u.id
WHERE mem.project_id = $1
ORDER BY mem.joined_at ASC;

-- name: GetRulesByProject :many
SELECT * FROM rules
WHERE project_id = $1
ORDER BY created_at ASC;

-- name: GetAllLoops :many
SELECT 
    p.id,
    p.name,
    p.github_repo_id,
    p.created_at,
    u.username AS owner_username,
    u.avatar_url AS owner_avatar,
    (SELECT COUNT(*) FROM memberships m WHERE m.project_id = p.id) AS member_count
FROM projects p
JOIN users u ON p.owner_id = u.id
ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2;

-- name: GetUserMemberships :many
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    mem.role,
    mem.joined_at
FROM memberships mem
JOIN projects p ON mem.project_id = p.id
WHERE mem.user_id = $1
ORDER BY mem.joined_at DESC;

-- ============================================================================
-- CHANNEL QUERIES
-- ============================================================================

-- name: CreateChannel :one
INSERT INTO channels (project_id, name, description, is_default, position)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetChannelsByProject :many
SELECT 
    id,
    project_id,
    name,
    description,
    is_default,
    position,
    created_at
FROM channels
WHERE project_id = $1
ORDER BY position ASC, created_at ASC;

-- name: GetChannelByID :one
SELECT * FROM channels WHERE id = $1 LIMIT 1;

-- name: GetChannelByProjectAndName :one
SELECT * FROM channels 
WHERE project_id = $1 AND name = $2 
LIMIT 1;

-- name: GetDefaultChannel :one
SELECT * FROM channels 
WHERE project_id = $1 AND is_default = TRUE 
LIMIT 1;

-- name: UpdateChannel :one
UPDATE channels SET
    name = COALESCE($2, name),
    description = COALESCE($3, description),
    position = COALESCE($4, position),
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteChannel :exec
DELETE FROM channels WHERE id = $1;

-- name: GetChannelCount :one
SELECT COUNT(*) FROM channels WHERE project_id = $1;

-- name: SetDefaultChannel :exec
UPDATE channels 
SET is_default = (id = $2)
WHERE project_id = $1;

-- ============================================================================
-- PINNED MESSAGES
-- ============================================================================

-- name: PinMessage :exec
UPDATE messages 
SET is_pinned = TRUE, pinned_by = $2, pinned_at = NOW()
WHERE id = $1;

-- name: UnpinMessage :exec
UPDATE messages 
SET is_pinned = FALSE, pinned_by = NULL, pinned_at = NULL
WHERE id = $1;

-- name: GetPinnedMessages :many
SELECT 
    m.id,
    m.content,
    m.created_at,
    m.sender_id,
    m.channel_id,
    m.parent_id,
    m.reply_count,
    m.pinned_at,
    u.username AS sender_username,
    u.avatar_url AS sender_avatar,
    pinner.username AS pinned_by_username
FROM messages m
JOIN users u ON m.sender_id = u.id
LEFT JOIN users pinner ON m.pinned_by = pinner.id
WHERE m.channel_id = $1 
  AND m.is_pinned = TRUE
  AND (m.is_deleted = FALSE OR m.is_deleted IS NULL)
ORDER BY m.pinned_at DESC;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- name: CreateNotification :exec
INSERT INTO notifications (id, user_id, type, message_id, project_id, channel_id, actor_id, actor_username, content_preview)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);

-- name: GetNotifications :many
SELECT * FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetUnreadNotificationCount :one
SELECT COUNT(*) FROM notifications
WHERE user_id = $1 AND is_read = FALSE;

-- name: MarkNotificationRead :exec
UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2;

-- name: MarkAllNotificationsRead :exec
UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE;

-- ============================================================================
-- MEMBER SEARCH (for @mentions autocomplete)
-- ============================================================================

-- name: SearchMembersByUsername :many
SELECT 
    u.id,
    u.username,
    u.avatar_url,
    u.display_name
FROM memberships mem
JOIN users u ON mem.user_id = u.id
WHERE mem.project_id = $1
  AND u.username ILIKE $2 || '%'
ORDER BY u.username ASC
LIMIT 10;

-- name: GetUserByUsername2 :one
SELECT id FROM users WHERE username = $1 LIMIT 1;
