import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("protected console pages opt into developer-required gating", () => {
  for (const relativePath of ["js/dashboard.js", "js/reports.js", "js/keys.js", "js/report-submit.js"]) {
    assert.match(read(relativePath), /developerRequired:\s*true/);
  }
});

test("shared auth helpers consume runtime developer console access state and split shell from standalone bootstraps", () => {
  const authJs = read("js/auth.js");
  assert.match(authJs, /developer_console_access/);
  assert.match(authJs, /admin_access/);
  assert.match(authJs, /creator_workspace_access/);
  assert.match(authJs, /access_class/);
  assert.match(authJs, /display_tier_label/);
  assert.match(authJs, /ss-user-menu-overview/);
  assert.match(authJs, /streamsuites-auth-toggle/);
  assert.match(authJs, /user-menu-link/);
  assert.match(authJs, /clearStandaloneShellState/);
  assert.match(authJs, /export async function initShellPage/);
  assert.match(authJs, /export async function initStandalonePage/);
  assert.match(authJs, /Creator Dashboard/);
  assert.match(authJs, /Admin Dashboard/);
  assert.match(authJs, /Open feedback/);
  assert.match(authJs, /developer-authorized StreamSuites account/);
});

test("shell routes use the shell bootstrap and standalone routes use the standalone bootstrap", () => {
  for (const relativePath of ["js/dashboard.js", "js/reports.js", "js/keys.js"]) {
    assert.match(read(relativePath), /initShellPage/);
    assert.doesNotMatch(read(relativePath), /initStandalonePage/);
  }

  for (const relativePath of ["js/report-submit.js", "js/feedback.js", "js/beta-apply.js"]) {
    assert.match(read(relativePath), /initStandalonePage/);
    assert.doesNotMatch(read(relativePath), /initShellPage/);
  }

  for (const relativePath of ["index.html", "beta/index.html", "login/index.html", "login-success/index.html"]) {
    assert.match(read(relativePath), /initStandalonePage/);
    assert.doesNotMatch(read(relativePath), /initShellPage/);
  }
});

test("authenticated console pages use the admin-style shell structure", () => {
  for (const relativePath of ["dashboard/index.html", "reports/index.html", "keys/index.html"]) {
    const html = read(relativePath);
    assert.match(html, /<body class="developer-shell-page">/);
    assert.match(html, /<div id="app">/);
    assert.match(html, /<aside id="app-nav" class="ss-sidebar">/);
    assert.match(html, /id="app-nav-list"/);
    assert.match(html, /id="sidebar-collapse-toggle"/);
    assert.match(html, /id="app-header" class="ss-topbar"/);
    assert.match(html, /id="app-footer"/);
    assert.match(html, /data-view="beta"/);
    assert.doesNotMatch(html, /class="console-sidebar"/);
  }
});

test("standalone routes stay structurally outside the authenticated shell", () => {
  for (const relativePath of [
    "feedback/index.html",
    "beta/index.html",
    "beta/apply/index.html",
    "reports/submit/index.html",
    "login/index.html",
    "login-success/index.html",
  ]) {
    const html = read(relativePath);
    assert.doesNotMatch(html, /developer-shell-page/);
    assert.doesNotMatch(html, /<div id="app">/);
    assert.doesNotMatch(html, /id="app-nav"/);
    assert.doesNotMatch(html, /id="app-header"/);
    assert.doesNotMatch(html, /id="sidebar-collapse-toggle"/);
    assert.doesNotMatch(html, /id="app-footer"/);
  }
});

test("standalone report submit stays outside the authenticated shell and uses structured fields", () => {
  const html = read("reports/submit/index.html");
  assert.doesNotMatch(html, /<div id="app">/);
  assert.doesNotMatch(html, /id="app-nav"/);
  assert.match(html, /name="affected_area_choice"/);
  assert.match(html, /name="affected_area_other"/);
  assert.match(html, /name="environment_os"/);
  assert.match(html, /name="environment_browser"/);
  assert.match(html, /name="context_surface"/);
  assert.match(html, /id="context-surface-select"/);
  assert.match(html, /name="context_route"/);
  assert.match(html, /field-badge is-required/);
  assert.match(html, /field-badge is-optional/);
});

test("developer report surface catalog covers the full product surface map with grouped options and Other", async () => {
  const moduleUrl = pathToFileURL(path.join(repoRoot, "js/report-surface-catalog.mjs")).href;
  const { REPORT_SURFACE_GROUPS, REPORT_SURFACE_LABELS } = await import(moduleUrl);

  assert.equal(REPORT_SURFACE_GROUPS.length, 5);
  assert.deepEqual(
    REPORT_SURFACE_GROUPS.map((group) => group.label),
    [
      "Public and viewer-facing surfaces",
      "Creator, admin, and developer surfaces",
      "Apps and extension surfaces",
      "Shared platform systems",
      "Core runtime and internal systems",
    ],
  );

  for (const surfaceKey of [
    "public_site",
    "findmehere_profiles",
    "docs_site",
    "creator_dashboard",
    "admin_dashboard",
    "developer_console",
    "livechat_launcher",
    "desktop_admin_winforms",
    "alerts_app",
    "auth_api",
    "shared_state_exports",
    "runtime_core",
    "runtime_livechat_backend",
  ]) {
    assert.ok(REPORT_SURFACE_LABELS[surfaceKey], `${surfaceKey} should be present in the report surface catalog`);
  }

  assert.equal(REPORT_SURFACE_LABELS.other, "Other");
});

test("report submission script maps structured fields back into the existing flat payload contract", () => {
  const reportSubmitJs = read("js/report-submit.js");
  assert.match(reportSubmitJs, /populateReportSurfaceSelect/);
  assert.match(reportSubmitJs, /getReportSurfaceLabel/);
  assert.match(reportSubmitJs, /function buildDeveloperReportPayload/);
  assert.match(reportSubmitJs, /function parseExtraMetadata/);
  assert.match(reportSubmitJs, /affected_area:\s*affectedAreaSummary\.join/);
  assert.match(reportSubmitJs, /environment_details:\s*buildDelimitedText/);
  assert.match(reportSubmitJs, /platform_details:\s*buildDelimitedText/);
  assert.match(reportSubmitJs, /account_context:\s*buildDelimitedText/);
  assert.match(reportSubmitJs, /structured_metadata:\s*JSON\.stringify/);
  assert.match(reportSubmitJs, /Advanced structured metadata must be valid JSON/);
});

test("developer login keeps the key icon path and collapsed alternate surfaces", () => {
  const loginHtml = read("login/index.html");
  const appCss = read("css/app.css");

  assert.match(loginHtml, /Login to other surfaces/);
  assert.doesNotMatch(loginHtml, /Elsewhere/);
  assert.match(loginHtml, /Creator Dashboard/);
  assert.match(loginHtml, /Admin Dashboard/);
  assert.match(appCss, /assets\/icons\/ui\/key\.svg/);
  assert.match(appCss, /surface-links__icon--public/);
});

test("developer login turnstile visibility still follows the runtime config contract", () => {
  const loginJs = read("js/login.js");
  const appCss = read("css/app.css");

  assert.match(loginJs, /payload\?\.enabled === true/);
  assert.match(loginJs, /turnstilePanelEl\.hidden = !turnstileState\.enabled/);
  assert.match(loginJs, /if \(!turnstileState\.enabled \|\| !turnstileSlotEl\)/);
  assert.match(loginJs, /if \(!turnstileState\.enabled\) return "";/);
  assert.match(appCss, /\.turnstile-panel\[hidden\]/);
});
