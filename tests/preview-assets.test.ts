import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("development and production use different Next output directories", () => {
  const readDist = (mode: "development" | "production" | "test") => execFileSync(process.execPath, ["--input-type=module", "-e", `import config from ${JSON.stringify(new URL("../next.config.mjs", import.meta.url).href)}; process.stdout.write(config.distDir);`], {
    env: { ...process.env, NODE_ENV: mode }, encoding: "utf8",
  });
  assert.equal(readDist("development"), ".next-dev");
  assert.equal(readDist("production"), ".next");
});
