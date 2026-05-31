# CORS Proxy

Yahoo Finance omits `Access-Control-Allow-Origin` headers, blocking direct browser requests. A Cloudflare Worker sits between the SPA and Yahoo Finance to add that header.

## Architecture

```
Browser
  │  GET /?url=https%3A%2F%2Fquery1.finance.yahoo.com%2F...
  ▼
Cloudflare Worker  (stock-planner-cors-proxy.<subdomain>.workers.dev)
  │  validates method + hostname allowlist, strips unsafe headers
  │  server-to-server fetch (no CORS check)
  ▼
query1/query2.finance.yahoo.com  →  response + Access-Control-Allow-Origin: *  →  Browser
```

Source: `proxy/src/index.ts`. Only `GET` is accepted. Only `query1/query2.finance.yahoo.com` pass the allowlist (anything else → 403). Cookies and auth headers are never forwarded upstream.

The app reads the worker URL from the `VITE_CORS_PROXY` build-time env var and appends the percent-encoded target after it:
```
<VITE_CORS_PROXY>https%3A%2F%2Fquery1.finance.yahoo.com%2F...
```

## Build contexts

| Context | Proxy used |
|---|---|
| `npm run dev` | Cloudflare Worker (via `web/.env.local`) |
| PR preview build | Cloudflare Worker (via GitHub secret) |
| Production build (`main`) | Cloudflare Worker (via GitHub secret) |
| Local production build | Cloudflare Worker (via `web/.env.production`) |

## Free tier limits

100,000 requests/day, resets 00:00 UTC. No credit card required. A Research run makes ~10–20 calls; sufficient for personal use. Exceeding the limit returns 429 — the app shows `—` for missing data, it does not crash.

---

## Setup guide

### 1. Deploy the worker

```bash
npm install -g wrangler
wrangler login          # opens browser to authorise

cd proxy
npm install
npm run deploy          # compiles TS and uploads
```

Output shows your worker URL:
```
https://stock-planner-cors-proxy.<your-subdomain>.workers.dev
```

Verify it works:
```bash
curl "https://stock-planner-cors-proxy.<your-subdomain>.workers.dev/?url=https%3A%2F%2Fquery1.finance.yahoo.com%2Fv8%2Ffinance%2Fchart%2FMSFT%3Finterval%3D1d"
```
Expect JSON chart data and `access-control-allow-origin: *` in the response headers.

### 2. Connect the app

**Local production build** — create `web/.env.production` (git-ignored):
```dotenv
VITE_CORS_PROXY=https://stock-planner-cors-proxy.<your-subdomain>.workers.dev/?url=
```
Note the trailing `?url=`.

**GitHub Actions** — add a repository secret:
1. **Settings → Secrets and variables → Actions → New repository secret**
2. Name: `VITE_CORS_PROXY`, value: `https://stock-planner-cors-proxy.<your-subdomain>.workers.dev/?url=`

Then expose it in the build step of `.github/workflows/deploy-web.yml`:
```yaml
- name: Build
  working-directory: web
  run: npm run build
  env:
    VITE_CORS_PROXY: ${{ secrets.VITE_CORS_PROXY }}
```

### 3. Verify

Open the live site, run a Research query, and check DevTools → Network. Requests should go to `stock-planner-cors-proxy.<your-subdomain>.workers.dev`, not `corsproxy.io`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Worker returns 403 on localhost | `http://localhost:*` not in `ALLOWED_ORIGINS` | Add the localhost origin to `ALLOWED_ORIGINS` in `proxy/src/index.ts` and redeploy |
| Worker returns 403 | Target not in allowlist | URL must start with `https://query1.finance.yahoo.com/` or `query2.*` |
| Worker returns 429 | Free tier exhausted (>100k/day) | Wait for reset at 00:00 UTC or upgrade to Workers Paid ($5/mo) |
| Data loads in dev but not production | `VITE_CORS_PROXY` not injected | Confirm the GitHub secret exists and the `env:` block is in the build step |
| `VITE_CORS_PROXY` undefined at build | Wrong env file location | `web/.env.production` must be inside `web/`, not the repo root |
