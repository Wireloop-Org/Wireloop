package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
	utils "wireloop/internal"
	"wireloop/internal/chat"
	"wireloop/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgtype"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
}

// WSMessage represents an incoming WebSocket message
type WSMessage struct {
	Type    string `json:"type"`
	Content string `json:"content,omitempty"`
}

// WSOutMessage represents an outgoing WebSocket message
type WSOutMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
}

func (h *Handler) HandleWS(c *gin.Context) {
	projectID := c.Query("project_id")
	if projectID == "" {
		c.AbortWithStatus(400)
		return
	}

	// User ID should be set by auth middleware
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.AbortWithStatus(401)
		return
	}
	userID := userIDVal.(pgtype.UUID)

	// Fetch user info ONCE on connect (cache in client)
	user, err := h.Queries.GetUserByID(c, userID)
	if err != nil {
		c.AbortWithStatus(500)
		return
	}

	// Verify membership ONCE on connect
	projectUUID, err := utils.StrToUUID(projectID)
	if err != nil {
		c.AbortWithStatus(400)
		return
	}

	if _, err := h.Queries.IsMember(c, db.IsMemberParams{
		UserID: userID, ProjectID: projectUUID,
	}); err != nil {
		c.AbortWithStatus(403)
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Printf("[WS] Upgrade error: %v\n", err)
		return
	}

	// Create client with cached user info - no more DB lookups per message!
	client := chat.NewClient(conn, userID, user.Username, user.AvatarUrl.String)
	h.Hub.Join(projectID, client)

	fmt.Printf("[WS] %s joined room %s\n", user.Username, projectID)

	go client.Write()

	// Read loop - handle incoming messages
	for {
		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg WSMessage
		if err := json.Unmarshal(rawMsg, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "message":
			h.handleWSMessage(client, projectID, projectUUID, msg.Content)
		case "ping":
			client.Send(WSOutMessage{Type: "pong"})
		}
	}

	h.Hub.Leave(projectID, client)
	client.Close()
	fmt.Printf("[WS] %s left room %s\n", user.Username, projectID)
}

func (h *Handler) handleWSMessage(client *chat.Client, roomID string, projectUUID pgtype.UUID, content string) {
	if content == "" {
		return
	}

	msgID := utils.GetMessageId()
	now := time.Now()

	// Build message response with cached user info (no DB lookup!)
	msgResponse := MessageResponse{
		ID:             strconv.FormatInt(msgID, 10),
		Content:        content,
		SenderID:       utils.UUIDToStr(client.UserID),
		SenderUsername: client.Username,
		SenderAvatar:   client.AvatarURL,
		CreatedAt:      now.Format(time.RFC3339),
	}

	// Broadcast IMMEDIATELY to all clients (including sender for confirmation)
	h.Hub.Broadcast(roomID, WSOutMessage{
		Type:    "message",
		Payload: msgResponse,
	})

	// Async DB write - don't block the response!
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := h.Queries.AddMessage(ctx, db.AddMessageParams{
			ID:        msgID,
			SenderID:  client.UserID,
			Content:   content,
			ProjectID: projectUUID,
		}); err != nil {
			fmt.Printf("[WS] Failed to persist message: %v\n", err)
		}
	}()
}
