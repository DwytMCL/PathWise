import assert from "node:assert/strict";

// Run against an already-running dev or production preview. Graph positioning
// styles must be present on first load, before the lazy graph is ever opened.
const base = process.argv[2] ?? "http://localhost:3000";
const response = await fetch(base);
assert.ok(response.ok, `Preview returned ${response.status}`);
const html = await response.text();
const stylesheets = [...html.matchAll(/<link\b[^>]*>/g)]
  .map(match => match[0])
  .filter(tag => /rel="stylesheet"/.test(tag))
  .map(tag => tag.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&"))
  .filter(Boolean);
assert.ok(stylesheets.length, "No stylesheets linked by the initial page");
const css = (await Promise.all(stylesheets.map(async path => {
  const result = await fetch(new URL(path, base));
  assert.ok(result.ok, `Stylesheet returned ${result.status}: ${path}`);
  return result.text();
}))).join("\n");
for (const selector of ["react-flow__node", "react-flow__container", "react-flow__panel"]) {
  assert.ok(new RegExp(`\\.${selector}(?:[\\s,:.][^{}]*)?\\s*\\{[^}]*position:\\s*absolute`).test(css), `Missing graph positioning for ${selector}`);
}
console.log("Preview serves graph positioning styles before the graph is opened.");
