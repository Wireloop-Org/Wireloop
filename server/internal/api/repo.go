package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"wireloop/internal/db"
	"wireloop/internal/types"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

type MakeChannelRequest struct {
	GithubRepoId int64        `json:"repo_id"`
	ChannelName  string       `json:"name"`
	Rules        []types.Rule `json:"rules"`
}

// HandleMakeChannel creates a new project/loop for a GitHub repository
func (h *Handler) HandleMakeChannel(c *gin.Context) {
	var req MakeChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	userID, ok := c.Get("user_id")
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}
	uid := userID.(pgtype.UUID)

	// Check if project with same name already exists for this user
	if _, err := h.Queries.GetProjectByOwnerAndName(c, db.GetProjectByOwnerAndNameParams{
		OwnerID: uid,
		Name:    req.ChannelName,
	}); err == nil {
		c.JSON(409, gin.H{"error": "A loop with this name already exists"})
		return
	}

	// Use a transaction to ensure atomicity
	tx, err := h.Pool.Begin(c)
	if err != nil {
		log.Printf("Failed to begin transaction: %v", err)
		c.JSON(500, gin.H{"error": "internal server error"})
		return
	}
	defer tx.Rollback(context.Background())

	qtx := h.Queries.WithTx(tx)

	project, err := qtx.CreateProject(c, db.CreateProjectParams{
		GithubRepoID: req.GithubRepoId,
		Name:         req.ChannelName,
		OwnerID:      uid,
	})
	if err != nil {
		log.Printf("CreateProject error: %v", err)
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			c.JSON(409, gin.H{"error": "A loop for this repository already exists"})
			return
		}
		c.JSON(500, gin.H{"error": "failed to create project: " + err.Error()})
		return
	}

	for _, r := range req.Rules {
		_, err := qtx.CreateRule(c, db.CreateRuleParams{
			ProjectID:    project.ID,
			CriteriaType: r.CriteriaType,
			Threshold:    strconv.Itoa(r.Threshold),
		})
		if err != nil {
			log.Printf("CreateRule error: %v", err)
			c.JSON(500, gin.H{"error": "failed to create rules: " + err.Error()})
			return
		}
	}

	err = qtx.AddMembership(c, db.AddMembershipParams{
		UserID:    uid,
		ProjectID: project.ID,
		Role:      pgtype.Text{String: "owner", Valid: true},
	})
	if err != nil {
		log.Printf("AddMembership error: %v", err)
		c.JSON(500, gin.H{"error": "failed to add membership: " + err.Error()})
		return
	}

	// Create default #general channel for the new loop
	channel, err := qtx.CreateChannel(c, db.CreateChannelParams{
		ProjectID:   project.ID,
		Name:        "general",
		Description: pgtype.Text{String: "General discussion", Valid: true},
		IsDefault:   pgtype.Bool{Bool: true, Valid: true},
		Position:    pgtype.Int4{Int32: 0, Valid: true},
	})
	if err != nil {
		log.Printf("CreateChannel error: %v", err)
		c.JSON(500, gin.H{"error": "failed to create default channel: " + err.Error()})
		return
	}

	// Commit the transaction
	if err := tx.Commit(c); err != nil {
		log.Printf("Failed to commit transaction: %v", err)
		c.JSON(500, gin.H{"error": "failed to save changes"})
		return
	}

	c.JSON(201, gin.H{
		"id":              project.ID,
		"name":            project.Name,
		"default_channel": channel.ID,
	})
}

func (h *Handler) HandlelistProjects(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}
	uid := userID.(pgtype.UUID)

	projects, err := h.Queries.GetProjectsByOwner(c, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch projects"})
		return
	}

	c.JSON(200, gin.H{
		"projects": projects,
	})
}

// GitHubRepo represents a GitHub repository
type GitHubRepo struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	FullName    string `json:"full_name"`
	Description string `json:"description"`
	Private     bool   `json:"private"`
	HTMLURL     string `json:"html_url"`
	Language    string `json:"language"`
	StarCount   int    `json:"stargazers_count"`
	ForksCount  int    `json:"forks_count"`
	Owner       struct {
		Login     string `json:"login"`
		AvatarURL string `json:"avatar_url"`
	} `json:"owner"`
}

// HandleGetGitHubRepos fetches the user's GitHub repositories
func (h *Handler) HandleGetGitHubRepos(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}
	uid := userID.(pgtype.UUID)

	// Get user's access token from DB
	user, err := h.Queries.GetUserByID(c, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get user"})
		return
	}

	// Debug: Check if token exists
	if user.AccessToken == "" {
		log.Printf("[GitHub API] No access token stored for user %s", user.Username)
		c.JSON(401, gin.H{
			"error":   "No GitHub access token",
			"message": "Please log out and log in again to connect your GitHub account",
		})
		return
	}

	// Debug: Log token length (not the actual token for security)
	log.Printf("[GitHub API] Fetching repos for user %s (token length: %d)", user.Username, len(user.AccessToken))

	// Fetch repos from GitHub API
	req, err := http.NewRequest("GET", "https://api.github.com/user/repos?sort=updated&per_page=100", nil)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to create request"})
		return
	}

	req.Header.Set("Authorization", "Bearer "+user.AccessToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to fetch repos from GitHub"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Debug: Log the error response from GitHub
		var errorBody map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errorBody)
		log.Printf("[GitHub API] Error %d for user %s: %v", resp.StatusCode, user.Username, errorBody)

		if resp.StatusCode == 401 {
			c.JSON(401, gin.H{
				"error":   "GitHub token expired or invalid",
				"message": "Please log out and log in again to refresh your GitHub access",
			})
			return
		}
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("GitHub API error: %d", resp.StatusCode)})
		return
	}

	var repos []GitHubRepo
	if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
		c.JSON(500, gin.H{"error": "failed to parse GitHub response"})
		return
	}

	c.JSON(200, gin.H{
		"repos": repos,
	})
}
