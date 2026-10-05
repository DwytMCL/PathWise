import { parseWorkspaceFile, serializePlanFile } from "./plan-file";
import type { PlanningWorkspace } from "./workspace";

export const DEVICE_PLAN_KEY = "pathwise.device-plan";
type DeviceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function loadDevicePlan(storage: DeviceStorage) {
  const text = storage.getItem(DEVICE_PLAN_KEY);
  if (text === null) return null;
  const file = JSON.parse(text);
  const workspace = parseWorkspaceFile(file);
  return { workspace, savedAt: typeof file.savedAt === "string" && Number.isFinite(Date.parse(file.savedAt)) ? file.savedAt : null };
}

export function saveDevicePlan(storage: DeviceStorage, workspace: PlanningWorkspace) {
  const text = serializePlanFile(workspace.curriculum, workspace);
  storage.setItem(DEVICE_PLAN_KEY, text);
  return JSON.parse(text).savedAt as string;
}

export function forgetDevicePlan(storage: DeviceStorage) {
  storage.removeItem(DEVICE_PLAN_KEY);
}
