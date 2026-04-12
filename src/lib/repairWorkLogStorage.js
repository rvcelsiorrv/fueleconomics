/** Ключ в localStorage для журнала ремонта топливных систем. */
export const REPAIR_WORKLOG_STORAGE_KEY = "fuel-systems-repair-worklog-v1";

/**
 * @returns {{ organizations: unknown[], entries: unknown[] }}
 */
export function loadRepairWorkLogState() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { organizations: [], entries: [] };
  }
  try {
    const raw = window.localStorage.getItem(REPAIR_WORKLOG_STORAGE_KEY);
    if (!raw) return { organizations: [], entries: [] };
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object")
      return { organizations: [], entries: [] };
    return {
      organizations: Array.isArray(data.organizations) ? data.organizations : [],
      entries: Array.isArray(data.entries) ? data.entries : [],
    };
  } catch {
    return { organizations: [], entries: [] };
  }
}

/**
 * @param {unknown[]} organizations
 * @param {unknown[]} entries
 */
export function saveRepairWorkLogState(organizations, entries) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      REPAIR_WORKLOG_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        organizations,
        entries,
      }),
    );
  } catch (e) {
    console.warn("Не удалось сохранить журнал в localStorage:", e);
  }
}
