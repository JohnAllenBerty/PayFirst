## PayFirst (Frontend)

React + TypeScript + Vite SPA for PayFirst with RTK Query, Tailwind, and shadcn/ui. It talks to a Django REST Framework backend via a configurable proxy.

Key features
- Server-driven pagination, sorting, and filtering
- RTK Query API slice with auth/error handling
- Table lists, per-column filters, and modals for CRUD
- Tree/List views for contact groups and contacts

---

## Prerequisites

- Node.js 18+ (we use Node 20 in CI/Docker)
- npm 9+
- A running backend API (Django/DRF). Default expected at http://localhost:8000/

Optional
- Docker 24+
- GitHub Codespaces

---

## Local development

1) Install deps
```bash
npm ci
```

2) Configure API target (optional)
- By default, Vite proxies /api to http://localhost:8000/.
- To override, create a .env file in the project root:
```bash
echo "VITE_API_TARGET=http://localhost:8001/" > .env
```

3) Start dev server (HMR)
```bash
npm run dev
```
Visit http://localhost:5173

4) Typecheck / Lint / Build
```bash
npm run typecheck
npm run lint
npm run build
```

---

## Docker (production-like)

Build and run using the provided Dockerfile and Nginx runtime. The container serves the built SPA and proxies /api to your backend.

1) Build image
```bash
docker build -t payfirst-frontend:latest .
```

2) Run container

- Windows (PowerShell)
```powershell
docker run --rm -p 5173:80 -e API_TARGET="http://host.docker.internal:8000/" payfirst-frontend:latest
```

- Linux/macOS (bash/zsh)
```bash
docker run --rm -p 5173:80 -e API_TARGET="http://host.docker.internal:8000/" payfirst-frontend:latest
```

Open http://localhost:5173

Notes
- API_TARGET is injected into Nginx to route /api to your backend.
- On Linux hosts without host.docker.internal, set API_TARGET to your LAN IP or the backend container name (e.g., http://backend:8000/).

---

## GitHub Codespaces

1) Create a Codespace for this repo.
2) In the Codespace terminal:
```bash
npm ci
npm run dev -- --host 0.0.0.0
```
3) Forward the Vite port (5173) and open the app from the Ports tab.

Backend access from Codespaces
- If your backend is public or tunnelled, set VITE_API_TARGET accordingly in a .env file:
```bash
echo "VITE_API_TARGET=https://your-public-backend.example.com/" > .env
```
Then restart the dev server.

Tip: You can also copy `.env.example` to `.env` and edit the value.

---

## Configuration

- Vite proxy is defined in `vite.config.ts`. It rewrites /api to the target specified by `VITE_API_TARGET`.
- For production (Docker), Nginx proxies /api using `API_TARGET` env.

Environment files
- See `.env.example` for a ready-to-copy template.

---

## Scripts

- `npm run dev` – start Vite dev server
- `npm run typecheck` – TypeScript project references typecheck
- `npm run build` – typecheck then Vite build (dist/)
- `npm run preview` – preview the production build locally

---

## Troubleshooting

- CORS or 404s on /api in Docker: verify `API_TARGET` and your backend’s bind address.
- Codespaces can require `--host 0.0.0.0` so Vite binds to all interfaces.
- If chunk size warnings appear on build, they’re informational; code-splitting can be adjusted in `vite.config.ts` if needed.
