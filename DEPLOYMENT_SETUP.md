# StreamSuites Developer Console Deployment Setup

Manual steps after this code milestone:

1. Confirm the GitHub repo and intended branch are the ones connected for the `StreamSuites-Developer` Pages project.
2. Create or connect the Cloudflare Pages project for this repo and publish from the repo root.
3. Attach the custom domain `console.streamsuites.app` to that Pages project.
4. Set `STREAMSUITES_API_ORIGIN=https://api.streamsuites.app` in the Pages environment.
5. Verify the new public redirect from `https://streamsuites.app/requests` lands on `https://console.streamsuites.app/feedback`.
6. Confirm `/login/` renders as a static page on the published console and that legacy `/auth/login` redirects there instead of falling into the `/functions/auth` proxy.
7. Confirm `/login-success/` renders as a static page and legacy `/auth/success` redirects there.
8. Confirm `/dashboard/`, `/reports/`, and `/keys/` render inside the authenticated sidebar/topbar shell after sign-in.
9. Confirm `/feedback/`, `/beta/`, `/beta/apply/`, and `/reports/submit/` render with the lighter standalone header rather than the authenticated shell.
10. Confirm legacy `/report/submit` redirects to canonical `/reports/submit/`.
11. Confirm the runtime/Auth service already exposes the current intake endpoints before validating forms on the published console.
12. Confirm `StreamSuites-Dashboard` can read the new admin intake endpoints from the same runtime/Auth origin.
