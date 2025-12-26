package api

import "wireloop/internal/db"

// Handler holds dependencies for API handlers
type Handler struct {
	Queries *db.Queries
}
