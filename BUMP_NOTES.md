# Bump Notes

## Standalone Route Shell Containment Fix - 2026-04-09

### Technical Notes

- Root-caused the `/reports/submit` shell bleed to the shared page bootstrap in `js/auth.js`: every route, including standalone routes, still ran the authenticated shell initializer and still received the shell-only signed-in account widget markup. That left shell state and shell-specific UI classes active outside the intended shell boundary even when the standalone HTML itself was separate.
- Split the shared bootstrap into explicit `initShellPage` and `initStandalonePage` exports in `js/auth.js` so only `/dashboard`, `/reports`, and `/keys` bind the sidebar/topbar shell behavior, collapse state, and shell-scoped account widget.
- Updated the standalone routes and route scripts (`index.html`, `beta/index.html`, `login/index.html`, `login-success/index.html`, `js/beta-apply.js`, `js/feedback.js`, `js/report-submit.js`) to use the standalone initializer instead of the shell initializer, and updated the real shell routes (`js/dashboard.js`, `js/reports.js`, `js/keys.js`) to use the shell-only initializer explicitly.
- Changed `/reports/submit` to identify itself as a standalone route instead of reusing the shell `reports` nav key, and cleared any shell collapse classes on standalone boot so shell layout state cannot ride along onto standalone documents.
- Restored a standalone-specific signed-in menu render path in `js/auth.js` using the existing public `user-widget` / `user-menu` styling instead of injecting shell-only `streamsuites-auth` / `ss-user-menu` markup into standalone headers.
- Expanded `tests/developer-access-gating.test.mjs` so the repo now asserts the shell-vs-standalone bootstrap split and verifies that `/feedback`, `/beta`, `/beta/apply`, `/reports/submit`, `/login`, and `/login-success` stay structurally outside the authenticated shell.

### Human-Readable Notes

- The Developer shell is now route-bound again instead of leaking shared shell behavior into standalone pages.
- `/reports/submit` and the other standalone pages keep their lighter standalone header treatment.
- `/dashboard`, `/reports`, and `/keys` still use the authenticated shell.

## Admin-Shell Parity + Structured Developer Report Form - 2026-04-09

### Technical Notes

- Replaced the ad-hoc Developer authenticated shell markup on `dashboard/index.html`, `reports/index.html`, and `keys/index.html` with the same Admin Dashboard shell pattern: `#app` grid shell, `#app-nav` sidebar, `#app-header` topbar, collapse toggle, fixed topbar title slot, and `#app-footer`.
- Ported the Admin-style authenticated account widget treatment into `js/auth.js` / `css/app.css`, including the compact pill trigger, overview card dropdown, collapse-state persistence, topbar refresh action, and direct clickable sidebar `li[data-view]` items.
- Kept `/feedback`, `/beta`, `/beta/apply`, `/reports/submit`, `/login`, and `/login-success` outside the authenticated shell; only the protected `/dashboard`, `/reports`, and `/keys` routes moved onto the Admin-constructed shell.
- Rebuilt `reports/submit/index.html` into structured sections with explicit required/optional markers, checkbox-driven affected-area selection, conditional `Other` fields, discrete environment inputs, and split platform/account context inputs.
- Updated `js/report-submit.js` so the new structured UI is serialized back into the existing flat developer-report contract (`affected_area`, `environment_details`, `platform_details`, `account_context`) while also emitting richer JSON via `structured_metadata`.
- No shared StreamSuites runtime/auth contract change was required for this pass; the frontend adapts to the already-shipped `/api/developer/reports` payload shape.
- Added targeted node assertions in `tests/developer-access-gating.test.mjs` for Admin-shell markup parity on protected routes and for structured report-field serialization markers.

### Human-Readable Notes

- The protected Developer Console now uses the same shell construction discipline as Admin instead of the previous oversized custom sidebar.
- The detailed developer report form now asks for explicit technical context instead of loose monolithic environment/account text blobs.
- Report submission stays compatible with the current backend flow while carrying richer structured metadata for triage.

## Emergency Login Turnstile Placement Hotfix - 2026-04-06

### Technical Notes

- Reordered `login/index.html` so the Developer login surface now keeps the password form first, then the alternate-surface links, then the inline Turnstile block near the bottom of the auth stack.
- Capped the dedicated Developer Turnstile helper/status text at `9px` in `css/app.css` to match the shared emergency auth-surface requirement without shrinking unrelated console copy.

### Human-Readable Notes

- Developer login still uses the same existing auth flow.
- The security check now sits lower in the form stack and uses the same discreet tiny helper text as the other login surfaces.

## User Widget Dropdown Parity + Role-Aware Destinations - 2026-04-05

### Technical Notes

- Added the compact Creator-style account overview card pattern to the Developer Console dropdown in `js/auth.js` / `css/app.css` instead of redesigning the shell.
- The console dropdown now reads the existing runtime `admin_access` and `creator_workspace_access` contracts alongside `developer_console_access`, so `Admin Dashboard` and `Creator Dashboard` links only render when the current session is actually authorized for those destinations.
- No shared StreamSuites contract change was required for this repo pass; the console consumed the already-shipped access-class, display-tier, and capability payloads.

### Human-Readable Notes

- The Developer dropdown now shows the same compact account-summary card family as Creator.
- Cross-surface links inside the console only appear when the signed-in account can really use them.

## Developer Access-Class Contract Adoption - 2026-04-05

### Technical Notes

- Updated `js/auth.js` and `js/dashboard.js` to consume the new runtime `access_class` plus `effective_tier.display_tier_label` contract so protected-console gating keeps relying on runtime-owned developer authorization while the console shell stops reading the old tier shortcut as identity.
- The Developer Console menu/account summaries now derive their visible identity string from access class plus backend display tier, collapsing duplicate `Developer · Developer` output down to one label when the display chip matches the access class.
- Added a focused node regression proving the shared auth helper now expects `access_class` and display-tier data alongside the existing `developer_console_access` payload.

### Human-Readable Notes

- Protected Developer routes still honor the runtime developer-access decision, but the console now presents Developer identity from the new account-class model instead of the retired fake plan tier.

## CURRENT VER= 0.4.2-alpha / PENDING VER= 0.4.3-alpha

### Developer Console First-Class Surface Auth Fix - 2026-04-04

#### Technical Notes

- Root-caused the live `/login-success/` confirmation loop to the remaining cross-repo surface mismatch, not to missing credentials on the fetch itself: `js/auth-success.js` was already calling `GET /auth/session` with `credentials: "include"`, but the Developer repo still identified login starts as `surface: "creator"` while the runtime still treated `console.streamsuites.app` as creator-origin auth traffic instead of a first-class console surface.
- Updated the Developer login entry points to speak the correct surface contract. `js/config.js` now exports the console auth surface key, and `js/login.js` now sends both password and OAuth login starts with `surface=console` while keeping the existing `/login` and `/login-success` route model plus nested `return_to` handling intact.
- Hardened the same-origin Pages auth proxy in `functions/_shared/auth-api-proxy.js` so it forwards every upstream `Set-Cookie` header instead of collapsing auth responses down to a single cookie line. That keeps password and OAuth handoffs honest when the runtime returns multiple cookies during login/callback cleanup.
- Added concise browser-side auth diagnostics in `js/auth-success.js` for the confirmation request target, final status, and rejection reason so future session-bootstrap regressions can be identified from the console without adding noisy debug-only scaffolding.

#### Human-Readable Notes

- The Developer Console now identifies itself as the Developer Console during login instead of pretending to be the creator surface.
- Auth handoffs keep all cookies that the runtime returns, and `/login-success/` now records a useful reason when session confirmation still fails.

#### Files / Areas Touched

- `BUMP_NOTES.md`
- `functions/_shared/auth-api-proxy.js`
- `js/auth-success.js`
- `js/config.js`
- `js/login.js`

### Developer Console Post-Login Loop Fix - 2026-04-04

#### Technical Notes

- Root-caused the remaining console login loop to a surface-handoff mismatch rather than a bad credential exchange: the Developer repo preserved `return_to`, but it sent OAuth starts directly back to protected console routes and its `/login-success` page only used a timed redirect instead of confirming the newly-issued session first.
- Reworked the Developer console handoff to match the proven Creator/Public pattern. `js/login.js` now sends OAuth providers to `/login-success/` with the original protected console target nested in `return_to`, and password login now lands on the same completion page after the existing short `/api/me` settle check.
- Replaced the old `js/auth-success.js` timer-only redirect with a real `/auth/session` confirmation step that retries briefly on expected cookie-settle misses, preserves the requested console route, and only falls back to `/login/` when the runtime still reports no valid authenticated session.
- Added console-local return-target normalization helpers in `js/config.js` so auth pages cannot become their own final `return_to` target and accidentally re-enter the login loop.

#### Human-Readable Notes

- Password and OAuth login now complete through a real session-confirmation handoff before the console enters `/dashboard`, `/reports`, `/keys`, or other protected routes.
- `/login-success` is now a real auth completion page rather than a blind timed bounce.

#### Files / Areas Touched

- `BUMP_NOTES.md`
- `js/auth-success.js`
- `js/config.js`
- `js/login.js`

### Developer Login Redirect-Mode Regression Fix - 2026-04-04

#### Technical Notes

- Root-caused the live `NetworkError when attempting to fetch resource.` regression on the Developer `/login` password submit to `js/login.js`: the page still posted to `POST /auth/login/password` with a normal fetch, but the auth runtime finalizes successful password login with an HTTP `302` plus session cookie, so the browser fetch followed the redirect chain instead of treating the response as an auth handoff.
- Kept the new access-code gate UI and unlock flow intact while changing the password-login branch to the same safe pattern used by the public auth surface: `redirect: "manual"` on the password fetch, explicit handling for `401` / `429` / verification-required responses, and short session polling through `/api/me` before navigating back to `return_to`.
- Preserved the existing Developer route structure, same-origin auth proxy usage, OAuth/provider button wiring, and `surface: "creator"` payload semantics; only the password-submit success handling changed.

#### Human-Readable Notes

- The access-code control remains on the Developer login page and still unlocks login when auth is gated.
- Password login no longer relies on a fetch-followed redirect that browsers can surface as a network error on success.

#### Files / Areas Touched

- `BUMP_NOTES.md`
- `js/login.js`

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

## Task 3X - Turnstile Auth Rollout Verification - 2026-04-04

### Technical Notes

- Extended the developer-console Turnstile rollout beyond `/login` to the public `feedback` and `beta/apply` submission forms, using the existing inline panel styling plus a shared explicit-render helper exported from `js/auth.js`.
- Both forms now request `/auth/turnstile/config`, require a fresh token before submit, and forward `turnstile_token` to the authoritative runtime endpoints `/api/public/feedback` and `/api/public/beta/apply`.
- This closes the request-access and public-intake gap that the interrupted rollout left behind.

### Human-Readable Notes

- The developer console now protects public beta-application and feedback submissions with the same inline Cloudflare Turnstile approach already used on login, without redesigning those forms.

### Files / Areas Touched

- `beta/apply/index.html`
- `feedback/index.html`
- `js/auth.js`
- `js/beta-apply.js`
- `js/feedback.js`
- `BUMP_NOTES.md`

### Risks / Follow-Ups

- Public intake abuse is reduced, not eliminated. Cloudflare WAF/rate limiting should still sit in front of the feedback, beta-apply, and auth-start endpoints.

## Task 3Y - Developer Console Access Repair Pass - 2026-04-05

### Technical Notes

- Reworked the protected Developer Console page bootstrap so `/dashboard`, `/reports`, `/reports/submit`, and `/keys` now opt into explicit developer-required gating instead of only checking for any authenticated session.
- Updated `js/auth.js` to consume the runtime-owned `developer_console_access` payload, redirect authenticated non-developer accounts away from protected console routes, and keep the signed-in menu from advertising protected console links to accounts that only have access to the public Developer routes.
- Aligned the login page lockout control with the public auth treatment by changing the access-code action to the small key-style button, tightening Turnstile spacing, adding alternate-surface links, and adding a lightweight source-audit regression at `tests/developer-access-gating.test.mjs`.

## Task 3Z - Auth Surface Login Repair Follow-up - 2026-04-05

### Technical
- Cleaned up the developer login vertical rhythm by grouping the existing access notice, Turnstile panel, alternate-surface links, password form, and status line into a dedicated auth stack without changing the auth logic or developer access model.
- Restored the missing access-code button icon by pointing the masked icon treatment at the required `assets/icons/ui/key.svg`, and replaced the old `Elsewhere` strip with a collapsed `Login to other surfaces` section using new `ss-public.svg`, `ss-creator.svg`, `ss-admin.svg`, and `ss-developer.svg` assets.
- Expanded `tests/developer-access-gating.test.mjs` to cover the new collapsed alternate-surface wording and the corrected key icon asset path.

### Human
- The Developer login page now breathes properly around the existing auth controls instead of feeling stacked too tightly.
- The old flat selector text was removed because it read poorly and made the alternate destinations look like leftover debug links rather than intentional secondary navigation.

### Human-Readable Notes

- Non-developer accounts no longer get to sit inside the protected Developer Console shell just because they have a valid StreamSuites session.
- The Developer login page now matches the public access-code treatment more closely and exposes the same subtle links to the other login surfaces.

### Files / Areas Touched

- `login/index.html`
- `css/app.css`
- `js/auth.js`
- `js/dashboard.js`
- `js/reports.js`
- `js/keys.js`
- `tests/developer-access-gating.test.mjs`
- `README.md`
- `BUMP_NOTES.md`

### Risks / Follow-Ups

- This pass still relies on the current shared StreamSuites identity model. The later dedicated Developer identity/admin-model task should revisit how protected-console eligibility is granted and presented, but it no longer needs to fix the immediate shell-access leak first.
