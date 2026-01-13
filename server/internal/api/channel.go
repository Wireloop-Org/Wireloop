package api

import (
	"strconv"
	"time"
	utils "wireloop/internal"
	"wireloop/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

// ChannelResponse represents a channel in API responses
type ChannelResponse struct {
	ID          string `json:"id"`
	ProjectID   string `json:"project_id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsDefault   bool   `json:"is_default"`
	Position    int    `json:"position"`
	CreatedAt   string `json:"created_at"`
}

// CreateChannelRequest represents a request to create a new channel
type CreateChannelRequest struct {
	ProjectID   string `json:"project_id" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// UpdateChannelRequest represents a request to update a channel
type UpdateChannelRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Position    *int    `json:"position"`
}

// Helper to convert db.Channel to ChannelResponse
func channelToResponse(c db.Channel) ChannelResponse {
	return ChannelResponse{
		ID:          utils.UUIDToStr(c.ID),
		ProjectID:   utils.UUIDToStr(c.ProjectID),
		Name:        c.Name,
		Description: c.Description.String,
		IsDefault:   c.IsDefault.Bool,
		Position:    int(c.Position.Int32),
		CreatedAt:   c.CreatedAt.Time.Format(time.RFC3339),
	}
}

// HandleGetChannels returns all channels for a loop
func (h *Handler) HandleGetChannels(c *gin.Context) {
	loopName := c.Param("name")
	if loopName == "" {
		c.JSON(400, gin.H{"error": "loop name required"})
		return
	}

	// Get project by name
	project, err := h.Queries.GetProjectByName(c, loopName)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}

	// Get channels
	channels, err := h.Queries.GetChannelsByProject(c, project.ID)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get channels"})
		return
	}

	result := make([]ChannelResponse, len(channels))
	for i, ch := range channels {
		result[i] = ChannelResponse{
			ID:          utils.UUIDToStr(ch.ID),
			ProjectID:   utils.UUIDToStr(ch.ProjectID),
			Name:        ch.Name,
			Description: ch.Description.String,
			IsDefault:   ch.IsDefault.Bool,
			Position:    int(ch.Position.Int32),
			CreatedAt:   ch.CreatedAt.Time.Format(time.RFC3339),
		}
	}

	c.JSON(200, gin.H{"channels": result})
}

// HandleCreateChannel creates a new channel in a loop
func (h *Handler) HandleCreateChannel(c *gin.Context) {
	var req CreateChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	// Get project
	projectID, err := utils.StrToUUID(req.ProjectID)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid project id"})
		return
	}

	project, err := h.Queries.GetProjectByID(c, projectID)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}

	// Only owner can create channels
	if project.OwnerID != uid {
		// Check if user is a member with admin role
		// For now, only owners can create channels
		c.JSON(403, gin.H{"error": "only loop owner can create channels"})
		return
	}

	// Get current channel count for position
	count, err := h.Queries.GetChannelCount(c, projectID)
	if err != nil {
		count = 0
	}

	// Create channel
	channel, err := h.Queries.CreateChannel(c, db.CreateChannelParams{
		ProjectID:   projectID,
		Name:        req.Name,
		Description: pgtype.Text{String: req.Description, Valid: req.Description != ""},
		IsDefault:   pgtype.Bool{Bool: count == 0, Valid: true}, // First channel is default
		Position:    pgtype.Int4{Int32: int32(count), Valid: true},
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to create channel"})
		return
	}

	c.JSON(201, channelToResponse(channel))
}

// HandleUpdateChannel updates a channel
func (h *Handler) HandleUpdateChannel(c *gin.Context) {
	channelID := c.Param("id")
	if channelID == "" {
		c.JSON(400, gin.H{"error": "channel id required"})
		return
	}

	var req UpdateChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	// Get channel
	channelUUID, err := utils.StrToUUID(channelID)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid channel id"})
		return
	}

	channel, err := h.Queries.GetChannelByID(c, channelUUID)
	if err != nil {
		c.JSON(404, gin.H{"error": "channel not found"})
		return
	}

	// Get project to verify ownership
	project, err := h.Queries.GetProjectByID(c, channel.ProjectID)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}

	if project.OwnerID != uid {
		c.JSON(403, gin.H{"error": "only loop owner can update channels"})
		return
	}

	// Build update params
	params := db.UpdateChannelParams{ID: channelUUID}
	if req.Name != nil {
		params.Name = *req.Name
	}
	if req.Description != nil {
		params.Description = pgtype.Text{String: *req.Description, Valid: true}
	}
	if req.Position != nil {
		params.Position = pgtype.Int4{Int32: int32(*req.Position), Valid: true}
	}

	updated, err := h.Queries.UpdateChannel(c, params)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to update channel"})
		return
	}

	c.JSON(200, channelToResponse(updated))
}

// HandleDeleteChannel deletes a channel
func (h *Handler) HandleDeleteChannel(c *gin.Context) {
	channelID := c.Param("id")
	if channelID == "" {
		c.JSON(400, gin.H{"error": "channel id required"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	channelUUID, err := utils.StrToUUID(channelID)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid channel id"})
		return
	}

	channel, err := h.Queries.GetChannelByID(c, channelUUID)
	if err != nil {
		c.JSON(404, gin.H{"error": "channel not found"})
		return
	}

	// Get project to verify ownership
	project, err := h.Queries.GetProjectByID(c, channel.ProjectID)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}

	if project.OwnerID != uid {
		c.JSON(403, gin.H{"error": "only loop owner can delete channels"})
		return
	}

	// Don't allow deleting the last channel
	count, err := h.Queries.GetChannelCount(c, channel.ProjectID)
	if err == nil && count <= 1 {
		c.JSON(400, gin.H{"error": "cannot delete the last channel"})
		return
	}

	// If deleting default channel, make another one default
	if channel.IsDefault.Bool {
		channels, err := h.Queries.GetChannelsByProject(c, channel.ProjectID)
		if err == nil && len(channels) > 1 {
			for _, ch := range channels {
				if ch.ID != channelUUID {
					h.Queries.SetDefaultChannel(c, db.SetDefaultChannelParams{
						ProjectID: channel.ProjectID,
						ID:        ch.ID,
					})
					break
				}
			}
		}
	}

	if err := h.Queries.DeleteChannel(c, channelUUID); err != nil {
		c.JSON(500, gin.H{"error": "failed to delete channel"})
		return
	}

	c.JSON(200, gin.H{"message": "channel deleted"})
}

// HandleGetChannelMessages returns messages for a specific channel
func (h *Handler) HandleGetChannelMessages(c *gin.Context) {
	channelID := c.Param("id")
	if channelID == "" {
		c.JSON(400, gin.H{"error": "channel id required"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	channelUUID, err := utils.StrToUUID(channelID)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid channel id"})
		return
	}

	// Get channel to get project ID
	channel, err := h.Queries.GetChannelByID(c, channelUUID)
	if err != nil {
		c.JSON(404, gin.H{"error": "channel not found"})
		return
	}

	// Verify membership
	if _, err := h.Queries.IsMember(c, db.IsMemberParams{
		UserID: uid, ProjectID: channel.ProjectID,
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

// EnsureDefaultChannel creates a default #general channel for a project if none exists
func (h *Handler) EnsureDefaultChannel(c *gin.Context, projectID pgtype.UUID) (*db.Channel, error) {
	// Check if any channels exist
	channels, err := h.Queries.GetChannelsByProject(c, projectID)
	if err != nil {
		return nil, err
	}

	if len(channels) > 0 {
		// Return the default channel or first channel
		for _, ch := range channels {
			if ch.IsDefault.Bool {
				return &db.Channel{
					ID:          ch.ID,
					ProjectID:   ch.ProjectID,
					Name:        ch.Name,
					Description: ch.Description,
					IsDefault:   ch.IsDefault,
					Position:    ch.Position,
					CreatedAt:   ch.CreatedAt,
				}, nil
			}
		}
		ch := channels[0]
		return &db.Channel{
			ID:          ch.ID,
			ProjectID:   ch.ProjectID,
			Name:        ch.Name,
			Description: ch.Description,
			IsDefault:   ch.IsDefault,
			Position:    ch.Position,
			CreatedAt:   ch.CreatedAt,
		}, nil
	}

	// Create default #general channel
	channel, err := h.Queries.CreateChannel(c, db.CreateChannelParams{
		ProjectID:   projectID,
		Name:        "general",
		Description: pgtype.Text{String: "General discussion", Valid: true},
		IsDefault:   pgtype.Bool{Bool: true, Valid: true},
		Position:    pgtype.Int4{Int32: 0, Valid: true},
	})
	if err != nil {
		return nil, err
	}

	return &channel, nil
}
