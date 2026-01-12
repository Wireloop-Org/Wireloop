package api

import (
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
	MessageBody string `json:"message_body"`
	ChannelID   string `json:"channel_id"`
}

type MessageResponse struct {
	ID             string `json:"id"`
	Content        string `json:"content"`
	SenderID       string `json:"sender_id"`
	SenderUsername string `json:"sender_username"`
	SenderAvatar   string `json:"sender_avatar"`
	CreatedAt      string `json:"created_at"`
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
		result[i] = MessageResponse{
			ID:             strconv.FormatInt(m.ID, 10),
			Content:        m.Content,
			SenderID:       utils.UUIDToStr(m.SenderID),
			SenderUsername: m.SenderUsername,
			SenderAvatar:   m.SenderAvatar.String,
			CreatedAt:      m.CreatedAt.Time.Format(time.RFC3339),
		}
	}

	// Reverse to get chronological order (oldest first)
	for i, j := 0, len(result)-1; i < j; i, j = i+1, j-1 {
		result[i], result[j] = result[j], result[i]
	}

	c.JSON(200, gin.H{"messages": result})
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
