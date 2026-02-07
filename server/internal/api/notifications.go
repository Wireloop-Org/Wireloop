package api

import (
	"context"
	"log"
	"regexp"
	"strconv"
	utils "wireloop/internal"
	"wireloop/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

// mentionRegex matches @username patterns in message content
var mentionRegex = regexp.MustCompile(`@([a-zA-Z0-9_-]+)`)

// NotificationResponse is what the frontend receives
type NotificationResponse struct {
	ID             string `json:"id"`
	Type           string `json:"type"`
	MessageID      string `json:"message_id,omitempty"`
	ProjectID      string `json:"project_id,omitempty"`
	ChannelID      string `json:"channel_id,omitempty"`
	ActorUsername  string `json:"actor_username"`
	ContentPreview string `json:"content_preview,omitempty"`
	IsRead         bool   `json:"is_read"`
	CreatedAt      string `json:"created_at"`
}

// HandleGetNotifications returns paginated notifications for the user
func (h *Handler) HandleGetNotifications(c *gin.Context) {
	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage > 50 {
		perPage = 50
	}
	offset := (page - 1) * perPage

	ctx := c.Request.Context()

	notifications, err := h.Queries.GetNotifications(ctx, db.GetNotificationsParams{
		UserID: uid,
		Limit:  int32(perPage),
		Offset: int32(offset),
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get notifications"})
		return
	}

	result := make([]NotificationResponse, 0, len(notifications))
	for _, n := range notifications {
		msgID := ""
		if n.MessageID.Valid {
			msgID = strconv.FormatInt(n.MessageID.Int64, 10)
		}
		result = append(result, NotificationResponse{
			ID:             strconv.FormatInt(n.ID, 10),
			Type:           n.Type,
			MessageID:      msgID,
			ProjectID:      utils.UUIDToStr(n.ProjectID),
			ChannelID:      utils.UUIDToStr(n.ChannelID),
			ActorUsername:  n.ActorUsername,
			ContentPreview: n.ContentPreview.String,
			IsRead:         n.IsRead.Bool,
			CreatedAt:      n.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	c.JSON(200, result)
}

// HandleGetUnreadCount returns the count of unread notifications
func (h *Handler) HandleGetUnreadCount(c *gin.Context) {
	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	count, err := h.Queries.GetUnreadNotificationCount(c.Request.Context(), uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get unread count"})
		return
	}

	c.JSON(200, gin.H{"count": count})
}

// HandleMarkRead marks a single notification as read
func (h *Handler) HandleMarkRead(c *gin.Context) {
	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	nidStr := c.Param("id")
	nid, err := strconv.ParseInt(nidStr, 10, 64)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid notification id"})
		return
	}

	if err := h.Queries.MarkNotificationRead(c.Request.Context(), db.MarkNotificationReadParams{
		ID:     nid,
		UserID: uid,
	}); err != nil {
		c.JSON(500, gin.H{"error": "failed to mark as read"})
		return
	}

	c.JSON(200, gin.H{"success": true})
}

// HandleMarkAllRead marks all notifications as read
func (h *Handler) HandleMarkAllRead(c *gin.Context) {
	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	if err := h.Queries.MarkAllNotificationsRead(c.Request.Context(), uid); err != nil {
		c.JSON(500, gin.H{"error": "failed to mark all as read"})
		return
	}

	c.JSON(200, gin.H{"success": true})
}

// HandleSearchMembers returns members matching a username prefix (for @mention autocomplete)
func (h *Handler) HandleSearchMembers(c *gin.Context) {
	loopName := c.Param("name")
	query := c.Query("q")
	if query == "" {
		c.JSON(200, []any{})
		return
	}

	ctx := c.Request.Context()

	project, err := h.Queries.GetProjectByName(ctx, loopName)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}

	members, err := h.Queries.SearchMembersByUsername(ctx, db.SearchMembersByUsernameParams{
		ProjectID: project.ID,
		Column2:   pgtype.Text{String: query, Valid: true},
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "search failed"})
		return
	}

	result := make([]gin.H, 0, len(members))
	for _, m := range members {
		result = append(result, gin.H{
			"id":           utils.UUIDToStr(m.ID),
			"username":     m.Username,
			"avatar_url":   m.AvatarUrl.String,
			"display_name": m.DisplayName.String,
		})
	}

	c.JSON(200, result)
}

// ProcessMentions extracts @mentions from content and creates notifications
// Called asynchronously after a message is sent
func (h *Handler) ProcessMentions(ctx context.Context, content string, senderID pgtype.UUID, senderUsername string, messageID int64, projectID, channelID pgtype.UUID) {
	matches := mentionRegex.FindAllStringSubmatch(content, -1)
	if len(matches) == 0 {
		return
	}

	// Deduplicate mentioned usernames
	seen := make(map[string]bool)
	preview := content
	if len(preview) > 100 {
		preview = preview[:100] + "..."
	}

	for _, match := range matches {
		username := match[1]
		if seen[username] {
			continue
		}
		seen[username] = true

		// Don't notify yourself
		if username == senderUsername {
			continue
		}

		// Look up the mentioned user (must be a member of the project)
		user, err := h.Queries.GetUserByUsername(ctx, username)
		if err != nil {
			continue // User doesn't exist, skip
		}

		// Check membership
		if _, err := h.Queries.IsMember(ctx, db.IsMemberParams{
			UserID: user.ID, ProjectID: projectID,
		}); err != nil {
			continue // Not a member, skip
		}

		notifID := utils.GetMessageId()
		if err := h.Queries.CreateNotification(ctx, db.CreateNotificationParams{
			ID:             notifID,
			UserID:         user.ID,
			Type:           "mention",
			MessageID:      pgtype.Int8{Int64: messageID, Valid: true},
			ProjectID:      projectID,
			ChannelID:      channelID,
			ActorID:        senderID,
			ActorUsername:  senderUsername,
			ContentPreview: pgtype.Text{String: preview, Valid: true},
		}); err != nil {
			log.Printf("[notifications] failed to create mention notification: %v", err)
		}

		// Send real-time notification via WebSocket
		h.Hub.NotifyUser(utils.UUIDToStr(user.ID), WSOutMessage{
			Type: "notification",
			Payload: gin.H{
				"id":              strconv.FormatInt(notifID, 10),
				"type":            "mention",
				"actor_username":  senderUsername,
				"content_preview": preview,
			},
		})
	}
}
