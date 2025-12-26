package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// Claims represents the JWT claims structure
type Claims struct {
	UserID [16]byte `json:"user_id"`
	jwt.RegisteredClaims
}

// AuthMiddleware validates JWT tokens and sets user context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "your-secret-key"
		}

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Extract claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// Set user ID in context
		userIDBytes, ok := claims["user_id"].([]interface{})
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
			c.Abort()
			return
		}

		// Convert to pgtype.UUID
		var userIDBytes16 [16]byte
		for i, v := range userIDBytes {
			if i >= 16 {
				break
			}
			if num, ok := v.(float64); ok {
				userIDBytes16[i] = byte(num)
			}
		}

		c.Set("user_id", pgtype.UUID{Bytes: userIDBytes16, Valid: true})
		c.Next()
	}
}

// GetUserID extracts the user ID from context as pgtype.UUID
func GetUserID(c *gin.Context) (pgtype.UUID, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return pgtype.UUID{}, false
	}
	id, ok := userID.(pgtype.UUID)
	return id, ok
}

