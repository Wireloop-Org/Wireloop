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
			"is_member":   true,
			"can_join":    true,
			"message":     "You are already a member of this loop",
			"results":     []gatekeeper.VerificationResult{},
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
			"is_member":   false,
			"can_join":    true,
			"message":     "This loop is open to everyone",
			"results":     []gatekeeper.VerificationResult{},
		})
		return
	}

	// Parse repo owner/name from project (we need to store this or derive it)
	// For now, assume the loop name is the repo name and get owner from the owner
	owner, err := h.Queries.GetUserByID(c, project.OwnerID)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get owner info"})
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

	// Verify access
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

	// Get rules
	rules, err := h.Queries.GetRulesByProject(c, project.ID)
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to get rules"})
		return
	}

	// Verify if there are rules
	if len(rules) > 0 {
		owner, err := h.Queries.GetUserByID(c, project.OwnerID)
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to get owner"})
			return
		}

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

