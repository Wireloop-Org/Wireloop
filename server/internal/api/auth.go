package api

import (
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"wireloop/internal/auth"
	"wireloop/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

func (h *Handler) HandleGitHubCallback(c *gin.Context) {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	// Helper to redirect errors to frontend instead of showing raw JSON on API domain
	redirectError := func(reason string) {
		log.Printf("[auth] OAuth callback failed: %s (remote_ip=%s, user_agent=%s)", reason, c.ClientIP(), c.GetHeader("User-Agent"))
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/auth/success?error="+url.QueryEscape(reason))
	}

	// Check for GitHub OAuth errors (user denied access, etc.)
	if ghError := c.Query("error"); ghError != "" {
		desc := c.Query("error_description")
		if desc == "" {
			desc = ghError
		}
		log.Printf("[auth] GitHub OAuth error: error=%s desc=%s", ghError, desc)
		redirectError(desc)
		return
	}

	code := c.Query("code")
	state := c.Query("state")
	if code == "" {
		redirectError("No authorization code received from GitHub")
		return
	}

	log.Printf("[auth] OAuth callback received, code=%s..., state=%s, ip=%s", code[:min(8, len(code))], state, c.ClientIP())

	token, err := auth.ExchangeCodeForToken(code)
	if err != nil {
		redirectError("Failed to exchange token: " + err.Error())
		return
	}

	ghUser, err := auth.GetGitHubProfile(token)
	if err != nil {
		redirectError("Failed to fetch GitHub profile: " + err.Error())
		return
	}

	log.Printf("[auth] GitHub user authenticated: %s (ID: %d)", ghUser.Login, ghUser.ID)

	user, err := h.Queries.UpsertUser(c, db.UpsertUserParams{
		GithubID:    ghUser.ID,
		Username:    ghUser.Login,
		AvatarUrl:   pgtype.Text{String: ghUser.AvatarURL, Valid: true},
		AccessToken: token,
	})
	if err != nil {
		redirectError("Failed to save user")
		return
	}

	jwtToken, err := auth.GenerateJWT(user.ID)
	if err != nil {
		redirectError("Failed to generate session token")
		return
	}

	log.Printf("[auth] Login successful: %s, redirecting to frontend", ghUser.Login)
	c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/auth/success?token="+jwtToken)
}

func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(h, "Bearer ")

		t, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
			return []byte(secret), nil
		})
		if err != nil || !t.Valid {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		claims := t.Claims.(jwt.MapClaims)
		c.Set("user_id", claims["user_id"])
		c.Next()
	}
}
