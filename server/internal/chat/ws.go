package chat

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/redis/go-redis/v9"
)

// Hub manages WebSocket connections and room subscriptions
// Supports Redis pub/sub for horizontal scaling across multiple server instances
type Hub struct {
	rooms sync.Map // room -> *sync.Map[*Client]struct{}
	redis *redis.Client
	ctx   context.Context
}

func NewHub(rdb *redis.Client) *Hub {
	h := &Hub{
		redis: rdb,
		ctx:   context.Background(),
	}

	// If Redis is available, subscribe to messages from other server instances
	if rdb != nil {
		go h.subscribeToRedis()
	}

	return h
}

// subscribeToRedis listens for messages published by other server instances
func (h *Hub) subscribeToRedis() {
	pubsub := h.redis.PSubscribe(h.ctx, "room:*")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		// msg.Channel format: "room:{roomName}"
		room := msg.Channel[5:] // Strip "room:" prefix

		var payload map[string]any
		if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
			log.Printf("Redis message parse error: %v", err)
			continue
		}

		// Broadcast to local clients only (message came from another server)
		h.broadcastLocal(room, payload)
	}
}

// broadcastLocal sends to clients on THIS server instance only
func (h *Hub) broadcastLocal(room string, msg any) {
	if clients, ok := h.rooms.Load(room); ok {
		clients.(*sync.Map).Range(func(key, value any) bool {
			key.(*Client).Send(msg)
			return true
		})
	}
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

// Broadcast sends to all clients in a room (local + other servers via Redis)
func (h *Hub) Broadcast(room string, msg any) {
	// Always broadcast to local clients
	h.broadcastLocal(room, msg)

	// If Redis is available, publish to other server instances
	if h.redis != nil {
		payload, err := json.Marshal(msg)
		if err != nil {
			log.Printf("Redis publish marshal error: %v", err)
			return
		}
		h.redis.Publish(h.ctx, "room:"+room, payload)
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

	// If Redis is available, publish to other server instances
	// (other servers don't have the "except" client, so they broadcast to all)
	if h.redis != nil {
		payload, err := json.Marshal(msg)
		if err != nil {
			log.Printf("Redis publish marshal error: %v", err)
			return
		}
		h.redis.Publish(h.ctx, "room:"+room, payload)
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
