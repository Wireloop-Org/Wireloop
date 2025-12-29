package chat

import (
	"sync"
)

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{rooms: make(map[string]map[*Client]struct{})}
}

func (h *Hub) Join(room string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[room] == nil {
		h.rooms[room] = make(map[*Client]struct{})
	}
	h.rooms[room][c] = struct{}{}
}

func (h *Hub) Leave(room string, c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if m := h.rooms[room]; m != nil {
		delete(m, c)
		if len(m) == 0 {
			delete(h.rooms, room)
		}
	}
}

// Broadcast sends to all clients in a room
func (h *Hub) Broadcast(room string, msg any) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.rooms[room] {
		c.Send(msg)
	}
}

// BroadcastExcept sends to all clients except the sender (for optimistic UI)
func (h *Hub) BroadcastExcept(room string, msg any, except *Client) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.rooms[room] {
		if c != except {
			c.Send(msg)
		}
	}
}

// GetClient returns a client if they're in the room
func (h *Hub) GetClient(room string, client *Client) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if m := h.rooms[room]; m != nil {
		_, exists := m[client]
		return exists
	}
	return false
}
