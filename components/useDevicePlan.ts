"use client";

import { useEffect, useState } from "react";
import { DEVICE_PLAN_KEY, forgetDevicePlan, loadDevicePlan, saveDevicePlan } from "@/lib/device-plan";
import type { PlanningWorkspace } from "@/lib/workspace";

type DeviceDraft = ReturnType<typeof loadDevicePlan>;

export default function useDevicePlan(workspace: PlanningWorkspace | null) {
  const [draft, setDraft] = useState<DeviceDraft>(null);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState<PlanningWorkspace | null>(null);
  const [retry, setRetry] = useState(0);
  const active = workspace !== null;

  function flush() {
    if (!enabled || !workspace) return true;
    try {
      const savedAt = saveDevicePlan(window.localStorage, workspace);
      setDraft({ workspace, savedAt }); setLastSaved(workspace); setError("");
      setMessage(`Saved on this device · ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      return true;
    } catch {
      setMessage(""); setError("Autosave failed. Your changes are still open here. Download a plan copy to keep them, or try again.");
      return false;
    }
  }

  useEffect(() => {
    try { setDraft(loadDevicePlan(window.localStorage)); }
    catch { setError("Device storage could not be read. You can still import files and download your plan."); }
  }, []);

  useEffect(() => {
    function anotherTab(event: StorageEvent) {
      if (event.key !== DEVICE_PLAN_KEY && event.key !== null) return;
      try { setDraft(loadDevicePlan(window.localStorage)); }
      catch { setError("The plan saved by another tab could not be read."); }
      if (active && enabled) {
        setEnabled(false); setLastSaved(null); setMessage("");
        setError("Another tab changed this device’s saved plan. Autosave is paused here. Download your changes, or enable autosave again to replace that saved plan.");
      }
    }
    window.addEventListener("storage", anotherTab);
    return () => window.removeEventListener("storage", anotherTab);
  }, [active, enabled]);

  useEffect(() => {
    if (!enabled || !workspace) return;
    setMessage("Saving on this device…");
    const timer = window.setTimeout(() => {
      try {
        const savedAt = saveDevicePlan(window.localStorage, workspace);
        setDraft({ workspace, savedAt }); setLastSaved(workspace); setError("");
        setMessage(`Saved on this device · ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      } catch {
        setMessage(""); setError("Autosave failed. Your changes are still open here. Download a plan copy to keep them, or try again.");
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [enabled, workspace, retry]);

  function forget() {
    setEnabled(false); setLastSaved(null);
    try { forgetDevicePlan(window.localStorage); setDraft(null); setMessage("Removed from this device."); setError(""); }
    catch { setMessage(""); setError("The saved plan could not be removed from this device. Browser site-data settings can remove it."); }
  }

  return { draft, enabled, message, error, lastSaved, forget, flush,
    enable: () => { setEnabled(true); setError(""); },
    pause: () => { setEnabled(false); setLastSaved(null); setMessage(""); }, retry: () => setRetry(value => value + 1) };
}
