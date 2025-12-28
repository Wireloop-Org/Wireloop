package utils

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/sony/sonyflake"
)

func GetUserIdFromContext(c *gin.Context)(pgtype.UUID, bool){
	userID, ok := c.Get("user_id")
	if !ok {
		return pgtype.UUID{}, false
	}
	uid := userID.(pgtype.UUID)
	return uid,true
}

func StrToUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	err := u.Scan(s)
	return u, err
}


var sf = sonyflake.NewSonyflake(sonyflake.Settings{})

func GetMessageId() int64 {
	id, _ := sf.NextID()
	return int64(id)
}
