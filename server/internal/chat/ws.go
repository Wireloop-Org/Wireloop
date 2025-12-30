package chat

import (
	"sync"
)

type Hub struct {
	rooms sync.Map // room -> *sync.Map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{}
}

func (h *Hub) Join(room string, c *Client) {
	clients, _ := h.rooms.LoadOrStore(room, &sync.Map{})
	clients.(*sync.Map).Store(c, struct{}{})
}

func (h *Hub) Leave(room string, c *Client) {
	if clients, ok := h.rooms.Load(room); ok {
		clients.(*sync.Map).Delete(c)

		// Check if room is empty and delete it
		empty := true
		clients.(*sync.Map).Range(func(key, value any) bool {
			empty = false
			return false // break
		})

		if empty {
			h.rooms.Delete(room)
		}
	}
}

// Broadcast sends to all clients in a room
func (h *Hub) Broadcast(room string, msg any) {
	if clients, ok := h.rooms.Load(room); ok {
		clients.(*sync.Map).Range(func(key, value any) bool {
			key.(*Client).Send(msg)
			return true
		})
	}
}

// BroadcastExcept sends to all clients except the sender (for optimistic UI)
func (h *Hub) BroadcastExcept(room string, msg any, except *Client) {
	if clients, ok := h.rooms.Load(room); ok {
		clients.(*sync.Map).Range(func(key, value any) bool {
			if key.(*Client) != except {
				key.(*Client).Send(msg)
			}
			return true
		})
	}
}

// GetClient returns a client if they're in the room
func (h *Hub) GetClient(room string, client *Client) bool {
	if clients, ok := h.rooms.Load(room); ok {
		_, exists := clients.(*sync.Map).Load(client)
		return exists
	}
	return false
}
