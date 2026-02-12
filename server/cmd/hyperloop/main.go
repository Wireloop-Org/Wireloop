package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"wireloop/internal/api"
	"wireloop/internal/auth"
	"wireloop/internal/chat"
	"wireloop/internal/db"
	"wireloop/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

type App struct {
	Queries *db.Queries
	DBPool  *pgxpool.Pool
}

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		if err := godotenv.Load(); err != nil {
			log.Println("No .env file found, reading from system environment")
		}
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set in environment")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Unable to parse database URL: %v\n", err)
	}

	// Connection pool settings
	maxConns := 10
	if maxConnsStr := os.Getenv("MAX_DB_CONN"); maxConnsStr != "" {
		if parsedMaxConns, err := strconv.Atoi(maxConnsStr); err == nil {
			maxConns = parsedMaxConns
		} else {
			log.Printf("Invalid MAX_DB_CONN value: %s. Using default %d", maxConnsStr, maxConns)
		}
	}
	config.MaxConns = int32(maxConns)
	config.MinConns = 2                         // Minimal warm connections
	config.MaxConnLifetime = 30 * time.Minute   // Refresh connections periodically
	config.MaxConnIdleTime = 5 * time.Minute    // Close idle connections
	config.HealthCheckPeriod = 30 * time.Second // Check connection health

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatalf("Unable to create connection pool: %v\n", err)
	}
	defer pool.Close()

	// Retry ping — Supabase pooler may need time to free slots during deploys
	var pingErr error
	for i := 0; i < 5; i++ {
		retryCtx, retryCancel := context.WithTimeout(context.Background(), 5*time.Second)
		pingErr = pool.Ping(retryCtx)
		retryCancel()
		if pingErr == nil {
			break
		}
		log.Printf("DB ping attempt %d/5 failed: %v — retrying in 3s...", i+1, pingErr)
		time.Sleep(3 * time.Second)
	}
	if pingErr != nil {
		log.Fatalf("Database is unreachable after 5 attempts: %v\n", pingErr)
	}
	log.Println("Successfully connected to PostgreSQL")

	queries := db.New(pool)
	app := &App{
		Queries: queries,
		DBPool:  pool,
	}

	// Initialize Redis for pub/sub (horizontal scaling)
	var rdb *redis.Client
	redisURL := os.Getenv("REDIS_URL")
	if redisURL != "" {
		opt, err := redis.ParseURL(redisURL)
		if err != nil {
			log.Printf("Warning: Invalid REDIS_URL, running without Redis: %v", err)
		} else {
			rdb = redis.NewClient(opt)
			if err := rdb.Ping(ctx).Err(); err != nil {
				log.Printf("Warning: Redis connection failed, running without Redis: %v", err)
				rdb = nil
			} else {
				log.Println("Connected to Redis for pub/sub scaling")
			}
		}
	} else {
		log.Println("REDIS_URL not set, running in single-server mode (no horizontal scaling)")
	}

	r := gin.Default()

	// GZIP compression - ~70% bandwidth savings on JSON responses
	r.Use(gzip.Gzip(gzip.BestSpeed))

	// Global rate limiting - 100 req/min per IP (prevents abuse)
	r.Use(middleware.RateLimitMiddleware())

	// CORS configuration
	frontendURL := os.Getenv("FRONTEND_URL")
	allowedOrigins := []string{"http://localhost:3000"}
	if frontendURL != "" {
		allowedOrigins = append(allowedOrigins, frontendURL)
	}
	if obsURL := os.Getenv("OBS_FRONTEND_URL"); obsURL != "" {
		allowedOrigins = append(allowedOrigins, obsURL)
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "wireloop-api",
			"time":    time.Now().Format(time.RFC3339),
		})
	})

	r.GET("/api/test-db", app.testDBHandler)
	hub := chat.NewHub(rdb)
	Handler := &api.Handler{Queries: queries, Pool: pool, Hub: hub}

	// Auth routes (public) - strict rate limiting to prevent brute force
	authRateLimit := middleware.StrictRateLimitMiddleware()
	r.GET("/api/auth/callback", authRateLimit, Handler.HandleGitHubCallback)
	r.GET("/api/auth/github", authRateLimit, func(c *gin.Context) {
		clientID := os.Getenv("GITHUB_CLIENT_ID")
		if clientID == "" {
			log.Println("WARNING: GITHUB_CLIENT_ID is empty!")
			c.JSON(500, gin.H{"error": "OAuth not configured"})
			return
		}

		// Build callback URL — auto-detect from request if BACKEND_URL not set
		backendURL := os.Getenv("BACKEND_URL")
		if backendURL == "" {
			// Auto-detect from the incoming request
			scheme := "https"
			if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") == "" {
				scheme = "http"
			} else if proto := c.GetHeader("X-Forwarded-Proto"); proto != "" {
				scheme = proto
			}
			host := c.GetHeader("X-Forwarded-Host")
			if host == "" {
				host = c.Request.Host
			}
			backendURL = scheme + "://" + host
			log.Printf("[auth] BACKEND_URL not set, auto-detected: %s", backendURL)
		}
		callbackURL := backendURL + "/api/auth/callback"

		// Generate CSRF state token
		state := auth.GenerateState()
		log.Printf("[auth] OAuth flow started, clientID=%s..., callback=%s, state=%s", clientID[:min(10, len(clientID))], callbackURL, state[:8])

		redirectURL := fmt.Sprintf(
			"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&state=%s&scope=repo",
			clientID,
			url.QueryEscape(callbackURL),
			state,
		)
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
	})

	// Public profile route
	r.GET("/api/users/:username", Handler.GetPublicProfile)

	// Semi-public routes (work for both logged-in and anonymous users)
	// Optional auth lets us check membership for logged-in users
	r.GET("/api/loops/:name", middleware.OptionalAuthMiddleware(), Handler.HandleGetLoopDetails)
	r.GET("/api/loops", Handler.HandleBrowseLoops)

	// Protected routes (require auth)
	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		// OPTIMIZED: Single endpoint for all initial data (profile + projects + memberships)
		protected.GET("/init", Handler.HandleInit)

		// OPTIMIZED: Single endpoint for loop details + messages
		protected.GET("/loops/:name/full", Handler.HandleLoopFull)

		// Prefetch endpoint (for hover optimization)
		protected.GET("/loops/:name/prefetch", Handler.HandlePrefetch)

		// Profile
		protected.GET("/profile", Handler.GetProfile)
		protected.PUT("/profile", Handler.UpdateProfile)
		protected.POST("/profile/avatar", Handler.UploadAvatar)

		// Loops management
		protected.POST("/channel", Handler.HandleMakeChannel)
		protected.GET("/projects", Handler.HandlelistProjects)
		protected.GET("/github/repos", Handler.HandleGetGitHubRepos)
		protected.GET("/search", Handler.HandleSearchQuery)
		protected.GET("/my-memberships", Handler.HandleGetMyMemberships)

		// Channel management (Discord-like sub-channels)
		protected.GET("/loops/:name/channels", Handler.HandleGetChannels)
		protected.POST("/channels", Handler.HandleCreateChannel)
		protected.PUT("/channels/:id", Handler.HandleUpdateChannel)
		protected.DELETE("/channels/:id", Handler.HandleDeleteChannel)
		protected.GET("/channels/:id/messages", Handler.HandleGetChannelMessages)

		// Gatekeeper - Verify & Join
		protected.POST("/verify-access", Handler.HandleVerifyAccess)
		protected.POST("/loops/:name/join", Handler.HandleJoinLoop)

		// Chat / Messages (use :name consistently to avoid route conflicts)
		protected.GET("/loops/:name/messages", Handler.HandleGetMessages)
		protected.POST("/loop/message", Handler.HandleSendMessage)

		// Thread / Replies
		protected.GET("/messages/:message_id/replies", Handler.HandleGetThreadReplies)
		protected.DELETE("/messages/:message_id", Handler.HandleDeleteMessage)

		// Pinned Messages
		protected.POST("/messages/:message_id/pin", Handler.HandlePinMessage)
		protected.DELETE("/messages/:message_id/pin", Handler.HandleUnpinMessage)
		protected.GET("/channels/:id/pins", Handler.HandleGetPinnedMessages)

		// Notifications
		protected.GET("/notifications", Handler.HandleGetNotifications)
		protected.GET("/notifications/unread-count", Handler.HandleGetUnreadCount)
		protected.POST("/notifications/:id/read", Handler.HandleMarkRead)
		protected.POST("/notifications/read-all", Handler.HandleMarkAllRead)

		// Member search (for @mention autocomplete)
		protected.GET("/loops/:name/members/search", Handler.HandleSearchMembers)

		// GitHub Context + AI Summarization
		protected.GET("/loops/:name/github/issues", Handler.HandleGetGitHubIssues)
		protected.GET("/loops/:name/github/pulls", Handler.HandleGetGitHubPRs)
		protected.POST("/loops/:name/github/summarize", Handler.HandleGitHubSummarize)

		// PR Review Sync (two-way GitHub ↔ Wireloop)
		protected.GET("/loops/:name/github/pr/:number/comments", Handler.HandleGetPRComments)
		protected.POST("/loops/:name/github/pr-comment", Handler.HandlePostPRComment)

		// WebSocket - rate limited to prevent connection spam
		protected.GET("/ws", middleware.WebSocketRateLimitMiddleware(), Handler.HandleWS)
	}

	// ===== Admin / Observability routes (basic auth protected) =====
	admin := r.Group("/api/admin")
	admin.Use(api.AdminAuthMiddleware())
	{
		admin.GET("/stats", Handler.HandleObsStats)
		admin.GET("/users", Handler.HandleObsUsers)
		admin.GET("/errors", Handler.HandleObsErrors)
		admin.GET("/messages-timeline", Handler.HandleObsTimeline)
		admin.GET("/active-loops", Handler.HandleObsLoops)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Graceful shutdown
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r.Handler(),
	}

	go func() {
		log.Printf("Wireloop API starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server exited gracefully")
}

// Simple test handler to verify DB access
func (app *App) testDBHandler(c *gin.Context) {
	// Example call to an sqlc generated function
	// user, err := app.Queries.GetUserByGithubID(c, 123456)
	c.JSON(http.StatusOK, gin.H{"message": "DB connection is live and queries are ready"})
}
