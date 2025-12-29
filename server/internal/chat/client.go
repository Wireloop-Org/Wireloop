package chat

import (
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgtype"
)

type Client struct {
	conn   *websocket.Conn
	send   chan any
	UserID pgtype.UUID
	// Cached user info - no DB lookup per message!
	Username  string
	AvatarURL string
}

func NewClient(conn *websocket.Conn, userID pgtype.UUID, username, avatarURL string) *Client {
	return &Client{
		conn:      conn,
		send:      make(chan any, 64), // Increased buffer
		UserID:    userID,
		Username:  username,
		AvatarURL: avatarURL,
	}
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

func (c *Client) Send(msg any) {
	select {
	case c.send <- msg:
	default:
		// Buffer full, skip message
	}
}

func (c *Client) Close() {
	close(c.send)
}
