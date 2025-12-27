.PHONY: run build clean docker-build docker-run docker-stop sqlc test help

# App name
APP_NAME := wireloop
DOCKER_IMAGE := wireloop-api

# Go commands
run:
	@echo "Starting server..."
	@if [ -f ../.env ]; then set -a && . ../.env && set +a; fi && go run ./cmd/hyperloop/main.go

build:
	@echo "Building binary..."
	CGO_ENABLED=0 go build -o bin/$(APP_NAME) ./cmd/hyperloop/main.go

clean:
	@echo "Cleaning..."
	rm -rf bin/

# Docker commands
docker-build:
	@echo "Building Docker image..."
	docker build -t $(DOCKER_IMAGE) .

docker-run:
	@echo "Running Docker container..."
	docker run -p 8080:8080 --env-file ../.env --name $(APP_NAME) -d $(DOCKER_IMAGE)

docker-stop:
	@echo "Stopping Docker container..."
	docker stop $(APP_NAME) && docker rm $(APP_NAME)

docker-logs:
	docker logs -f $(APP_NAME)

# Database / SQLC
sqlc:
	@echo "Generating SQLC code..."
	sqlc generate

# Testing
test:
	@echo "Running tests..."
	go test -v ./...

# Dependencies
deps:
	@echo "Downloading dependencies..."
	go mod download

tidy:
	@echo "Tidying modules..."
	go mod tidy

# Help
help:
	@echo "Available commands:"
	@echo "  make run          - Run the server locally"
	@echo "  make build        - Build the binary"
	@echo "  make clean        - Remove built binary"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run Docker container"
	@echo "  make docker-stop  - Stop and remove container"
	@echo "  make docker-logs  - View container logs"
	@echo "  make sqlc         - Generate SQLC code"
	@echo "  make test         - Run tests"
	@echo "  make deps         - Download dependencies"
	@echo "  make tidy         - Tidy go modules"

