package chat

import (
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	// SOTA message batching settings
	batchInterval = 50 * time.Millisecond // Batch messages every 50ms
	maxBatchSize  = 10                    // Max messages per batch
)

type Client struct {
	conn   *websocket.Conn
	send   chan any
	UserID pgtype.UUID
	// Cached user info - no DB lookup per message!
	Username  string
	AvatarURL string

	// Message batching for high throughput
	batchMu    sync.Mutex
	batch      []any
	batchTimer *time.Timer
}

func NewClient(conn *websocket.Conn, userID pgtype.UUID, username, avatarURL string) *Client {
	c := &Client{
		conn:      conn,
		send:      make(chan any, 256), // Increased buffer for batching
		UserID:    userID,
		Username:  username,
		AvatarURL: avatarURL,
		batch:     make([]any, 0, maxBatchSize),
	}
	return c
}

func (c *Client) Write() {
	defer c.conn.Close()
	for msg := range c.send {
		if err := c.conn.WriteJSON(msg); err != nil {
			return
		}
	}
}

func (c *Client) Conn() *websocket.Conn {
	return c.conn
}

// Send queues a message for sending (with optional batching for high throughput)
func (c *Client) Send(msg any) {
	select {
	case c.send <- msg:
	default:
		// Buffer full, skip message (prevents blocking)
	}
}

// SendBatched adds message to batch and flushes when batch is full or timer expires
// Use this for high-frequency messages (typing indicators, presence updates)
func (c *Client) SendBatched(msg any) {
	c.batchMu.Lock()
	defer c.batchMu.Unlock()

	c.batch = append(c.batch, msg)

	// Flush if batch is full
	if len(c.batch) >= maxBatchSize {
		c.flushBatchLocked()
		return
	}

	// Start timer if this is the first message in batch
	if c.batchTimer == nil {
		c.batchTimer = time.AfterFunc(batchInterval, func() {
			c.batchMu.Lock()
			defer c.batchMu.Unlock()
			c.flushBatchLocked()
		})
	}
}

func (c *Client) flushBatchLocked() {
	if len(c.batch) == 0 {
		return
	}

	// Send batch as array
	if len(c.batch) == 1 {
		c.Send(c.batch[0])
	} else {
		c.Send(map[string]any{
			"type":     "batch",
			"messages": c.batch,
		})
	}

	// Reset batch
	c.batch = make([]any, 0, maxBatchSize)
	if c.batchTimer != nil {
		c.batchTimer.Stop()
		c.batchTimer = nil
	}
}

func (c *Client) Close() {
	c.batchMu.Lock()
	c.flushBatchLocked() // Flush remaining messages
	c.batchMu.Unlock()
	close(c.send)
}
