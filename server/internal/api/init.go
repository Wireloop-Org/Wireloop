package api

import (
	"context"
	"log"
	"sync"
	"time"
	utils "wireloop/internal"
	"wireloop/internal/db"

	"github.com/gin-gonic/gin"
)

// InitResponse aggregates all data needed for app initialization in ONE request
type InitResponse struct {
	Profile     *ProfileData     `json:"profile"`
	Projects    []ProjectData    `json:"projects"`
	Memberships []MembershipData `json:"memberships"`
	Timing      map[string]int64 `json:"_timing,omitempty"` // Debug timing info
}

type ProfileData struct {
	ID               string `json:"id"`
	Username         string `json:"username"`
	AvatarURL        string `json:"avatar_url"`
	DisplayName      string `json:"display_name"`
	ProfileCompleted bool   `json:"profile_completed"`
	CreatedAt        string `json:"created_at"`
}

type ProjectData struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	GithubRepoID int64  `json:"github_repo_id"`
	CreatedAt    string `json:"created_at"`
}

type MembershipData struct {
	LoopID   string `json:"loop_id"`
	LoopName string `json:"loop_name"`
	Role     string `json:"role"`
	JoinedAt string `json:"joined_at"`
}

// HandleInit returns ALL data needed for app initialization in a single request
// Uses goroutines to parallelize all DB queries for maximum performance
func (h *Handler) HandleInit(c *gin.Context) {
	start := time.Now()
	timing := make(map[string]int64)

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	var (
		wg          sync.WaitGroup
		profile     db.GetUserProfileRow
		projects    []db.Project
		memberships []db.GetUserMembershipsRow
		profileErr  error
		projectsErr error
		membersErr  error
	)

	ctx := c.Request.Context()

	// Launch all queries in parallel using goroutines
	wg.Add(3)

	go func() {
		defer wg.Done()
		t := time.Now()
		profile, profileErr = h.Queries.GetUserProfile(ctx, uid)
		timing["profile_ms"] = time.Since(t).Milliseconds()
	}()

	go func() {
		defer wg.Done()
		t := time.Now()
		projects, projectsErr = h.Queries.GetProjectsByOwner(ctx, uid)
		timing["projects_ms"] = time.Since(t).Milliseconds()
	}()

	go func() {
		defer wg.Done()
		t := time.Now()
		memberships, membersErr = h.Queries.GetUserMemberships(ctx, uid)
		timing["memberships_ms"] = time.Since(t).Milliseconds()
	}()

	wg.Wait()

	// Check for errors
	if profileErr != nil {
		log.Printf("[Init] Profile error: %v", profileErr)
		c.JSON(500, gin.H{"error": "failed to get profile"})
		return
	}

	// Build response
	resp := InitResponse{
		Profile: &ProfileData{
			ID:               utils.UUIDToStr(profile.ID),
			Username:         profile.Username,
			AvatarURL:        profile.AvatarUrl.String,
			DisplayName:      profile.DisplayName.String,
			ProfileCompleted: profile.ProfileCompleted.Bool,
			CreatedAt:        profile.CreatedAt.Time.Format(time.RFC3339),
		},
		Projects:    make([]ProjectData, 0),
		Memberships: make([]MembershipData, 0),
	}

	if projectsErr == nil && projects != nil {
		for _, p := range projects {
			resp.Projects = append(resp.Projects, ProjectData{
				ID:           utils.UUIDToStr(p.ID),
				Name:         p.Name,
				GithubRepoID: p.GithubRepoID,
				CreatedAt:    p.CreatedAt.Time.Format(time.RFC3339),
			})
		}
	}

	if membersErr == nil && memberships != nil {
		for _, m := range memberships {
			resp.Memberships = append(resp.Memberships, MembershipData{
				LoopID:   utils.UUIDToStr(m.ProjectID),
				LoopName: m.ProjectName,
				Role:     m.Role.String,
				JoinedAt: m.JoinedAt.Time.Format(time.RFC3339),
			})
		}
	}

	timing["total_ms"] = time.Since(start).Milliseconds()
	resp.Timing = timing

	log.Printf("[Init] Completed in %dms (profile: %dms, projects: %dms, memberships: %dms)",
		timing["total_ms"], timing["profile_ms"], timing["projects_ms"], timing["memberships_ms"])

	c.JSON(200, resp)
}

// LoopFullResponse aggregates loop details + messages in ONE request
type LoopFullResponse struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	OwnerID       string            `json:"owner_id"`
	CreatedAt     string            `json:"created_at"`
	IsMember      bool              `json:"is_member"`
	Members       []gin.H           `json:"members"`
	Channels      []ChannelResponse `json:"channels"`
	ActiveChannel *ChannelResponse  `json:"active_channel,omitempty"`
	Messages      []MessageResponse `json:"messages"`
	Timing        map[string]int64  `json:"_timing,omitempty"`
}

// HandleLoopFull returns loop details + members + channels + messages in a single request
// This eliminates the sequential loading of loop details then messages
func (h *Handler) HandleLoopFull(c *gin.Context) {
	start := time.Now()
	timing := make(map[string]int64)

	name := c.Param("name")
	if name == "" {
		c.JSON(400, gin.H{"error": "loop name required"})
		return
	}

	// Optional channel_id query param to load specific channel
	channelIDParam := c.Query("channel_id")

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	ctx := c.Request.Context()

	// First get the project (needed for other queries)
	t := time.Now()
	project, err := h.Queries.GetProjectByName(ctx, name)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}
	timing["project_ms"] = time.Since(t).Milliseconds()

	var (
		wg            sync.WaitGroup
		members       []db.GetLoopMembersRow
		channels      []db.GetChannelsByProjectRow
		messages      []db.GetMessagesRow
		isMember      bool
		membersErr    error
		channelsErr   error
		messagesErr   error
		activeChannel *db.GetChannelsByProjectRow
	)

	// Launch parallel queries (except messages which depends on channel)
	wg.Add(3)

	go func() {
		defer wg.Done()
		t := time.Now()
		members, membersErr = h.Queries.GetLoopMembers(ctx, project.ID)
		timing["members_ms"] = time.Since(t).Milliseconds()
	}()

	go func() {
		defer wg.Done()
		t := time.Now()
		_, err := h.Queries.IsMember(ctx, db.IsMemberParams{
			UserID:    uid,
			ProjectID: project.ID,
		})
		isMember = err == nil
		timing["membership_check_ms"] = time.Since(t).Milliseconds()
	}()

	go func() {
		defer wg.Done()
		t := time.Now()
		channels, channelsErr = h.Queries.GetChannelsByProject(ctx, project.ID)
		// Auto-create default channel for legacy loops without channels
		if channelsErr == nil && len(channels) == 0 {
			defaultCh, err := h.EnsureDefaultChannel(c, project.ID)
			if err == nil && defaultCh != nil {
				// Re-fetch channels after creating default
				channels, channelsErr = h.Queries.GetChannelsByProject(ctx, project.ID)
			}
		}
		timing["channels_ms"] = time.Since(t).Milliseconds()
	}()

	wg.Wait()

	if membersErr != nil {
		c.JSON(500, gin.H{"error": "failed to get members"})
		return
	}

	// Determine active channel
	if channelsErr == nil && len(channels) > 0 {
		if channelIDParam != "" {
			// Use specified channel
			for i := range channels {
				if utils.UUIDToStr(channels[i].ID) == channelIDParam {
					activeChannel = &channels[i]
					break
				}
			}
		}
		// Fall back to default or first channel
		if activeChannel == nil {
			for i := range channels {
				if channels[i].IsDefault.Bool {
					activeChannel = &channels[i]
					break
				}
			}
		}
		if activeChannel == nil {
			activeChannel = &channels[0]
		}
	}

	// Fetch messages for active channel if member
	if isMember && activeChannel != nil {
		t := time.Now()
		messages, messagesErr = h.Queries.GetMessages(ctx, db.GetMessagesParams{
			ChannelID: activeChannel.ID,
			Limit:     50,
			Offset:    0,
		})
		timing["messages_ms"] = time.Since(t).Milliseconds()
	}

	// Build response
	resp := LoopFullResponse{
		ID:        utils.UUIDToStr(project.ID),
		Name:      project.Name,
		OwnerID:   utils.UUIDToStr(project.OwnerID),
		CreatedAt: project.CreatedAt.Time.Format(time.RFC3339),
		IsMember:  isMember,
		Members:   formatMembers(members),
		Channels:  make([]ChannelResponse, 0),
		Messages:  make([]MessageResponse, 0),
	}

	// Add channels to response
	if channelsErr == nil && channels != nil {
		for _, ch := range channels {
			resp.Channels = append(resp.Channels, ChannelResponse{
				ID:          utils.UUIDToStr(ch.ID),
				ProjectID:   utils.UUIDToStr(ch.ProjectID),
				Name:        ch.Name,
				Description: ch.Description.String,
				IsDefault:   ch.IsDefault.Bool,
				Position:    int(ch.Position.Int32),
				CreatedAt:   ch.CreatedAt.Time.Format(time.RFC3339),
			})
		}
	}

	// Add active channel info
	if activeChannel != nil {
		active := ChannelResponse{
			ID:          utils.UUIDToStr(activeChannel.ID),
			ProjectID:   utils.UUIDToStr(activeChannel.ProjectID),
			Name:        activeChannel.Name,
			Description: activeChannel.Description.String,
			IsDefault:   activeChannel.IsDefault.Bool,
			Position:    int(activeChannel.Position.Int32),
			CreatedAt:   activeChannel.CreatedAt.Time.Format(time.RFC3339),
		}
		resp.ActiveChannel = &active
	}

	// Only include messages if user is a member
	if isMember && messagesErr == nil && messages != nil {
		msgList := make([]MessageResponse, len(messages))
		for i, m := range messages {
			var parentID *string
			if m.ParentID.Valid {
				pid := utils.FormatMessageID(m.ParentID.Int64)
				parentID = &pid
			}
			msgList[i] = MessageResponse{
				ID:             utils.FormatMessageID(m.ID),
				Content:        m.Content,
				SenderID:       utils.UUIDToStr(m.SenderID),
				SenderUsername: m.SenderUsername,
				SenderAvatar:   m.SenderAvatar.String,
				CreatedAt:      m.CreatedAt.Time.Format(time.RFC3339),
				ParentID:       parentID,
				ReplyCount:     int(m.ReplyCount.Int32),
			}
		}
		// Reverse to chronological order
		for i, j := 0, len(msgList)-1; i < j; i, j = i+1, j-1 {
			msgList[i], msgList[j] = msgList[j], msgList[i]
		}
		resp.Messages = msgList
	}

	timing["total_ms"] = time.Since(start).Milliseconds()
	resp.Timing = timing

	log.Printf("[LoopFull] %s completed in %dms (project: %dms, members: %dms, channels: %dms, messages: %dms)",
		name, timing["total_ms"], timing["project_ms"], timing["members_ms"], timing["channels_ms"], timing["messages_ms"])

	c.JSON(200, resp)
}

// HandlePrefetch returns minimal data for prefetching (hover optimization)
func (h *Handler) HandlePrefetch(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(400, gin.H{"error": "loop name required"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 100*time.Millisecond)
	defer cancel()

	project, err := h.Queries.GetProjectByName(ctx, name)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}

	// Just return basic info for prefetching
	c.JSON(200, gin.H{
		"id":   utils.UUIDToStr(project.ID),
		"name": project.Name,
	})
}
