.PHONY: dev build start install clean help

# Development server
dev:
	@echo "Starting Next.js development server..."
	bun run dev

# Production build
build:
	@echo "Building for production..."
	bun run build

# Start production server
start:
	@echo "Starting production server..."
	bun run start

# Install dependencies
install:
	@echo "Installing dependencies..."
	bun install

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf .next

# Help
help:
	@echo "Available commands:"
	@echo "  make dev     - Start development server (localhost:3000)"
	@echo "  make build   - Build for production"
	@echo "  make start   - Start production server"
	@echo "  make install - Install dependencies"
	@echo "  make clean   - Remove build artifacts"

