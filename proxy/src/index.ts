/**
 * Stock Planner CORS Proxy — Cloudflare Worker
 *
 * Proxies GET requests to Yahoo Finance and adds the
 * Access-Control-Allow-Origin header that Yahoo Finance omits,
 * allowing the browser-based SPA to call the API directly.
 *
 * Usage:
 *   GET https://<worker-url>/?url=<encoded-yahoo-finance-url>
 *
 * Only Yahoo Finance hostnames are allowed (allowlist below).
 * All other targets receive a 403.
 */

/** Hostnames that this proxy is permitted to forward requests to. */
const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
]);

/** Origins that are allowed to use this proxy. */
const ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  'https://stocks.anoff.io',
  'http://localhost:5173',   // Vite dev server (npm run dev)
  'http://localhost:4173',   // Vite preview server (npm run preview)
]);

/** Headers forwarded from the upstream response (everything else is dropped). */
const PASSTHROUGH_HEADERS: ReadonlyArray<string> = [
  'content-type',
  'cache-control',
  'etag',
  'last-modified',
];

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';

    if (!ALLOWED_ORIGINS.has(origin)) {
      return errorResponse(403, `Origin "${origin}" is not allowed.`);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    if (request.method !== 'GET') {
      return errorResponse(405, 'Only GET requests are supported.');
    }

    const incoming = new URL(request.url);
    const rawTarget = incoming.searchParams.get('url');

    if (!rawTarget) {
      return errorResponse(
        400,
        'Missing required query parameter: ?url=<encoded-target-url>',
      );
    }

    let target: URL;
    try {
      target = new URL(rawTarget);
    } catch {
      return errorResponse(400, 'Invalid target URL.');
    }

    if (!ALLOWED_HOSTS.has(target.hostname)) {
      return errorResponse(
        403,
        `Target host "${target.hostname}" is not allowed. ` +
        `Permitted hosts: ${[...ALLOWED_HOSTS].join(', ')}.`,
      );
    }

    target.protocol = 'https:';

    let upstream: Response;
    try {
      upstream = await fetch(target.toString(), {
        method: 'GET',
        headers: {
          // Mimic a browser user-agent so Yahoo Finance doesn't block the request.
          'User-Agent':
            'Mozilla/5.0 (compatible; StockPlannerProxy/1.0)',
          Accept: 'application/json, */*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        // Do not follow redirects to non-allowed hosts.
        redirect: 'follow',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(502, `Upstream fetch failed: ${message}`);
    }

    // ── Build response ────────────────────────────────────────────────────────
    const responseHeaders = new Headers(corsHeaders(origin));

    for (const header of PASSTHROUGH_HEADERS) {
      const value = upstream.headers.get(header);
      if (value !== null) {
        responseHeaders.set(header, value);
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler;

// ── Helpers ───────────────────────────────────────────────────────────────────

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
