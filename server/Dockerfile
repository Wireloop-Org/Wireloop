FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o wireloop ./cmd/hyperloop/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/wireloop .
# .env is optional - AWS uses Environment Variables
# For local Docker, pass --env-file to docker run

EXPOSE 8080
CMD ["./wireloop"]
