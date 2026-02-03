package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	"github.com/ulule/limiter/v3/drivers/store/memory"
)

// RateLimitMiddleware creates a rate limiter middleware
// Default: 100 requests per minute per IP
func RateLimitMiddleware() gin.HandlerFunc {
	rateStr := os.Getenv("RATE_LIMIT")
	if rateStr == "" {
		rateStr = "100-M" // 100 requests per minute (SOTA for APIs)
	}

	rate, err := limiter.NewRateFromFormatted(rateStr)
	if err != nil {
		// Fallback to default
		rate = limiter.Rate{
			Period: 60,
			Limit:  100,
		}
	}

	store := memory.NewStore()
	instance := limiter.New(store, rate)

	return mgin.NewMiddleware(instance, mgin.WithLimitReachedHandler(func(c *gin.Context) {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":       "rate_limit_exceeded",
			"message":     "Too many requests, please slow down",
			"retry_after": "60s",
		})
		c.Abort()
	}))
}

// StrictRateLimitMiddleware for sensitive endpoints (auth, etc.)
// Default: 10 requests per minute per IP
func StrictRateLimitMiddleware() gin.HandlerFunc {
	rate := limiter.Rate{
		Period: 60,
		Limit:  10,
	}

	store := memory.NewStore()
	instance := limiter.New(store, rate)

	return mgin.NewMiddleware(instance, mgin.WithLimitReachedHandler(func(c *gin.Context) {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":       "rate_limit_exceeded",
			"message":     "Too many requests to this endpoint",
			"retry_after": "60s",
		})
		c.Abort()
	}))
}

// WebSocketRateLimitMiddleware for WebSocket connections
// Default: 5 connections per minute per IP (prevents connection spam)
func WebSocketRateLimitMiddleware() gin.HandlerFunc {
	rate := limiter.Rate{
		Period: 60,
		Limit:  5,
	}

	store := memory.NewStore()
	instance := limiter.New(store, rate)

	return mgin.NewMiddleware(instance, mgin.WithLimitReachedHandler(func(c *gin.Context) {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":   "connection_limit_exceeded",
			"message": "Too many WebSocket connection attempts",
		})
		c.Abort()
	}))
}
