package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"wireloop/internal/db"
	"wireloop/internal/types"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)


type MakeChannelRequest struct{
	GithubRepoId int64 `json:"repo_id"`
	ChannelName string `json:"name"`
	Rules []types.Rule `json:"rules"`
}

// the repo is already present at this point so no need to check whether the repo is present or not
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

    if _, err := h.Queries.GetProjectByOwnerAndName(c, db.GetProjectByOwnerAndNameParams{
        OwnerID: uid,
        Name:    req.ChannelName,
    }); err == nil {
        c.JSON(409, gin.H{"error": "project already exists"})
        return
    }

    project, err := h.Queries.CreateProject(c, db.CreateProjectParams{
        GithubRepoID: req.GithubRepoId,
        FullName:     req.ChannelName,
        Name:         req.ChannelName,
        OwnerID:      uid,
    })
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to create project"})
        return
    }

    for _, r := range req.Rules {
        _, err := h.Queries.CreateRule(c, db.CreateRuleParams{
            ProjectID:    project.ID,
            CriteriaType: r.CriteriaType,
            Threshold:    strconv.Itoa(r.Threshold),
        })
        if err != nil {
            c.JSON(500, gin.H{"error": "failed to create rules"})
            return
        }
    }

    _ = h.Queries.AddMembership(c, db.AddMembershipParams{
        UserID:    uid,
        ProjectID: project.ID,
        Role:      pgtype.Text{String: "owner", Valid: true},
    })

    c.JSON(201, gin.H{
        "id":   project.ID,
        "name": project.Name,
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
