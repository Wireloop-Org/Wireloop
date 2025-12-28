package api

import (
	"net/http"
	"wireloop/internal/chat"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (h *Handler) HandleWS(c *gin.Context) {
	projectID := c.Query("project_id")
	if projectID == "" {
		c.AbortWithStatus(400)
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := chat.NewClient(conn)
	h.Hub.Join(projectID, client)

	go client.Write()

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}

	h.Hub.Leave(projectID, client)
	conn.Close()
}
