.PHONY: serve deploy help

# Serve locally for development (requires python3)
serve:
	@echo "Serving observability dashboard at http://localhost:9090"
	@python3 -m http.server 9090

# Deploy — just a static HTML file, host anywhere
deploy:
	@echo "Deployment: Upload index.html to any static host (Vercel, Netlify, S3, etc.)"
	@echo "Set window.OBS_API_BASE in index.html or inject via env before deploying."

help:
	@echo "Wireloop Observability Dashboard (Static Frontend)"
	@echo ""
	@echo "The API lives in the main server at /api/admin/*"
	@echo ""
	@echo "Required env vars (on the SERVER):"
	@echo "  OBS_USER          - Admin login username"
	@echo "  OBS_PASS          - Admin login password"
	@echo "  OBS_FRONTEND_URL  - Origin of this dashboard (for CORS)"
	@echo ""
	@echo "Commands:"
	@echo "  make serve  - Local dev server on :9090"
	@echo "  make help   - This help text"
	@echo ""
	@echo "Commands:"
	@echo "  make run       - Run the dashboard"
	@echo "  make build     - Build production binary"
	@echo "  make clean     - Clean build artifacts"
