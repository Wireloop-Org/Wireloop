# Wireloop

**Where code talks, builders listen.**

Wireloop is a meritocratic coordination platform for open-source communities. It gates real-time chat channels ("Loops") behind verified GitHub contributions — merged PRs, commits, issues — so every voice in the room has earned their seat.

No invites. No waiting rooms. No politics.

---

## How It Works

1. **Connect GitHub** — Sign in with your GitHub account.
2. **Browse Loops** — Discover Loops linked to open-source repositories.
3. **Prove Your Work** — Wireloop's Gatekeeper verifies your contributions (PRs merged, commits, issues opened) against the Loop's entry rules.
4. **Join & Collaborate** — Once verified, drop into real-time WebSocket-powered chat with fellow contributors.

## Architecture

```
┌──────────────┐     ┌──────────────────────────┐
│   Next.js    │────▶│      Go (Gin) API         │
│   Frontend   │◀────│      + WebSockets         │
└──────────────┘     ├──────────────────────────┤
                     │  Gatekeeper Service       │──▶ GitHub API
                     │  (contribution verifier)  │
                     ├──────────────────────────┤
                     │  PostgreSQL / SQLite      │
                     └──────────────────────────┘
```

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Zustand |
| Backend | Go, Gin, gorilla/websocket |
| Database | PostgreSQL (prod), SQLite (dev) |
| Auth | GitHub OAuth → JWT |
| Realtime | WebSocket rooms per Loop |

## Features

- **Contribution Gating** — Loop owners define entry rules (e.g. ≥3 merged PRs). The Gatekeeper service verifies them against the GitHub API in real time.
- **Real-time Chat** — Bi-directional WebSocket messaging with per-Loop rooms.
- **GitHub Context** — Browse issues and PRs directly inside the chat panel.
- **AI Summaries** — Summarize any issue or PR with one click and share the digest into the conversation.
- **Presence System** — See who's online in each Loop.

## Getting Started

### Prerequisites

- [Go](https://go.dev/) 1.22+
- [Bun](https://bun.sh/) (or Node 20+)
- PostgreSQL (or SQLite for local dev)
- A [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)

### Backend

```bash
cd server
cp .env.example .env   # fill in GitHub Client ID/Secret, DB url, JWT secret
make run
```

The API starts on `http://localhost:8080`.

### Frontend

```bash
cd client
bun install
bun run dev
```

The app starts on `http://localhost:3000`.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `DATABASE_URL` | PostgreSQL connection string |
| `FRONTEND_URL` | Frontend origin for CORS (default `http://localhost:3000`) |

## Project Structure

```
Wireloop/
├── client/                 # Next.js frontend
│   └── src/
│       ├── app/            # Pages and routes
│       ├── components/     # React components
│       ├── lib/            # API client, utilities
│       └── store/          # Zustand state stores
├── server/                 # Go backend
│   ├── cmd/                # Entry point
│   ├── internal/
│   │   ├── api/            # HTTP + WebSocket handlers
│   │   ├── auth/           # GitHub OAuth + JWT
│   │   ├── db/             # Database queries (sqlc)
│   │   └── gatekeeper/     # Contribution verification engine
│   ├── migrations/         # SQL migrations
│   └── sqlc/               # Generated Go from SQL
└── README.md
```

## Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feat/your-feature`)
3. Commit your changes
4. Push and open a PR

## License

MIT © [Wireloop Org](https://github.com/Wireloop-Org)