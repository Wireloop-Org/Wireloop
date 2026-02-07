package api

import (
	"strconv"
	"time"
	utils "wireloop/internal"
	"wireloop/internal/db"

	"github.com/gin-gonic/gin"
)

// PinnedMessageResponse extends MessageResponse with pin info
type PinnedMessageResponse struct {
	MessageResponse
	PinnedAt         string `json:"pinned_at"`
	PinnedByUsername string `json:"pinned_by_username"`
}

// HandlePinMessage pins a message in a channel
func (h *Handler) HandlePinMessage(c *gin.Context) {
	messageIDStr := c.Param("message_id")
	messageID, err := strconv.ParseInt(messageIDStr, 10, 64)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid message id"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	ctx := c.Request.Context()

	// Get the message to verify it exists
	msg, err := h.Queries.GetMessageByID(ctx, messageID)
	if err != nil {
		c.JSON(404, gin.H{"error": "message not found"})
		return
	}

	// Verify user is member of the project
	if _, err := h.Queries.IsMember(ctx, db.IsMemberParams{
		UserID: uid, ProjectID: msg.ProjectID,
	}); err != nil {
		c.JSON(403, gin.H{"error": "not a member"})
		return
	}

	// Pin the message
	if err := h.Queries.PinMessage(ctx, db.PinMessageParams{
		ID:       messageID,
		PinnedBy: uid,
	}); err != nil {
		c.JSON(500, gin.H{"error": "failed to pin message"})
		return
	}

	// Broadcast pin event via WebSocket
	channelID := utils.UUIDToStr(msg.ChannelID)
	user, _ := h.Queries.GetUserByID(ctx, uid)

	h.Hub.Broadcast(channelID, WSOutMessage{
		Type:      "message_pinned",
		ChannelID: channelID,
		Payload: gin.H{
			"message_id": messageIDStr,
			"pinned_by":  user.Username,
			"pinned_at":  time.Now().Format(time.RFC3339),
		},
	})

	c.JSON(200, gin.H{"success": true})
}

// HandleUnpinMessage unpins a message
func (h *Handler) HandleUnpinMessage(c *gin.Context) {
	messageIDStr := c.Param("message_id")
	messageID, err := strconv.ParseInt(messageIDStr, 10, 64)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid message id"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	ctx := c.Request.Context()

	msg, err := h.Queries.GetMessageByID(ctx, messageID)
	if err != nil {
		c.JSON(404, gin.H{"error": "message not found"})
		return
	}

	if _, err := h.Queries.IsMember(ctx, db.IsMemberParams{
		UserID: uid, ProjectID: msg.ProjectID,
	}); err != nil {
		c.JSON(403, gin.H{"error": "not a member"})
		return
	}

	if err := h.Queries.UnpinMessage(ctx, messageID); err != nil {
		c.JSON(500, gin.H{"error": "failed to unpin message"})
		return
	}

	channelID := utils.UUIDToStr(msg.ChannelID)
	h.Hub.Broadcast(channelID, WSOutMessage{
		Type:      "message_unpinned",
		ChannelID: channelID,
		Payload:   gin.H{"message_id": messageIDStr},
	})

	c.JSON(200, gin.H{"success": true})
}

// HandleGetPinnedMessages gets all pinned messages for a channel
func (h *Handler) HandleGetPinnedMessages(c *gin.Context) {
	channelIDStr := c.Param("id")
	channelID, err := utils.StrToUUID(channelIDStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid channel id"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	ctx := c.Request.Context()

	// Verify channel belongs to a project user is member of
	channel, err := h.Queries.GetChannelByID(ctx, channelID)
	if err != nil {
		c.JSON(404, gin.H{"error": "channel not found"})
		return
	}

	if _, err := h.Queries.IsMember(ctx, db.IsMemberParams{
		UserID: uid, ProjectID: channel.ProjectID,
	}); err != nil {
		c.JSON(403, gin.H{"error": "not a member"})
		return
	}

	pinned, err := h.Queries.GetPinnedMessages(ctx, channelID)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get pinned messages"})
		return
	}

	result := make([]PinnedMessageResponse, 0, len(pinned))
	for _, m := range pinned {
		var parentID *string
		if m.ParentID.Valid {
			s := strconv.FormatInt(m.ParentID.Int64, 10)
			parentID = &s
		}
		pinnedAt := ""
		if m.PinnedAt.Valid {
			pinnedAt = m.PinnedAt.Time.Format(time.RFC3339)
		}
		result = append(result, PinnedMessageResponse{
			MessageResponse: MessageResponse{
				ID:             strconv.FormatInt(m.ID, 10),
				Content:        m.Content,
				SenderID:       utils.UUIDToStr(m.SenderID),
				SenderUsername: m.SenderUsername,
				SenderAvatar:   m.SenderAvatar.String,
				CreatedAt:      m.CreatedAt.Time.Format(time.RFC3339),
				ChannelID:      channelIDStr,
				ParentID:       parentID,
				ReplyCount:     int(m.ReplyCount.Int32),
			},
			PinnedAt:         pinnedAt,
			PinnedByUsername: m.PinnedByUsername.String,
		})
	}

	c.JSON(200, result)
}
