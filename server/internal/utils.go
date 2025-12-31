package utils

import (
	"encoding/hex"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/sony/sonyflake"
)

func GetUserIdFromContext(c *gin.Context) (pgtype.UUID, bool) {
	userID, ok := c.Get("user_id")
	if !ok {
		return pgtype.UUID{}, false
	}
	uid := userID.(pgtype.UUID)
	return uid, true
}

func StrToUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	err := u.Scan(s)
	return u, err
}

func UUIDToStr(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	// Format as standard UUID string: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
	b := u.Bytes
	return hex.EncodeToString(b[0:4]) + "-" +
		hex.EncodeToString(b[4:6]) + "-" +
		hex.EncodeToString(b[6:8]) + "-" +
		hex.EncodeToString(b[8:10]) + "-" +
		hex.EncodeToString(b[10:16])
}

var sf = sonyflake.NewSonyflake(sonyflake.Settings{})

func GetMessageId() int64 {
	id, _ := sf.NextID()
	return int64(id)
}

func FormatMessageID(id int64) string {
	return strconv.FormatInt(id, 10)
}
