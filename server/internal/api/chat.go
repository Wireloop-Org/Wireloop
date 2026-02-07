package api

import (
	"context"
	"fmt"
	"strconv"
	"time"
	utils "wireloop/internal"
	"wireloop/internal/db"
	"wireloop/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

type MessagePayload struct {
	MessageBody string  `json:"message_body"`
	ChannelID   string  `json:"channel_id"`
	ParentID    *string `json:"parent_id,omitempty"` // For thread replies
}

// DeleteMessageRequest represents a request to delete a message
type DeleteMessageRequest struct {
	MessageID string `json:"message_id" binding:"required"`
}

type MessageResponse struct {
	ID             string  `json:"id"`
	Content        string  `json:"content"`
	SenderID       string  `json:"sender_id"`
	SenderUsername string  `json:"sender_username"`
	SenderAvatar   string  `json:"sender_avatar"`
	CreatedAt      string  `json:"created_at"`
	ChannelID      string  `json:"channel_id,omitempty"`
	ParentID       *string `json:"parent_id,omitempty"`
	ReplyCount     int     `json:"reply_count"`
}

func (h *Handler) HandleSendMessage(c *gin.Context) {
	var req MessagePayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	channelID, err := utils.StrToUUID(req.ChannelID)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid channel id"})
		return
	}

	if _, err := h.Queries.IsMember(c, db.IsMemberParams{
		UserID: uid, ProjectID: channelID,
	}); err != nil {
		c.JSON(403, gin.H{"error": "not a member"})
		return
	}

	// Get sender info for broadcast
	user, err := h.Queries.GetUserByID(c, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get user"})
		return
	}

	msgID := utils.GetMessageId()
	now := time.Now()

	if err := h.Queries.AddMessage(c, db.AddMessageParams{
		ID:        msgID,
		SenderID:  uid,
		Content:   req.MessageBody,
		ProjectID: channelID,
	}); err != nil {
		c.JSON(500, gin.H{"error": "db tx failed"})
		return
	}

	// Broadcast with full message info
	msg := MessageResponse{
		ID:             strconv.FormatInt(msgID, 10),
		Content:        req.MessageBody,
		SenderID:       utils.UUIDToStr(uid),
		SenderUsername: user.Username,
		SenderAvatar:   user.AvatarUrl.String,
		CreatedAt:      now.Format(time.RFC3339),
	}

	h.PushToWS(req.ChannelID, gin.H{
		"type":    "message",
		"payload": msg,
	})

	// Process @mentions asynchronously
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		h.ProcessMentions(ctx, req.MessageBody, uid, user.Username, msgID, channelID, channelID)
	}()

	c.JSON(200, msg)
}

// HandleGetMessages returns paginated message history for a channel
func (h *Handler) HandleGetMessages(c *gin.Context) {
	loopName := c.Param("name")
	channelID := c.Query("channel_id")
	if loopName == "" {
		c.JSON(400, gin.H{"error": "loop name required"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	// Get project by name
	project, err := h.Queries.GetProjectByName(c, loopName)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}

	// Verify membership
	if _, err := h.Queries.IsMember(c, db.IsMemberParams{
		UserID: uid, ProjectID: project.ID,
	}); err != nil {
		c.JSON(403, gin.H{"error": "not a member"})
		return
	}

	// Get channel UUID - if not provided, use default channel
	var channelUUID pgtype.UUID
	if channelID != "" {
		if err := channelUUID.Scan(channelID); err != nil {
			c.JSON(400, gin.H{"error": "invalid channel id"})
			return
		}
	} else {
		// Get default channel for the loop
		defaultChannel, err := h.EnsureDefaultChannel(c, project.ID)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to get default channel"})
			return
		}
		channelUUID = defaultChannel.ID
	}

	// Parse pagination
	limit := int32(50)
	offset := int32(0)
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = int32(v)
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = int32(v)
		}
	}

	messages, err := h.Queries.GetMessages(c, db.GetMessagesParams{
		ChannelID: channelUUID,
		Limit:     limit,
		Offset:    offset,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get messages"})
		return
	}

	// Transform to response format
	result := make([]MessageResponse, len(messages))
	for i, m := range messages {
		var parentID *string
		if m.ParentID.Valid {
			pid := strconv.FormatInt(m.ParentID.Int64, 10)
			parentID = &pid
		}
		result[i] = MessageResponse{
			ID:             strconv.FormatInt(m.ID, 10),
			Content:        m.Content,
			SenderID:       utils.UUIDToStr(m.SenderID),
			SenderUsername: m.SenderUsername,
			SenderAvatar:   m.SenderAvatar.String,
			CreatedAt:      m.CreatedAt.Time.Format(time.RFC3339),
			ParentID:       parentID,
			ReplyCount:     int(m.ReplyCount.Int32),
		}
	}

	// Reverse to get chronological order (oldest first)
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}

	c.JSON(200, gin.H{"messages": result})
}

// HandleGetThreadReplies returns all replies to a specific message
func (h *Handler) HandleGetThreadReplies(c *gin.Context) {
	messageIDStr := c.Param("message_id")
	if messageIDStr == "" {
		c.JSON(400, gin.H{"error": "message id required"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	messageID, err := strconv.ParseInt(messageIDStr, 10, 64)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid message id"})
		return
	}

	// Get the parent message to verify channel access
	parentMsg, err := h.Queries.GetMessageByID(c, messageID)
	if err != nil {
		c.JSON(404, gin.H{"error": "message not found"})
		return
	}

	// Verify membership via project_id
	if _, err := h.Queries.IsMember(c, db.IsMemberParams{
		UserID: uid, ProjectID: parentMsg.ProjectID,
	}); err != nil {
		c.JSON(403, gin.H{"error": "not a member"})
		return
	}

	// Parse pagination
	limit := int32(50)
	offset := int32(0)
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = int32(v)
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = int32(v)
		}
	}

	replies, err := h.Queries.GetThreadReplies(c, db.GetThreadRepliesParams{
		ParentID: pgtype.Int8{Int64: parentMsg.ID, Valid: true},
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get replies"})
		return
	}

	result := make([]MessageResponse, len(replies))
	for i, m := range replies {
		var parentID *string
		if m.ParentID.Valid {
			pid := strconv.FormatInt(m.ParentID.Int64, 10)
			parentID = &pid
		}
		result[i] = MessageResponse{
			ID:             strconv.FormatInt(m.ID, 10),
			Content:        m.Content,
			SenderID:       utils.UUIDToStr(m.SenderID),
			SenderUsername: m.SenderUsername,
			SenderAvatar:   m.SenderAvatar.String,
			CreatedAt:      m.CreatedAt.Time.Format(time.RFC3339),
			ParentID:       parentID,
		}
	}

	c.JSON(200, gin.H{"replies": result, "parent_id": messageIDStr})
}

// HandleDeleteMessage soft-deletes a message (only by sender or loop owner)
func (h *Handler) HandleDeleteMessage(c *gin.Context) {
	messageIDStr := c.Param("message_id")
	if messageIDStr == "" {
		c.JSON(400, gin.H{"error": "message id required"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	messageID, err := strconv.ParseInt(messageIDStr, 10, 64)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid message id"})
		return
	}

	// Get the message
	msg, err := h.Queries.GetMessageByID(c, messageID)
	if err != nil {
		c.JSON(404, gin.H{"error": "message not found"})
		return
	}

	// Get project to check ownership
	project, err := h.Queries.GetProjectByID(c, msg.ProjectID)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get project"})
		return
	}

	// Only sender or project owner can delete
	isSender := msg.SenderID == uid
	isOwner := project.OwnerID == uid
	if !isSender && !isOwner {
		c.JSON(403, gin.H{"error": "only message sender or loop owner can delete"})
		return
	}

	// Soft delete the message
	if err := h.Queries.SoftDeleteMessage(c, messageID); err != nil {
		c.JSON(500, gin.H{"error": "failed to delete message"})
		return
	}

	// If it was a reply, decrement parent's reply count
	if msg.ParentID.Valid {
		h.Queries.DecrementReplyCount(c, msg.ParentID.Int64)
	}

	// Broadcast deletion to WebSocket
	h.PushToWS(utils.UUIDToStr(msg.ChannelID), gin.H{
		"type":       "message_deleted",
		"message_id": messageIDStr,
	})

	c.JSON(200, gin.H{"message": "deleted", "id": messageIDStr})
}

// HandleGetLoopDetails returns loop info including members
func (h *Handler) HandleGetLoopDetails(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(400, gin.H{"error": "loop name required"})
		return
	}

	project, err := h.Queries.GetProjectByName(c, name)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}

	members, err := h.Queries.GetLoopMembers(c, project.ID)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get members"})
		return
	}

	// Check if current user is a member
	// Try to get user ID from context (set by middleware) or extract from token directly
	isMember := false
	uid, ok := utils.GetUserIdFromContext(c)

	// If not in context, try extracting from Authorization header directly
	if !ok {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && len(authHeader) > 7 {
			tokenString := authHeader[7:] // Remove "Bearer "
			uid, ok = middleware.ExtractUserFromToken(tokenString)
		}
	}

	if ok {
		_, err := h.Queries.IsMember(c, db.IsMemberParams{
			UserID: uid, ProjectID: project.ID,
		})
		isMember = err == nil
	}

	c.JSON(200, gin.H{
		"id":         utils.UUIDToStr(project.ID),
		"name":       project.Name,
		"owner_id":   utils.UUIDToStr(project.OwnerID),
		"created_at": project.CreatedAt.Time.Format(time.RFC3339),
		"is_member":  isMember,
		"members":    formatMembers(members),
	})
}

func formatMembers(members []db.GetLoopMembersRow) []gin.H {
	result := make([]gin.H, len(members))
	for i, m := range members {
		result[i] = gin.H{
			"id":           utils.UUIDToStr(m.ID),
			"username":     m.Username,
			"avatar_url":   m.AvatarUrl.String,
			"display_name": m.DisplayName.String,
			"role":         m.Role.String,
			"joined_at":    m.JoinedAt.Time.Format(time.RFC3339),
		}
	}
	return result
}

func (h *Handler) PushToWS(projectID string, msg any) {
	fmt.Printf("[WS] Broadcasting to room %s\n", projectID)
	h.Hub.Broadcast(projectID, msg)
}

// HandleBrowseLoops returns a paginated list of all loops
func (h *Handler) HandleBrowseLoops(c *gin.Context) {
	limit := int32(20)
	offset := int32(0)

	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 50 {
			limit = int32(v)
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = int32(v)
		}
	}

	loops, err := h.Queries.GetAllLoops(c, db.GetAllLoopsParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get loops"})
		return
	}

	result := make([]gin.H, len(loops))
	for i, l := range loops {
		result[i] = gin.H{
			"id":             utils.UUIDToStr(l.ID),
			"name":           l.Name,
			"owner_username": l.OwnerUsername,
			"owner_avatar":   l.OwnerAvatar.String,
			"member_count":   l.MemberCount,
			"created_at":     l.CreatedAt.Time.Format(time.RFC3339),
		}
	}

	c.JSON(200, gin.H{"loops": result})
}

// HandleGetMyMemberships returns all loops the current user is a member of
func (h *Handler) HandleGetMyMemberships(c *gin.Context) {
	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	memberships, err := h.Queries.GetUserMemberships(c, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get memberships"})
		return
	}

	result := make([]gin.H, len(memberships))
	for i, m := range memberships {
		result[i] = gin.H{
			"loop_id":   utils.UUIDToStr(m.ProjectID),
			"loop_name": m.ProjectName,
			"role":      m.Role.String,
			"joined_at": m.JoinedAt.Time.Format(time.RFC3339),
		}
	}

	c.JSON(200, gin.H{"memberships": result})
}
