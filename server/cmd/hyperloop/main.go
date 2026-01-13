package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"wireloop/internal/api"
	"wireloop/internal/chat"
	"wireloop/internal/db"
	"wireloop/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
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

	maxConns := 10 // Default value
	if maxConnsStr := os.Getenv("MAX_DB_CONN"); maxConnsStr != "" {
		if parsedMaxConns, err := strconv.Atoi(maxConnsStr); err == nil {
			maxConns = parsedMaxConns
		} else {
			log.Printf("Invalid MAX_DB_CONN value: %s. Using default %d", maxConnsStr, maxConns)
		}
	}
	config.MaxConns = int32(maxConns)

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatalf("Unable to create connection pool: %v\n", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Database is unreachable: %v\n", err)
	}
	log.Println("Successfully connected to PostgreSQL (Supabase/RDS)")

	queries := db.New(pool)
	app := &App{
		Queries: queries,
		DBPool:  pool,
	}

	r := gin.Default()

	// CORS configuration
	frontendURL := os.Getenv("FRONTEND_URL")
	allowedOrigins := []string{"http://localhost:3000"}
	if frontendURL != "" {
		allowedOrigins = append(allowedOrigins, frontendURL)
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
	hub := chat.NewHub()
	Handler := &api.Handler{Queries: queries, Pool: pool, Hub: hub}
	// Auth routes (public)
	r.GET("/api/auth/callback", Handler.HandleGitHubCallback)
	r.GET("/api/auth/github", func(c *gin.Context) {
		clientID := os.Getenv("GITHUB_CLIENT_ID")
		if clientID == "" {
			log.Println("WARNING: GITHUB_CLIENT_ID is empty!")
		} else {
			log.Printf("Using GitHub Client ID: %s...", clientID[:10])
		}
		redirectURL := "https://github.com/login/oauth/authorize?client_id=" + clientID + "&scope=user:email"
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

		// WebSocket
		protected.GET("/ws", Handler.HandleWS)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Wireloop API starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// Simple test handler to verify DB access
func (app *App) testDBHandler(c *gin.Context) {
	// Example call to an sqlc generated function
	// user, err := app.Queries.GetUserByGithubID(c, 123456)
	c.JSON(http.StatusOK, gin.H{"message": "DB connection is live and queries are ready"})
}
