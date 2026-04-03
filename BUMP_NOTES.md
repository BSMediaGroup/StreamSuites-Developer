# Bump Notes

## CURRENT VER= 0.4.2-alpha / PENDING VER= 0.4.3-alpha

### Developer Console Auth Start Routing Fix - 2026-04-04

#### Technical Notes

- Root-caused live sign-in failure to a Cloudflare Pages route collision: the browser-facing login and success pages were mounted under `/auth/*`, but `functions/auth/[[path]].js` also owns that namespace and intercepted `/auth/login/` with the proxy's `404 {"success":false,"error":"Not Found"}` response before static HTML could render.
- Moved the browser-facing handoff pages to `/login/` and `/login-success/`, which matches the proven Creator pattern of keeping human-facing login pages outside the proxied `/auth/*` namespace while still sending provider starts to `/auth/login/{provider}` and password posts to `/auth/login/password`.
- Added exact legacy redirects from `/auth/login` and `/auth/success` (with and without trailing slash) to the new non-conflicting pages so older links and bookmarks still resolve after deploy.

#### Human-Readable Notes

- Console sign-in no longer relies on a page route that the auth proxy was swallowing.
- The login page now lives at `/login/`, while the actual auth API starts stay on the existing proxied `/auth/...` endpoints.

#### Files / Areas Touched

- `BUMP_NOTES.md`
- `DEPLOYMENT_SETUP.md`
- `README.md`
- `_redirects`
- `index.html`
- `js/config.js`
- `login/index.html`
- `login-success/index.html`

### Developer Console Foundation Scaffold - 2026-04-04

#### Technical Notes

- Scaffolded the existing `StreamSuites-Developer` repo as a Cloudflare Pages-oriented multi-route console surface using static HTML, shared CSS/JS modules, and same-origin Pages Function proxies for authoritative Auth/API access.
- Established the first public routes at `/`, `/feedback`, `/beta`, and `/beta/apply`, plus authenticated routes at `/dashboard`, `/report/submit`, `/keys`, `/auth/login`, and `/auth/success`.
- Kept `console.streamsuites.app` as the canonical hostname in repo positioning and docs while preserving enough naming flexibility for later alias attachment.
- The feedback hub now combines new public intake with the existing approved-request board pattern rather than duplicating or inventing a second request authority.
- The report route is intentionally developer-only and aligns with runtime-owned validation and safe artifact handling instead of local form-only persistence.
- Added deployment/setup notes for the manual GitHub, Cloudflare Pages, custom-domain, environment-variable, and redirect verification steps that still happen outside this code milestone.

#### Human-Readable Notes

- The developer repo now has a real first-pass console scaffold instead of an empty shell.
- Public users can reach feedback and beta routes, while authenticated users can reach the dashboard, developer report route, and the future keys placeholder.
- This repo stays honest about its boundary: it is the console surface, not the runtime authority.

#### Files / Areas Touched

- `README.md`
- `BUMP_NOTES.md`
- `.gitignore`
- `.env.example`
- `_headers`
- `_redirects`
- `DEPLOYMENT_SETUP.md`
- `index.html`
- `feedback/index.html`
- `beta/index.html`
- `beta/apply/index.html`
- `dashboard/index.html`
- `report/submit/index.html`
- `keys/index.html`
- `auth/login/index.html`
- `auth/success/index.html`
- `css/app.css`
- `js/*.js`
- `functions/_shared/auth-api-proxy.js`
- `functions/api/[[path]].js`
- `functions/auth/[[path]].js`
- `functions/oauth/[[path]].js`
