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

test("shared auth helpers consume runtime developer console access state", () => {
  const authJs = read("js/auth.js");
  assert.match(authJs, /developer_console_access/);
  assert.match(authJs, /admin_access/);
  assert.match(authJs, /creator_workspace_access/);
  assert.match(authJs, /access_class/);
  assert.match(authJs, /display_tier_label/);
  assert.match(authJs, /user-menu-overview/);
  assert.match(authJs, /Creator Dashboard/);
  assert.match(authJs, /Admin Dashboard/);
  assert.match(authJs, /Open feedback/);
  assert.match(authJs, /developer-authorized StreamSuites account/);
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
