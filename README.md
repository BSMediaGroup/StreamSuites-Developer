# StreamSuites-Developer

Developer-console web surface for StreamSuites, intended for deployment on Cloudflare Pages at `https://console.streamsuites.app`.

## Purpose

- Public-facing intake for feedback, feature requests, and beta applications.
- Authenticated developer-facing shell for detailed reporting and later API-access tooling.
- Static web surface only. Runtime state, auth, submissions, approvals, and future API key authority remain in `StreamSuites`.

## Authority Boundary

- `StreamSuites` owns auth/session authority, authoritative validation, submission persistence, artifact handling, and admin-review APIs.
- `StreamSuites-Dashboard` consumes the same runtime-owned intake records for admin review.
- `StreamSuites-Public /requests` is now expected to redirect here, to `https://console.streamsuites.app/feedback`.
- This repo does not create an alternate identity system or canonical submission store.

## Routes

- `/` public landing and routing hub
- `/feedback` public feedback and request intake plus approved request board
- `/beta` public beta-program landing
- `/beta/apply` public beta application form
- `/dashboard` authenticated console home
- `/report/submit` authenticated developer-only technical reporting route
- `/keys` authenticated placeholder for future API key management
- `/login` sign-in handoff using existing StreamSuites auth flows
- `/login-success` auth-success return surface
- legacy `/auth/login` and `/auth/success` URLs redirect to the non-conflicting browser routes above

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
├── beta/
│   ├── index.html
│   └── apply/
│       └── index.html
├── css/
│   └── app.css
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
│   └── report-submit.js
├── login/
│   └── index.html
├── login-success/
│   └── index.html
├── keys/
│   └── index.html
├── report/
│   └── submit/
│       └── index.html
└── assets/
    └── ... (existing shared brand/media asset tree)
```
