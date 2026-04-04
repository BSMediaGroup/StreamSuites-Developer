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
  assert.match(authJs, /Open feedback/);
  assert.match(authJs, /developer-authorized StreamSuites account/);
});
