# Bump Notes

## CURRENT VER= 0.4.2-alpha / PENDING VER= 0.4.3-alpha

### Developer Login Access-Code Gate Fix - 2026-04-04

#### Technical Notes

- Root-caused the missing Developer login access-code control to the repo-local auth proxy: `functions/auth/[[path]].js` allowed password and OAuth starts, but it did not allow `/auth/access-state` or `/auth/debug/unlock`, so the page could not load or execute the real public-style auth gate flow after deploy.
- Reworked `login/index.html` and `js/login.js` so the Developer `/login` page now uses the public auth surface's real access-code pattern instead of the earlier custom bypass variant: the control is labeled `Access code`, gate state is fetched with cached `/auth/access-state` reads, unlocks persist in session storage until expiry, and password/OAuth starts are disabled or reopened behind the gate exactly as the public flow does.
- Updated the narrow login-specific gate styling in `css/app.css` so the unlocked/open states and disabled OAuth buttons match the Developer surface without changing unrelated shell or layout work.

#### Human-Readable Notes

- The Developer login page now shows the real access-code gate behavior instead of a decorative or disconnected bypass variant.
- Password login, OAuth sign-in, and `return_to` handoff still use the existing routes, but they now wait on the same unlock step the public login uses when auth is gated.

#### Files / Areas Touched

- `BUMP_NOTES.md`
- `css/app.css`
- `functions/auth/[[path]].js`
- `js/login.js`
- `login/index.html`

### Developer Console IA / Shell / Login Parity Polish Pass - 2026-04-04

#### Technical Notes

- Replaced the old shared horizontal-nav treatment with two explicit chrome systems in the Developer repo: authenticated console routes now use a real sidebar plus topbar shell on `/dashboard`, `/reports`, and `/keys`, while `/feedback`, `/beta`, `/beta/apply`, `/reports/submit`, `/login`, and `/login-success` stay on a lighter standalone header.
- Refactored `css/app.css` around wider shared content widths and a reduced heading scale so the console keeps the same visual family without the earlier cramped layout and oversized page titles.
- Expanded `js/auth.js` from a simple status-chip slot into a reusable session widget with avatar/name metadata, dropdown actions, logout wiring, and active-route handling for both standalone pages and the authenticated shell.
- Added a new authenticated `/reports` hub page plus `js/reports.js`, and moved the actual detailed developer report form to canonical `/reports/submit/`.
- Replaced `report/submit/index.html` with a redirect stub and updated `_redirects` so legacy `/report/submit` and `/report/submit/` both resolve to `/reports/submit/` cleanly after deploy.
- Updated `js/report-submit.js` so submissions now identify themselves with `source_route: "/reports/submit/"`, keeping route metadata aligned with the new canonical page.
- Added login-page auth-gate parity in `login/index.html` and `js/login.js`: the page now consumes `/auth/access-state`, exposes a bypass-code unlock form backed by `/auth/debug/unlock`, and renders Google, GitHub, and Discord provider icons while preserving the already-working `return_to` flow and existing auth starts.
- Shortened both legacy browser-facing auth pages under `auth/login/index.html` and `auth/success/index.html` into explicit redirect stubs because `/login` and `/login-success` remain the browser-facing routes after the earlier proxy-namespace fix.

#### Human-Readable Notes

- The console now has a real authenticated shell instead of scattered top links.
- Standalone public and intake pages still feel connected to the console, but they stay outside the protected shell.
- `/reports/submit` is now the real report page, and the old `/report/submit` path redirects there.
- The login page now includes the bypass-code field pattern and provider icons without regressing the working sign-in handoff.

#### Files / Areas Touched

- `BUMP_NOTES.md`
- `DEPLOYMENT_SETUP.md`
- `README.md`
- `_headers`
- `_redirects`
- `index.html`
- `auth/login/index.html`
- `auth/success/index.html`
- `beta/index.html`
- `beta/apply/index.html`
- `css/app.css`
- `dashboard/index.html`
- `feedback/index.html`
- `js/auth.js`
- `js/config.js`
- `js/login.js`
- `js/report-submit.js`
- `js/reports.js`
- `keys/index.html`
- `login/index.html`
- `login-success/index.html`
- `report/submit/index.html`
- `reports/index.html`
- `reports/submit/index.html`

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
