package chat

import "github.com/gorilla/websocket"

type Client struct {
	conn *websocket.Conn
	send chan any
}

func NewClient(conn *websocket.Conn) *Client {
	return &Client{conn: conn, send: make(chan any, 16)}
}

func (c *Client) Write() {
	for msg := range c.send {
		c.conn.WriteJSON(msg)
	}
}
