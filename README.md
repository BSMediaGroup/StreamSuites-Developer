# StreamSuites-Developer

Developer-console web surface for StreamSuites, intended for deployment on Cloudflare Pages at `https://console.streamsuites.app`.

## Purpose

- Public-facing intake for feedback, feature requests, and beta applications.
- Authenticated developer-facing shell for the dashboard, reports hub, and later API-access tooling.
- Static web surface only. Runtime state, auth, submissions, approvals, and future API key authority remain in `StreamSuites`.

## Studio-first visual system

- `css/app.css` now supplies the shared Studio-first typography and a technical graphite/violet console treatment with controlled orange attention states. The refresh covers the public landing, feedback, beta, login/success, authenticated dashboard, reports, report submission, keys placeholder, empty/loading/error states, tables, forms, metadata, and mobile drawer without creating a fake terminal or unsupported API-token UI.
- Tektur is used for product and top-level console identity, Blinker for body copy and controls, retained Geist Sans for existing secondary headings and display fallbacks, and IBM Plex Mono for API-like paths, statuses, artifact/report metadata, IDs, timestamps, and code. Local Blinker files live at `assets/fonts/body/Blinker-{Thin,ExtraLight,Light,Regular,SemiBold,Bold,ExtraBold,Black}.ttf` at fixed weights 100/200/300/400/600/700/800/900.
- The Blinker files are byte-identical to the approved Public font set. Its license is `assets/fonts/body/BLINKEROFL.txt`; genuine Geist and IBM Plex Mono licenses remain at `assets/fonts/GEISTMONOOFL.txt` and `assets/fonts/mono/IBMPLEXMONOOFL.txt`. No genuine Tektur license file is available locally, so font publication remains blocked.
- The landing now presents the console as the technical gateway into Browser Studio, native StudioApp, Studio for OBS, and Runtime/Auth. Existing access gates, report/feedback endpoints, artifacts, aliases, sessions, fallbacks, and reserved `/keys` truthfulness are preserved.
- Responsive layout, visible focus, table containment, and reduced motion are handled in `css/app.css`. Validation remains `node --test tests/*.test.mjs`; this static repository has no package build step.

## Authority Boundary

- `StreamSuites` owns auth/session authority, authoritative validation, submission persistence, artifact handling, and admin-review APIs.
- `StreamSuites-Dashboard` consumes the same runtime-owned intake records for admin review.
- `StreamSuites-Public /requests` is expected to redirect here, to `https://console.streamsuites.app/feedback`.
- This repo does not create an alternate identity system or canonical submission store.
- The authenticated-shell footer status widget keeps Atlassian's public Status API as official state. Its fully expanded panel also reads Runtime/Auth's sanitized public diagnostics projection for exactly two configured Atlassian custom metrics: measured Core API response time and explicitly deferred Studio Room Readiness. Diagnostics remain optional, read-only, and unable to override official state.

## Routes

- `/` public landing and routing hub
- `/feedback` standalone public feedback and request intake plus approved request board
- `/beta` standalone public beta-program landing
- `/beta/apply` standalone public beta application form
- `/dashboard` authenticated console home inside the sidebar/topbar shell
- `/reports` authenticated reports hub inside the sidebar/topbar shell
- `/reports/submit` canonical standalone authenticated developer-only technical reporting route
- `/keys` authenticated placeholder for future API key management inside the sidebar/topbar shell
- `/login` sign-in handoff using existing StreamSuites auth flows, now with auth-gate bypass parity and provider icons
- `/login-success` auth-success return surface
- legacy `/auth/login` and `/auth/success` URLs redirect to the browser routes above
- legacy `/report/submit` redirects to canonical `/reports/submit`

## Local Notes

- This repo is Pages-oriented static HTML plus Pages Functions proxy routes.
- Browser requests stay same-origin and proxy to the authoritative Auth/API runtime through `functions/api`, `functions/auth`, and `functions/oauth`.
- Start from `.env.example` for local environment notes. Actual Cloudflare/environment setup steps are in `DEPLOYMENT_SETUP.md`.

## Deploy Notes

- Canonical production hostname in this repo is `console.streamsuites.app`.
- Future aliasing such as `developer.streamsuites.app` should be additive and must not move runtime authority into this repo.
- Manual post-code setup steps are documented in `DEPLOYMENT_SETUP.md`; this task does not create the Pages project, DNS, or domain attachment.

## Repo Tree (Abridged, Current)

```text
StreamSuites-Developer/
├── .env.example
├── .gitignore
├── _headers
├── _redirects
├── BUMP_NOTES.md
├── DEPLOYMENT_SETUP.md
├── README.md
├── index.html
├── auth/
│   ├── login/
│   │   └── index.html
│   └── success/
│       └── index.html
├── beta/
│   ├── index.html
│   └── apply/
│       └── index.html
├── css/
│   ├── app.css
│   └── status-widget.css
├── dashboard/
│   └── index.html
├── feedback/
│   └── index.html
├── functions/
│   ├── _shared/
│   │   └── auth-api-proxy.js
│   ├── api/
│   │   └── [[path]].js
│   ├── auth/
│   │   └── [[path]].js
│   └── oauth/
│       └── [[path]].js
├── js/
│   ├── api.js
│   ├── auth.js
│   ├── auth-success.js
│   ├── beta-apply.js
│   ├── config.js
│   ├── dashboard.js
│   ├── feedback.js
│   ├── keys.js
│   ├── login.js
│   ├── report-surface-catalog.mjs
│   ├── report-submit.js
│   ├── reports.js
│   ├── status-widget.js
│   └── utils/
│       ├── global-loader.js
│       ├── version-stamp.js
│       └── versioning.js
├── keys/
│   └── index.html
├── login/
│   └── index.html
├── login-success/
│   └── index.html
├── report/
│   └── submit/
│       └── index.html
├── reports/
│   ├── index.html
│   └── submit/
│       └── index.html
├── runtime/
│   └── exports/
│       └── version.json
├── tests/
│   └── developer-access-gating.test.mjs
└── assets/
    ├── fonts/
    │   ├── Tektur-VariableFont_wdth,wght.ttf
    │   ├── Geist-{Light,Regular,Medium,SemiBold,Bold,ExtraBold}.ttf
    │   ├── GEISTMONOOFL.txt
    │   ├── body/
    │   │   ├── Blinker-{Thin,ExtraLight,Light,Regular,SemiBold,Bold,ExtraBold,Black}.ttf
    │   │   └── BLINKEROFL.txt
    │   └── mono/
    │       ├── IBMPlexMono-{Light,Regular,Medium,SemiBold,Bold}.ttf
    │       └── IBMPLEXMONOOFL.txt
    └── ... (existing shared brand/media asset tree, including icons/ui/ss-admin.svg, ss-creator.svg, ss-developer.svg, ss-public.svg)
```
