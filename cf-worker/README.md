# PayFirst Cloudflare Worker Proxy

This Worker provides an HTTPS proxy in front of your HTTP backend (e.g., `http://34.42.85.70`).

Use it to avoid "mixed content" when your site is served over HTTPS (like GitHub Pages) but your backend is on HTTP.

## Deploy

Prereqs:
- Install Wrangler CLI

```powershell
npm i -g wrangler
```

Deploy:

```powershell
# From this folder
cd cf-worker

# Option A: use BACKEND_ORIGIN from wrangler.toml (edit if needed)
wrangler deploy

# Option B: override via CLI
wrangler deploy --var BACKEND_ORIGIN="http://34.42.85.70"
```

Wrangler will print a URL like:

```
https://payfirst-proxy.<your-account>.workers.dev
```

## Configure the app

Set the HTTPS proxy URL in your frontend env so production avoids mixed content:

- In `.env` (or GitHub Pages build env):

```dotenv
VITE_API_HTTPS_PROXY=https://payfirst-proxy.<your-account>.workers.dev
```

Rebuild and publish your site. The app will automatically prefer `VITE_API_HTTPS_PROXY` when the page is HTTPS and the resolved API base is HTTP.

## CORS

The Worker reflects the request `Origin` for allowed origins:
- `https://*.github.io`
- `http://localhost:5173` and `http://localhost:4173` (dev)

If you need to allow more origins, update `isAllowedOrigin` in `src/worker.ts` and redeploy.
