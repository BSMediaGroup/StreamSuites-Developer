import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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
  assert.match(html, /name="context_route"/);
  assert.match(html, /field-badge is-required/);
  assert.match(html, /field-badge is-optional/);
});

test("report submission script maps structured fields back into the existing flat payload contract", () => {
  const reportSubmitJs = read("js/report-submit.js");
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
