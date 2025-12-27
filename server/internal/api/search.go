package api

import (
	"sync"
	"time"
	"wireloop/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
)

var (
	mu    sync.RWMutex
	cache = make(map[string]entry)
	ttl   = int64(30)
)

type entry struct {
	v   any
	exp int64
}

func (h *Handler) HandleSearchQuery(c *gin.Context) {
	raw := c.Query("q")
	if len(raw) < 2 {
		c.JSON(200, []any{})
		return
	}

	key := "repo:" + raw
	mu.RLock()
	if e, ok := cache[key]; ok && time.Now().Unix() < e.exp {
		mu.RUnlock()
		c.JSON(200, e.v)
		return
	}
	mu.RUnlock()

	q := pgtype.Text{String: raw, Valid: true}

	repos, err := h.Queries.SearchRepos(c, db.SearchReposParams{
		Q: q,
		N: 10,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	mu.Lock()
	cache[key] = entry{v: repos, exp: time.Now().Unix() + ttl}
	mu.Unlock()

	c.JSON(200, repos)
}
