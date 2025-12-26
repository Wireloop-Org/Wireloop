package api

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"strings"
	"wireloop/internal/db"
	"wireloop/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/nfnt/resize"
)

const (
	MaxAvatarSize = 200 * 1024 // 200KB
	MaxAvatarDim  = 256        // Max width/height in pixels
	MaxNameLength = 50
)

// ProfileResponse represents the profile data
type ProfileResponse struct {
	ID               string  `json:"id"`
	Username         string  `json:"username"`
	AvatarURL        *string `json:"avatar_url"`
	DisplayName      *string `json:"display_name"`
	ProfileCompleted bool    `json:"profile_completed"`
	CreatedAt        string  `json:"created_at"`
}

// UpdateProfileRequest represents the profile update payload
type UpdateProfileRequest struct {
	DisplayName *string `json:"display_name"`
}

// GetProfile returns the authenticated user's profile
func (h *Handler) GetProfile(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	profile, err := h.Queries.GetUserProfile(c, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	c.JSON(http.StatusOK, ProfileResponse{
		ID:               formatUUID(profile.ID.Bytes),
		Username:         profile.Username,
		AvatarURL:        nullableString(profile.AvatarUrl),
		DisplayName:      nullableString(profile.DisplayName),
		ProfileCompleted: profile.ProfileCompleted.Bool,
		CreatedAt:        profile.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	})
}

// UpdateProfile updates the authenticated user's profile
func (h *Handler) UpdateProfile(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate display name
	if req.DisplayName != nil && len(*req.DisplayName) > MaxNameLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Display name must be %d characters or less", MaxNameLength)})
		return
	}

	user, err := h.Queries.UpdateUserProfile(c, db.UpdateUserProfileParams{
		ID:          userID,
		DisplayName: toPgText(req.DisplayName),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, ProfileResponse{
		ID:               formatUUID(user.ID.Bytes),
		Username:         user.Username,
		AvatarURL:        nullableString(user.AvatarUrl),
		DisplayName:      nullableString(user.DisplayName),
		ProfileCompleted: user.ProfileCompleted.Bool,
		CreatedAt:        user.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	})
}

// UploadAvatar handles avatar image upload with compression
func (h *Handler) UploadAvatar(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// Check content type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File must be an image"})
		return
	}

	// Read file into memory
	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	// Process and compress image
	processedData, err := processAvatar(data, contentType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert to base64 data URL for storage
	dataURL := fmt.Sprintf("data:image/jpeg;base64,%s", base64.StdEncoding.EncodeToString(processedData))

	user, err := h.Queries.UpdateUserAvatar(c, db.UpdateUserAvatarParams{
		ID:        userID,
		AvatarUrl: pgtype.Text{String: dataURL, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update avatar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"avatar_url": user.AvatarUrl.String,
		"message":    "Avatar updated successfully",
	})
}

// GetPublicProfile returns a user's public profile by username
func (h *Handler) GetPublicProfile(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username required"})
		return
	}

	profile, err := h.Queries.GetPublicProfile(c, username)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           formatUUID(profile.ID.Bytes),
		"username":     profile.Username,
		"avatar_url":   nullableString(profile.AvatarUrl),
		"display_name": nullableString(profile.DisplayName),
		"created_at":   profile.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	})
}

// processAvatar resizes and compresses the avatar image
func processAvatar(data []byte, contentType string) ([]byte, error) {
	var img image.Image
	var err error

	reader := bytes.NewReader(data)
	switch {
	case strings.Contains(contentType, "jpeg"), strings.Contains(contentType, "jpg"):
		img, err = jpeg.Decode(reader)
	case strings.Contains(contentType, "png"):
		img, err = png.Decode(reader)
	default:
		return nil, fmt.Errorf("unsupported image format: %s", contentType)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	// Resize if needed
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	if width > MaxAvatarDim || height > MaxAvatarDim {
		if width > height {
			img = resize.Resize(MaxAvatarDim, 0, img, resize.Lanczos3)
		} else {
			img = resize.Resize(0, MaxAvatarDim, img, resize.Lanczos3)
		}
	}

	// Encode to JPEG with compression
	var buf bytes.Buffer
	quality := 85

	for quality >= 30 {
		buf.Reset()
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
			return nil, fmt.Errorf("failed to encode image: %w", err)
		}
		if buf.Len() <= MaxAvatarSize {
			break
		}
		quality -= 10
	}

	if buf.Len() > MaxAvatarSize {
		return nil, fmt.Errorf("image too large even after compression (max %dKB)", MaxAvatarSize/1024)
	}

	return buf.Bytes(), nil
}

// Helper functions
func formatUUID(bytes [16]byte) string {
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		bytes[0:4], bytes[4:6], bytes[6:8], bytes[8:10], bytes[10:16])
}

func nullableString(t pgtype.Text) *string {
	if t.Valid {
		return &t.String
	}
	return nil
}

func toPgText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}
