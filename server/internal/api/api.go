package api

import (
	"wireloop/internal/chat"
	"wireloop/internal/db"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler holds dependencies for API handlers
type Handler struct {
	Queries *db.Queries
	Pool    *pgxpool.Pool
	Hub     *chat.Hub
}
