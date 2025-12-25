.PHONY: dev server client install help

# Run both server and client (use two terminals)
dev:
	@echo "Run these in separate terminals:"
	@echo "  Terminal 1: make server"
	@echo "  Terminal 2: make client"

# Run Go server
server:
	@cd server && make run

# Run Next.js client
client:
	@cd client && make dev

# Install all dependencies
install:
	@echo "Installing server dependencies..."
	@cd server && go mod download
	@echo "Installing client dependencies..."
	@cd client && bun install
	@echo "Done!"

# Help
help:
	@echo "Wireloop Development Commands"
	@echo "=============================="
	@echo "  make server  - Start Go API server (port 8080)"
	@echo "  make client  - Start Next.js frontend (port 3000)"
	@echo "  make install - Install all dependencies"
	@echo ""
	@echo "Run 'make server' and 'make client' in separate terminals"

