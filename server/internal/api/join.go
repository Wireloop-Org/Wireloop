package api

import (
	"strings"
	utils "wireloop/internal"
	"wireloop/internal/db"
	"wireloop/internal/gatekeeper"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

var gate = gatekeeper.New()

type VerifyAccessRequest struct {
	LoopName string `json:"loop_name" binding:"required"`
}

// HandleVerifyAccess checks if a user meets the contribution requirements for a loop
func (h *Handler) HandleVerifyAccess(c *gin.Context) {
	var req VerifyAccessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "loop_name required"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	// Get the user's GitHub token and username
	user, err := h.Queries.GetUserByID(c, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get user"})
		return
	}

	// Get the loop/project
	project, err := h.Queries.GetProjectByName(c, req.LoopName)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}

	// Check if already a member
	if _, err := h.Queries.IsMember(c, db.IsMemberParams{
		UserID:    uid,
		ProjectID: project.ID,
	}); err == nil {
		c.JSON(200, gin.H{
			"is_member": true,
			"can_join":  true,
			"message":   "You are already a member of this loop",
			"results":   []gatekeeper.VerificationResult{},
		})
		return
	}

	// Get the repo owner for GitHub API calls
	owner, err := h.Queries.GetUserByID(c, project.OwnerID)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get owner info"})
		return
	}

	// Check if user is a GitHub collaborator — bypass all rules
	isCollab, err := gate.CheckCollaborator(c, user.AccessToken, owner.Username, project.Name, user.Username)
	if err != nil {
		// Non-fatal: if we can't check, fall through to rules
		isCollab = false
	}

	if isCollab {
		c.JSON(200, gin.H{
			"is_member":       false,
			"can_join":        true,
			"is_collaborator": true,
			"message":         "You're a collaborator on this repo — welcome in!",
			"results":         []gatekeeper.VerificationResult{},
		})
		return
	}

	// Get the rules for this loop
	rules, err := h.Queries.GetRulesByProject(c, project.ID)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get rules"})
		return
	}

	// If no rules, anyone can join
	if len(rules) == 0 {
		c.JSON(200, gin.H{
			"is_member": false,
			"can_join":  true,
			"message":   "This loop is open to everyone",
			"results":   []gatekeeper.VerificationResult{},
		})
		return
	}

	// Convert rules to gatekeeper format
	gkRules := make([]gatekeeper.Rule, len(rules))
	for i, r := range rules {
		threshold, _ := gatekeeper.ParseThreshold(r.Threshold)
		gkRules[i] = gatekeeper.Rule{
			CriteriaType: gatekeeper.CriteriaType(r.CriteriaType),
			Threshold:    threshold,
		}
	}

	// Verify access against rules
	results, passed, err := gate.VerifyAccess(c, user.AccessToken, owner.Username, project.Name, user.Username, gkRules)
	if err != nil {
		c.JSON(500, gin.H{"error": "verification failed: " + err.Error()})
		return
	}

	message := "You meet all requirements! Click 'Join' to enter."
	if !passed {
		message = "You don't meet all requirements yet. Keep contributing!"
	}

	c.JSON(200, gin.H{
		"is_member": false,
		"can_join":  passed,
		"message":   message,
		"results":   results,
	})
}

// HandleJoinLoop adds a verified user to a loop
func (h *Handler) HandleJoinLoop(c *gin.Context) {
	loopName := c.Param("name")
	if loopName == "" {
		c.JSON(400, gin.H{"error": "loop name required"})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	// Get the user
	user, err := h.Queries.GetUserByID(c, uid)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get user"})
		return
	}

	// Get the loop
	project, err := h.Queries.GetProjectByName(c, loopName)
	if err != nil {
		c.JSON(404, gin.H{"error": "loop not found"})
		return
	}

	// Check if already a member - if so, just return success
	if _, err := h.Queries.IsMember(c, db.IsMemberParams{
		UserID:    uid,
		ProjectID: project.ID,
	}); err == nil {
		c.JSON(200, gin.H{
			"message": "You are already a member!",
			"loop":    loopName,
		})
		return
	}

	// Get repo owner for GitHub API calls
	owner, err := h.Queries.GetUserByID(c, project.OwnerID)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get owner"})
		return
	}

	// Check if user is a GitHub collaborator — bypass all rules
	isCollab, _ := gate.CheckCollaborator(c, user.AccessToken, owner.Username, project.Name, user.Username)

	if !isCollab {
		// Not a collaborator — enforce rules
		rules, err := h.Queries.GetRulesByProject(c, project.ID)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to get rules"})
			return
		}

		if len(rules) > 0 {
			gkRules := make([]gatekeeper.Rule, len(rules))
			for i, r := range rules {
				threshold, _ := gatekeeper.ParseThreshold(r.Threshold)
				gkRules[i] = gatekeeper.Rule{
					CriteriaType: gatekeeper.CriteriaType(r.CriteriaType),
					Threshold:    threshold,
				}
			}

			_, passed, err := gate.VerifyAccess(c, user.AccessToken, owner.Username, project.Name, user.Username, gkRules)
			if err != nil {
				c.JSON(500, gin.H{"error": "verification failed"})
				return
			}

			if !passed {
				c.JSON(403, gin.H{"error": "contribution requirements not met"})
				return
			}
		}
	}

	// Add membership
	if err := h.Queries.AddMembership(c, db.AddMembershipParams{
		UserID:    uid,
		ProjectID: project.ID,
		Role:      pgtype.Text{String: "contributor", Valid: true},
	}); err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			// Already a member - return success anyway
			c.JSON(200, gin.H{
				"message": "You are already a member!",
				"loop":    loopName,
			})
			return
		}
		c.JSON(500, gin.H{"error": "failed to join loop"})
		return
	}

	c.JSON(200, gin.H{
		"message": "Successfully joined the loop!",
		"loop":    loopName,
	})
}
