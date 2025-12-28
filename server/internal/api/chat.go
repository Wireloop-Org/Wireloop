package api

import (
	utils "wireloop/internal"
	"wireloop/internal/db"

	"github.com/gin-gonic/gin"
)

type MessagePayload struct {
	MessageBody string `json:"message_body"`
	ChannelID   string `json:"channel_id"`
}

func (h *Handler) HandleSendMessage(c *gin.Context) {
	var req MessagePayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	uid, ok := utils.GetUserIdFromContext(c)
	if !ok {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	channelID, err := utils.StrToUUID(req.ChannelID)
	if err != nil {
		c.JSON(400, gin.H{"error": "invalid channel id"})
		return
	}

	if _, err := h.Queries.IsMember(c, db.IsMemberParams{
		UserID: uid, ProjectID: channelID,
	}); err != nil {
		c.JSON(403, gin.H{"error": "not a member"})
		return
	}

	msgID := utils.GetMessageId()

	if err := h.Queries.AddMessage(c, db.AddMessageParams{
		ID:        msgID,
		SenderID: uid,
		Content:  req.MessageBody,
		ProjectID: channelID,
	}); err != nil {
		c.JSON(500, gin.H{"error": "db tx failed"})
		return
	}

	h.PushToWS(req.ChannelID, gin.H{
		"id":        msgID,
		"sender_id": uid,
		"content":   req.MessageBody,
	})

	c.JSON(200, gin.H{"id": msgID})
}

func (h *Handler) PushToWS(projectID string, msg any) {
	h.Hub.Broadcast(projectID, msg)
}
