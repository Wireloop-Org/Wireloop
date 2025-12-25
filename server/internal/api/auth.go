package api

import (
	"net/http"
	"wireloop/internal/auth"
	"wireloop/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

// Handler holds dependencies for API handlers
type Handler struct {
	Queries *db.Queries
}

func (h *Handler) HandleGitHubCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No code provided"})
		return
	}

	token, err := auth.ExchangeCodeForToken(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange token"})
		return
	}

	ghUser, _ := auth.GetGitHubProfile(token)

	user, err := h.Queries.UpsertUser(c, db.UpsertUserParams{
		GithubID:    ghUser.ID,
		Username:    ghUser.Login,
		AvatarUrl:   pgtype.Text{String: ghUser.AvatarURL, Valid: true},
		AccessToken: token,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save user"})
		return
	}

	jwtToken, _ := auth.GenerateJWT(user.ID)

	c.Redirect(http.StatusTemporaryRedirect, "http://localhost:3000/auth/success?token="+jwtToken)
}
