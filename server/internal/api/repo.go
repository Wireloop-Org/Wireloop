package api

import (
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

    v, ok := c.Get("user_id")
    if !ok {
        c.JSON(401, gin.H{"error": "unauthorized"})
        return
    }
    userID := v.(pgtype.UUID)

    if _, err := h.Queries.GetProjectByOwnerAndName(c, db.GetProjectByOwnerAndNameParams{
        OwnerID: userID,
        Name:    req.ChannelName,
    }); err == nil {
        c.JSON(409, gin.H{"error": "project already exists"})
        return
    }

    project, err := h.Queries.CreateProject(c, db.CreateProjectParams{
        GithubRepoID: req.GithubRepoId,
        FullName:     req.ChannelName,
        Name:         req.ChannelName,
        OwnerID:      userID,
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
        UserID:    userID,
        ProjectID: project.ID,
        Role:      pgtype.Text{String: "owner", Valid: true},
    })

    c.JSON(201, gin.H{
        "id":   project.ID,
        "name": project.Name,
    })
}



func (h *Handler) HandlelistProjects(c *gin.Context) {
    v, ok := c.Get("user_id")
    if !ok {
        c.JSON(401, gin.H{"error": "unauthorized"})
        return
    }
    userID := v.(pgtype.UUID)

    projects, err := h.Queries.GetProjectsByOwner(c, userID)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to fetch projects"})
        return
    }

    c.JSON(200, gin.H{
        "projects": projects,
    })
}
