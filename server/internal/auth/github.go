package auth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type GitHubTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
	Error       string `json:"error"`
	ErrorDesc   string `json:"error_description"`
}

// GitHubUser represents the user profile from GitHub API
type GitHubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	AvatarURL string `json:"avatar_url"`
}

func ExchangeCodeForToken(code string) (string, error) {
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")

	requestBody, _ := json.Marshal(map[string]string{
		"client_id":     clientID,
		"client_secret": clientSecret,
		"code":          code,
	})

	req, _ := http.NewRequest("POST", "https://github.com/login/oauth/access_token", bytes.NewBuffer(requestBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var tokenResp GitHubTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", err
	}

	if tokenResp.Error != "" {
		log.Printf("[auth] GitHub token exchange error: %s - %s", tokenResp.Error, tokenResp.ErrorDesc)
		return "", fmt.Errorf("GitHub OAuth error: %s", tokenResp.ErrorDesc)
	}

	if tokenResp.AccessToken == "" {
		log.Printf("[auth] GitHub returned empty access token")
		return "", fmt.Errorf("GitHub returned empty access token")
	}

	log.Printf("[auth] Token exchange successful, scope: %s", tokenResp.Scope)
	return tokenResp.AccessToken, nil
}

// GetGitHubProfile fetches the user profile from GitHub API
func GetGitHubProfile(accessToken string) (*GitHubUser, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[auth] GitHub /user API returned status %d for token: %s...", resp.StatusCode, accessToken[:min(10, len(accessToken))])
		return nil, fmt.Errorf("GitHub API returned status: %d", resp.StatusCode)
	}

	var user GitHubUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

// GenerateJWT creates a JWT token for the authenticated user
func GenerateJWT(userID pgtype.UUID) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-secret-key" // fallback for development
	}

	claims := jwt.MapClaims{
		"user_id": userID.Bytes,
		"exp":     time.Now().Add(time.Hour * 24 * 60).Unix(), // 60 days
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
