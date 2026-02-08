package api

import (
	"crypto/sha256"
	"crypto/subtle"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// ============================================================================
// Observability — Admin-only endpoints for monitoring Wireloop
// Protected by OBS_USER / OBS_PASS basic auth
// ============================================================================

// AdminAuthMiddleware protects observability routes with basic auth
func AdminAuthMiddleware() gin.HandlerFunc {
	user := os.Getenv("OBS_USER")
	pass := os.Getenv("OBS_PASS")

	return func(c *gin.Context) {
		if user == "" || pass == "" {
			c.AbortWithStatusJSON(503, gin.H{"error": "observability not configured"})
			return
		}

		reqUser, reqPass, ok := c.Request.BasicAuth()
		if !ok {
			c.Header("WWW-Authenticate", `Basic realm="Wireloop Observability"`)
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		// Constant-time comparison
		uHash := sha256.Sum256([]byte(reqUser))
		pHash := sha256.Sum256([]byte(reqPass))
		euHash := sha256.Sum256([]byte(user))
		epHash := sha256.Sum256([]byte(pass))

		if subtle.ConstantTimeCompare(uHash[:], euHash[:]) != 1 ||
			subtle.ConstantTimeCompare(pHash[:], epHash[:]) != 1 {
			c.Header("WWW-Authenticate", `Basic realm="Wireloop Observability"`)
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		c.Next()
	}
}

// HandleObsStats returns key platform metrics
func (h *Handler) HandleObsStats(c *gin.Context) {
	ctx := c.Request.Context()
	stats := gin.H{}

	scanCount := func(query string) int {
		var n int
		if err := h.Pool.QueryRow(ctx, query).Scan(&n); err != nil {
			log.Printf("[obs] stats query failed: %s — %v", query, err)
		}
		return n
	}

	totalUsers := scanCount("SELECT COUNT(*) FROM users")
	usersToday := scanCount("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours'")
	usersWeek := scanCount("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'")

	totalMessages := scanCount("SELECT COUNT(*) FROM messages")
	messagesToday := scanCount("SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours'")

	totalProjects := scanCount("SELECT COUNT(*) FROM projects")
	totalMemberships := scanCount("SELECT COUNT(*) FROM memberships")
	totalChannels := scanCount("SELECT COUNT(*) FROM channels")

	totalNotifs := scanCount("SELECT COUNT(*) FROM notifications")
	unreadNotifs := scanCount("SELECT COUNT(*) FROM notifications WHERE is_read = FALSE")
	pinned := scanCount("SELECT COUNT(*) FROM messages WHERE is_pinned = TRUE")

	stats["total_users"] = totalUsers
	stats["users_today"] = usersToday
	stats["users_this_week"] = usersWeek
	stats["total_messages"] = totalMessages
	stats["messages_today"] = messagesToday
	stats["total_loops"] = totalProjects
	stats["total_memberships"] = totalMemberships
	stats["total_channels"] = totalChannels
	stats["total_notifications"] = totalNotifs
	stats["unread_notifications"] = unreadNotifs
	stats["pinned_messages"] = pinned

	// DB pool stats
	ps := h.Pool.Stat()
	stats["db_pool"] = gin.H{
		"total_conns":    ps.TotalConns(),
		"idle_conns":     ps.IdleConns(),
		"acquired_conns": ps.AcquiredConns(),
		"max_conns":      ps.MaxConns(),
	}

	c.JSON(200, stats)
}

// HandleObsUsers returns recent users with engagement stats
func (h *Handler) HandleObsUsers(c *gin.Context) {
	ctx := c.Request.Context()
	limit := 50
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}

	rows, err := h.Pool.Query(ctx, `
		SELECT u.id, u.username, u.avatar_url, u.github_id, u.profile_completed, u.created_at,
		       (SELECT COUNT(*) FROM memberships m WHERE m.user_id = u.id) AS loop_count,
		       (SELECT COUNT(*) FROM messages msg WHERE msg.sender_id = u.id) AS message_count
		FROM users u
		ORDER BY u.created_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		log.Printf("[obs] users query failed: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type UserInfo struct {
		ID               string    `json:"id"`
		Username         string    `json:"username"`
		AvatarURL        *string   `json:"avatar_url"`
		GitHubID         int64     `json:"github_id"`
		ProfileCompleted bool      `json:"profile_completed"`
		CreatedAt        time.Time `json:"created_at"`
		LoopCount        int       `json:"loop_count"`
		MessageCount     int       `json:"message_count"`
	}

	var users []UserInfo
	for rows.Next() {
		var u UserInfo
		if err := rows.Scan(&u.ID, &u.Username, &u.AvatarURL, &u.GitHubID, &u.ProfileCompleted, &u.CreatedAt, &u.LoopCount, &u.MessageCount); err != nil {
			continue
		}
		users = append(users, u)
	}
	if users == nil {
		users = []UserInfo{}
	}

	c.JSON(200, users)
}

// HandleObsErrors returns potential issues/anomalies
func (h *Handler) HandleObsErrors(c *gin.Context) {
	ctx := c.Request.Context()

	scanCount := func(label, query string) int {
		var n int
		if err := h.Pool.QueryRow(ctx, query).Scan(&n); err != nil {
			log.Printf("[obs] errors/%s query failed: %v", label, err)
		}
		return n
	}

	incompleteProfiles := scanCount("incomplete", "SELECT COUNT(*) FROM users WHERE profile_completed = FALSE")
	noLoops := scanCount("no_loops", "SELECT COUNT(*) FROM users WHERE id NOT IN (SELECT DISTINCT user_id FROM memberships)")
	orphanedMessages := scanCount("orphaned", "SELECT COUNT(*) FROM messages WHERE sender_id NOT IN (SELECT id FROM users)")
	deletedMessages := scanCount("deleted", "SELECT COUNT(*) FROM messages WHERE is_deleted = TRUE")

	c.JSON(200, gin.H{
		"incomplete_profiles": incompleteProfiles,
		"users_no_loops":      noLoops,
		"orphaned_messages":   orphanedMessages,
		"deleted_messages":    deletedMessages,
	})
}

// HandleObsTimeline returns messages per day for last 30 days
func (h *Handler) HandleObsTimeline(c *gin.Context) {
	ctx := c.Request.Context()

	rows, err := h.Pool.Query(ctx, `
		SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS count
		FROM messages
		WHERE created_at > NOW() - INTERVAL '30 days'
		GROUP BY day
		ORDER BY day ASC
	`)
	if err != nil {
		log.Printf("[obs] timeline query failed: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type DayCount struct {
		Day   string `json:"day"`
		Count int    `json:"count"`
	}

	var timeline []DayCount
	for rows.Next() {
		var dc DayCount
		var day time.Time
		if err := rows.Scan(&day, &dc.Count); err != nil {
			continue
		}
		dc.Day = day.Format("2006-01-02")
		timeline = append(timeline, dc)
	}
	if timeline == nil {
		timeline = []DayCount{}
	}

	c.JSON(200, timeline)
}

// HandleObsLoops returns the most active loops
func (h *Handler) HandleObsLoops(c *gin.Context) {
	ctx := c.Request.Context()

	rows, err := h.Pool.Query(ctx, `
		SELECT p.name,
		       (SELECT COUNT(*) FROM memberships m WHERE m.project_id = p.id) AS member_count,
		       (SELECT COUNT(*) FROM channels ch WHERE ch.project_id = p.id) AS channel_count,
		       (SELECT COUNT(*) FROM messages msg 
		        JOIN channels ch ON msg.channel_id = ch.id 
		        WHERE ch.project_id = p.id) AS total_messages,
		       (SELECT COUNT(*) FROM messages msg 
		        JOIN channels ch ON msg.channel_id = ch.id 
		        WHERE ch.project_id = p.id AND msg.created_at > NOW() - INTERVAL '24 hours') AS messages_today,
		       p.created_at
		FROM projects p
		ORDER BY messages_today DESC, total_messages DESC
		LIMIT 20
	`)
	if err != nil {
		log.Printf("[obs] loops query failed: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type LoopInfo struct {
		Name          string    `json:"name"`
		MemberCount   int       `json:"member_count"`
		ChannelCount  int       `json:"channel_count"`
		TotalMessages int       `json:"total_messages"`
		MessagesToday int       `json:"messages_today"`
		CreatedAt     time.Time `json:"created_at"`
	}

	var loops []LoopInfo
	for rows.Next() {
		var l LoopInfo
		if err := rows.Scan(&l.Name, &l.MemberCount, &l.ChannelCount, &l.TotalMessages, &l.MessagesToday, &l.CreatedAt); err != nil {
			continue
		}
		loops = append(loops, l)
	}
	if loops == nil {
		loops = []LoopInfo{}
	}

	c.JSON(200, loops)
}
