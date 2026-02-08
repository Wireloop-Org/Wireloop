.PHONY: serve help

# Serve locally for development (requires python3)
serve:
	@echo "Serving observability dashboard at http://localhost:9090"
	@python3 -m http.server 9090

help:
	@echo "Wireloop Observability Dashboard (Static Frontend)"
	@echo ""
	@echo "The API lives in the main server at /api/admin/*"
	@echo ""
	@echo "Vercel Deploy Settings:"
	@echo "  Root Directory:    observability"
	@echo "  Framework Preset:  Other"
	@echo "  Build Command:     (leave empty)"
	@echo "  Output Directory:  ."
	@echo ""
	@echo "Required env vars (on the SERVER):"
	@echo "  OBS_USER          - Admin login username"
	@echo "  OBS_PASS          - Admin login password"
	@echo "  OBS_FRONTEND_URL  - Origin of this dashboard (for CORS)"
	@echo ""
	@echo "Commands:"
	@echo "  make serve  - Local dev server on :9090"
	@echo "  make help   - This help text"
