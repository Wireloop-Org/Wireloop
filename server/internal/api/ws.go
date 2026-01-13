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
	Type      string  `json:"type"`
	Content   string  `json:"content,omitempty"`
	ChannelID string  `json:"channel_id,omitempty"`
	ParentID  *string `json:"parent_id,omitempty"` // For thread replies
}

// WSOutMessage represents an outgoing WebSocket message
type WSOutMessage struct {
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload,omitempty"`
	ChannelID string      `json:"channel_id,omitempty"`
}

func (h *Handler) HandleWS(c *gin.Context) {
	projectID := c.Query("project_id")
	channelID := c.Query("channel_id")

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

	// Determine the channel to join
	var channelUUID pgtype.UUID
	if channelID != "" {
		channelUUID, err = utils.StrToUUID(channelID)
		if err != nil {
			c.AbortWithStatus(400)
			return
		}
		// Verify channel belongs to project
		channel, err := h.Queries.GetChannelByID(c, channelUUID)
		if err != nil || utils.UUIDToStr(channel.ProjectID) != projectID {
			c.AbortWithStatus(400)
			return
		}
	} else {
		// Get default channel
		channel, err := h.Queries.GetDefaultChannel(c, projectUUID)
		if err != nil {
			// Try to get any channel
			channels, err := h.Queries.GetChannelsByProject(c, projectUUID)
			if err != nil || len(channels) == 0 {
				c.AbortWithStatus(500)
				return
			}
			channelUUID = channels[0].ID
			channelID = utils.UUIDToStr(channelUUID)
		} else {
			channelUUID = channel.ID
			channelID = utils.UUIDToStr(channelUUID)
		}
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Printf("[WS] Upgrade error: %v\n", err)
		return
	}

	// Create client with cached user info - no more DB lookups per message!
	client := chat.NewClient(conn, userID, user.Username, user.AvatarUrl.String)

	// Room is now channel-specific for more granular messaging
	roomID := channelID
	h.Hub.Join(roomID, client)

	fmt.Printf("[WS] %s joined channel %s in project %s\n", user.Username, channelID, projectID)

	// Send channel info on connect
	client.Send(WSOutMessage{
		Type:      "connected",
		ChannelID: channelID,
		Payload: gin.H{
			"channel_id": channelID,
			"project_id": projectID,
		},
	})

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
			// Use channel from message if provided, otherwise use connection channel
			msgChannelID := channelID
			msgChannelUUID := channelUUID
			if msg.ChannelID != "" && msg.ChannelID != channelID {
				// Verify user has access to this channel (belongs to same project)
				parsedUUID, err := utils.StrToUUID(msg.ChannelID)
				if err == nil {
					ch, err := h.Queries.GetChannelByID(c, parsedUUID)
					if err == nil && utils.UUIDToStr(ch.ProjectID) == projectID {
						msgChannelID = msg.ChannelID
						msgChannelUUID = parsedUUID
					}
				}
			}
			h.handleWSMessage(client, msgChannelID, projectUUID, msgChannelUUID, msg.Content, msg.ParentID)
		case "switch_channel":
			// Switch to a different channel
			if msg.ChannelID != "" {
				newChannelUUID, err := utils.StrToUUID(msg.ChannelID)
				if err == nil {
					ch, err := h.Queries.GetChannelByID(c, newChannelUUID)
					if err == nil && utils.UUIDToStr(ch.ProjectID) == projectID {
						// Leave old room, join new room
						h.Hub.Leave(roomID, client)
						roomID = msg.ChannelID
						channelID = msg.ChannelID
						channelUUID = newChannelUUID
						h.Hub.Join(roomID, client)
						client.Send(WSOutMessage{
							Type:      "channel_switched",
							ChannelID: channelID,
						})
						fmt.Printf("[WS] %s switched to channel %s\n", user.Username, channelID)
					}
				}
			}
		case "ping":
			client.Send(WSOutMessage{Type: "pong"})
		}
	}

	h.Hub.Leave(roomID, client)
	client.Close()
	fmt.Printf("[WS] %s left channel %s\n", user.Username, channelID)
}

func (h *Handler) handleWSMessage(client *chat.Client, roomID string, projectUUID pgtype.UUID, channelUUID pgtype.UUID, content string, parentIDStr *string) {
	if content == "" {
		return
	}

	msgID := utils.GetMessageId()
	now := time.Now()

	// Parse parent_id for thread replies
	var parentID pgtype.Int8
	var parentIDResponse *string
	if parentIDStr != nil && *parentIDStr != "" {
		if pid, err := strconv.ParseInt(*parentIDStr, 10, 64); err == nil {
			parentID = pgtype.Int8{Int64: pid, Valid: true}
			parentIDResponse = parentIDStr
		}
	}

	// Build message response with cached user info (no DB lookup!)
	msgResponse := MessageResponse{
		ID:             strconv.FormatInt(msgID, 10),
		Content:        content,
		SenderID:       utils.UUIDToStr(client.UserID),
		SenderUsername: client.Username,
		SenderAvatar:   client.AvatarURL,
		CreatedAt:      now.Format(time.RFC3339),
		ChannelID:      roomID,
		ParentID:       parentIDResponse,
		ReplyCount:     0,
	}

	// Broadcast IMMEDIATELY to all clients in this channel (including sender for confirmation)
	h.Hub.Broadcast(roomID, WSOutMessage{
		Type:      "message",
		Payload:   msgResponse,
		ChannelID: roomID,
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
			ChannelID: channelUUID,
			ParentID:  parentID,
		}); err != nil {
			fmt.Printf("[WS] Failed to persist message: %v\n", err)
		}
		// If this is a reply, increment the parent's reply count
		if parentID.Valid {
			h.Queries.IncrementReplyCount(ctx, parentID.Int64)
		}
	}()
}
