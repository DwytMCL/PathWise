import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCurriculum } from "../lib/curriculum";
import { DEVICE_PLAN_KEY, loadDevicePlan, saveDevicePlan, forgetDevicePlan } from "../lib/device-plan";

test("device storage writes only when asked, resumes the workspace and forgets just its own record", () => {
  const values = new Map<string, string>([["unrelated", "keep"]]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  assert.equal(loadDevicePlan(storage), null);
  assert.equal(values.size, 1);
  const workspace = { curriculum: normalizeCurriculum({ courses: [{ code: "A", year: 1, term: 1, status: "Failed" }] }), options: { startTerm: 4, maxUnits: 12, assumeCurrentPass: false }, scenarios: [] };
  saveDevicePlan(storage, workspace);
  assert.deepEqual(loadDevicePlan(storage)!.workspace, workspace);
  forgetDevicePlan(storage);
  assert.equal(loadDevicePlan(storage), null);
  assert.deepEqual([...values], [["unrelated", "keep"]]);
});

test("corrupt records and storage failures surface without destroying the existing record", () => {
  const values = new Map([[DEVICE_PLAN_KEY, "invalid JSON"]]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("denied"); } };
  assert.throws(() => loadDevicePlan(storage), SyntaxError);
  const workspace = { curriculum: normalizeCurriculum({ courses: [{ code: "A", year: 1, term: 1 }] }), options: { startTerm: 1, maxUnits: 18, assumeCurrentPass: true }, scenarios: [] };
  assert.throws(() => saveDevicePlan(storage, workspace), /quota/);
  assert.throws(() => forgetDevicePlan(storage), /denied/);
  assert.equal(values.get(DEVICE_PLAN_KEY), "invalid JSON");
});
