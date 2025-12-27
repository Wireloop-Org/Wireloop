package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"wireloop/internal/api"
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

	pool, err := pgxpool.New(ctx, dbURL)
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

	Handler := &api.Handler{Queries: queries, Pool: pool}
	// Auth routes (public)
	r.GET("/api/auth/callback", Handler.HandleGitHubCallback)
	r.GET("/api/auth/github", func(c *gin.Context) {
		clientID := os.Getenv("GITHUB_CLIENT_ID")
		redirectURL := "https://github.com/login/oauth/authorize?client_id=" + clientID + "&scope=user:email"
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
	})

	// Public profile route
	r.GET("/api/users/:username", Handler.GetPublicProfile)

	// Protected routes (require auth)
	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.GET("/profile", Handler.GetProfile)
		protected.PUT("/profile", Handler.UpdateProfile)
		protected.POST("/profile/avatar", Handler.UploadAvatar)
		protected.POST("/channel", Handler.HandleMakeChannel)
		protected.GET("/projects", Handler.HandlelistProjects)
		protected.GET("/github/repos", Handler.HandleGetGitHubRepos)
		protected.GET("/search", Handler.HandleSearchQuery)
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
