package chat

import "sync"


type Hub struct{
	mu sync.RWMutex
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

func (h *Hub) Broadcast(room string, msg any) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.rooms[room] {
		select {
		case c.send <- msg:
		default:
		}
	}
}
