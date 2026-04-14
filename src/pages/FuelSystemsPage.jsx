import { Button, DatePicker, Input, InputNumber, Modal, Select } from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/ru";
import { useEffect, useMemo, useRef, useState } from "react";

dayjs.extend(customParseFormat);
dayjs.locale("ru");

function parseDraftDate(iso) {
  if (!iso || typeof iso !== "string") return null;
  const d = dayjs(iso, "YYYY-MM-DD", true);
  return d.isValid() ? d : null;
}
import {
  loadRepairWorkLogState,
  saveRepairWorkLogState,
} from "../lib/repairWorkLogStorage";

function makeRepairWorkLogId() {
  return `rwl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDateRu(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function phoneToTelHref(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return undefined;
  return `tel:+${digits}`;
}

/** Один номер ТНВД на единицу транспорта; поддержка старых записей с pumpNumbers[]. */
function normalizePumpNumberFromEntry(entry) {
  const direct = String(entry?.pumpNumber ?? "").trim();
  if (direct) return direct;
  const legacy = entry?.pumpNumbers;
  if (Array.isArray(legacy) && legacy.length > 0) {
    return String(legacy[0] ?? "").trim();
  }
  return "";
}

function stripLegacyPumpNumbers(row) {
  if (!row || typeof row !== "object") return row;
  const { pumpNumbers: _omit, ...rest } = row;
  return rest;
}

/** Параметры ТНВД: массив строк; поддержка старых записей с одной строкой текста. */
function normalizeHpfpParametersFromEntry(entry) {
  const raw = entry?.hpfpParameters;
  const baseId = entry?.id ?? "entry";
  if (Array.isArray(raw)) {
    return raw
      .map((p, i) => {
        if (p && typeof p === "object") {
          const name = String(p.name ?? "").trim();
          if (!name) return null;
          return {
            id: String(p.id ?? `hpfpp-${baseId}-${i}`),
            name,
          };
        }
        if (typeof p === "string") {
          const name = p.trim();
          if (!name) return null;
          return { id: `hpfpp-str-${baseId}-${i}`, name };
        }
        return null;
      })
      .filter(Boolean);
  }
  const s = String(raw ?? "").trim();
  if (!s) return [];
  return s
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((name, i) => ({
      id: `hpfpp-legacy-${baseId}-${i}`,
      name,
    }));
}

function makeEmptyWorkLogDraft(orgId) {
  return {
    orgId,
    clientLastName: "",
    clientPhone: "",
    transportType: "",
    hpfpType: "",
    pumpNumber: "",
    startDate: "",
    endDate: "",
    completedWorks: "",
    hpfpParameters: [],
    remark: "",
    installedParts: [],
  };
}

function normalizeLoadedOrganization(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    shortName: String(raw.shortName ?? "").trim(),
    phone: String(raw.phone ?? "").trim(),
  };
}

function normalizeLoadedPart(p, i) {
  if (!p || typeof p !== "object") return null;
  const name = String(p.name ?? "").trim();
  if (!name) return null;
  const qty = Math.max(1, parseInt(String(p.qty), 10) || 1);
  return {
    id: String(p.id ?? `wlp-loaded-${i}`),
    name,
    qty,
  };
}

function normalizeLoadedEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? "").trim();
  if (!id) return null;
  const base = stripLegacyPumpNumbers({
    ...raw,
    id,
    orgId: String(raw.orgId ?? "").trim(),
    clientLastName: raw.clientLastName ?? "",
    clientPhone: String(raw.clientPhone ?? "").trim(),
    transportType: raw.transportType ?? "",
    hpfpType: raw.hpfpType ?? "",
    startDate: raw.startDate ?? "",
    endDate: raw.endDate ?? "",
    completedWorks: String(raw.completedWorks ?? ""),
    remark: raw.remark ?? "",
    installedParts: Array.isArray(raw.installedParts)
      ? raw.installedParts
        .map((p, i) => normalizeLoadedPart(p, i))
        .filter(Boolean)
      : [],
  });
  return {
    ...base,
    pumpNumber: normalizePumpNumberFromEntry(base),
    hpfpParameters: normalizeHpfpParametersFromEntry(base),
  };
}

function buildInitialStateFromStorage() {
  const { organizations: rawOrgs, entries: rawEntries } =
    loadRepairWorkLogState();
  const organizations = rawOrgs
    .map((o) => normalizeLoadedOrganization(o))
    .filter(Boolean);
  const entries = rawEntries.map(normalizeLoadedEntry).filter(Boolean);
  return { organizations, entries };
}

export default function FuelSystemsPage() {
  const initialStored = useMemo(() => buildInitialStateFromStorage(), []);

  const [workLogOrganizations, setWorkLogOrganizations] = useState(
    () => initialStored.organizations,
  );

  const workLogOrgById = useMemo(
    () => Object.fromEntries(workLogOrganizations.map((o) => [o.id, o])),
    [workLogOrganizations],
  );

  const [workLogEntries, setWorkLogEntries] = useState(
    () => initialStored.entries,
  );

  const skipNextPersist = useRef(true);

  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogAddOrgModalOpen, setWorkLogAddOrgModalOpen] = useState(false);
  const [workLogNewOrg, setWorkLogNewOrg] = useState({ shortName: "" });
  const [workLogEditingId, setWorkLogEditingId] = useState(null);
  const [workLogDraft, setWorkLogDraft] = useState(() =>
    makeEmptyWorkLogDraft(initialStored.organizations[0]?.id ?? ""),
  );
  const [workLogPartDraft, setWorkLogPartDraft] = useState({
    name: "",
    qty: "1",
  });
  const [workLogHpfpParamDraft, setWorkLogHpfpParamDraft] = useState({
    name: "",
  });
  const [workLogClientLastNameMissing, setWorkLogClientLastNameMissing] =
    useState(false);
  const [selectedWorkLogSettlementId, setSelectedWorkLogSettlementId] =
    useState(null);

  const [workLogTableFilterTransport, setWorkLogTableFilterTransport] =
    useState("");
  const [workLogTableFilterHpfpType, setWorkLogTableFilterHpfpType] =
    useState("");
  const [workLogTableFilterPumpNumber, setWorkLogTableFilterPumpNumber] =
    useState("");

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
    } else {
      saveRepairWorkLogState(workLogOrganizations, workLogEntries);
    }
  }, [workLogOrganizations, workLogEntries]);

  useEffect(() => {
    if (workLogOrganizations.length === 0) {
      setSelectedWorkLogSettlementId(null);
      return;
    }
    setSelectedWorkLogSettlementId((cur) => {
      if (!cur) return null;
      return workLogOrganizations.some((o) => o.id === cur) ? cur : null;
    });
  }, [workLogOrganizations]);

  useEffect(() => {
    setWorkLogDraft((d) => {
      if (workLogOrganizations.length === 0) {
        return d.orgId ? { ...d, orgId: "" } : d;
      }
      if (workLogOrganizations.some((o) => o.id === d.orgId)) return d;
      return {
        ...d,
        orgId: workLogOrganizations[0].id,
      };
    });
  }, [workLogOrganizations]);

  useEffect(() => {
    if (!selectedWorkLogSettlementId) {
      setWorkLogModalOpen(false);
      setWorkLogEditingId(null);
      setWorkLogAddOrgModalOpen(false);
    }
  }, [selectedWorkLogSettlementId]);

  useEffect(() => {
    setWorkLogTableFilterTransport("");
    setWorkLogTableFilterHpfpType("");
    setWorkLogTableFilterPumpNumber("");
  }, [selectedWorkLogSettlementId]);

  const workLogOrgStats = useMemo(() => {
    return workLogOrganizations.map((o) => {
      const uniquePump = new Set();
      let applicationsCount = 0;
      for (const e of workLogEntries) {
        if (e.orgId !== o.id) continue;
        applicationsCount += 1;
        const pn = normalizePumpNumberFromEntry(e);
        if (pn) uniquePump.add(pn);
      }
      return {
        ...o,
        applicationsCount,
        uniquePumpNumbersCount: uniquePump.size,
      };
    });
  }, [workLogOrganizations, workLogEntries]);

  const workLogOrgStatsSorted = useMemo(
    () =>
      [...workLogOrgStats].sort((a, b) =>
        a.shortName.localeCompare(b.shortName, "ru"),
      ),
    [workLogOrgStats],
  );

  const workLogEntriesForSelectedSettlement = useMemo(() => {
    if (!selectedWorkLogSettlementId) return [];
    return workLogEntries.filter(
      (e) => e.orgId === selectedWorkLogSettlementId,
    );
  }, [workLogEntries, selectedWorkLogSettlementId]);

  const workLogTableFilterOptions = useMemo(() => {
    const transports = new Set();
    const hpfpTypes = new Set();
    const pumpNumbers = new Set();
    for (const e of workLogEntriesForSelectedSettlement) {
      const t = String(e.transportType ?? "").trim();
      if (t) transports.add(t);
      const h = String(e.hpfpType ?? "").trim();
      if (h) hpfpTypes.add(h);
      const p = normalizePumpNumberFromEntry(e);
      if (p) pumpNumbers.add(p);
    }
    return {
      transports: [...transports].sort((a, b) =>
        a.localeCompare(b, "ru"),
      ),
      hpfpTypes: [...hpfpTypes].sort((a, b) => a.localeCompare(b, "ru")),
      pumpNumbers: [...pumpNumbers].sort((a, b) =>
        a.localeCompare(b, "ru"),
      ),
    };
  }, [workLogEntriesForSelectedSettlement]);

  useEffect(() => {
    setWorkLogTableFilterTransport((v) =>
      v && !workLogTableFilterOptions.transports.includes(v) ? "" : v,
    );
    setWorkLogTableFilterHpfpType((v) =>
      v && !workLogTableFilterOptions.hpfpTypes.includes(v) ? "" : v,
    );
    setWorkLogTableFilterPumpNumber((v) =>
      v && !workLogTableFilterOptions.pumpNumbers.includes(v) ? "" : v,
    );
  }, [workLogTableFilterOptions]);

  const workLogEntriesFilteredForTable = useMemo(() => {
    return workLogEntriesForSelectedSettlement.filter((entry) => {
      if (workLogTableFilterTransport) {
        const t = String(entry.transportType ?? "").trim();
        if (t !== workLogTableFilterTransport) return false;
      }
      if (workLogTableFilterHpfpType) {
        const h = String(entry.hpfpType ?? "").trim();
        if (h !== workLogTableFilterHpfpType) return false;
      }
      if (workLogTableFilterPumpNumber) {
        if (normalizePumpNumberFromEntry(entry) !== workLogTableFilterPumpNumber)
          return false;
      }
      return true;
    });
  }, [
    workLogEntriesForSelectedSettlement,
    workLogTableFilterTransport,
    workLogTableFilterHpfpType,
    workLogTableFilterPumpNumber,
  ]);

  const selectedWorkLogSettlement =
    selectedWorkLogSettlementId != null
      ? workLogOrgById[selectedWorkLogSettlementId]
      : undefined;

  const selectWorkLogSettlement = (orgId) => {
    setSelectedWorkLogSettlementId((cur) => (cur === orgId ? null : orgId));
  };

  const openWorkLogModal = () => {
    const preferredId =
      selectedWorkLogSettlementId &&
        workLogOrganizations.some((o) => o.id === selectedWorkLogSettlementId)
        ? selectedWorkLogSettlementId
        : null;
    if (!preferredId) return;
    setWorkLogEditingId(null);
    setWorkLogAddOrgModalOpen(false);
    setWorkLogDraft(makeEmptyWorkLogDraft(preferredId));
    setWorkLogPartDraft({ name: "", qty: "1" });
    setWorkLogHpfpParamDraft({ name: "" });
    setWorkLogClientLastNameMissing(false);
    setWorkLogModalOpen(true);
  };

  const openWorkLogEditModal = (entry) => {
    setWorkLogEditingId(entry.id);
    setWorkLogAddOrgModalOpen(false);
    setWorkLogDraft({
      orgId: entry.orgId,
      clientLastName: entry.clientLastName ?? "",
      clientPhone: String(entry.clientPhone ?? "").trim(),
      transportType: entry.transportType ?? "",
      hpfpType: entry.hpfpType ?? "",
      startDate: entry.startDate,
      endDate: entry.endDate,
      completedWorks: entry.completedWorks,
      hpfpParameters: normalizeHpfpParametersFromEntry(entry).map((p) => ({
        ...p,
      })),
      remark: entry.remark ?? "",
      installedParts: (entry.installedParts ?? []).map((p) => ({ ...p })),
      pumpNumber: normalizePumpNumberFromEntry(entry),
    });
    setWorkLogPartDraft({ name: "", qty: "1" });
    setWorkLogHpfpParamDraft({ name: "" });
    setWorkLogClientLastNameMissing(false);
    setWorkLogModalOpen(true);
  };

  const closeWorkLogModal = () => {
    setWorkLogModalOpen(false);
    setWorkLogEditingId(null);
    setWorkLogAddOrgModalOpen(false);
    setWorkLogNewOrg({ shortName: "" });
    setWorkLogClientLastNameMissing(false);
  };

  const openWorkLogAddOrgModal = () => {
    setWorkLogNewOrg({ shortName: "" });
    setWorkLogAddOrgModalOpen(true);
  };

  const closeWorkLogAddOrgModal = () => {
    setWorkLogAddOrgModalOpen(false);
    setWorkLogNewOrg({ shortName: "" });
  };

  const submitWorkLogNewOrg = () => {
    const shortName = workLogNewOrg.shortName.trim();
    if (!shortName) return;
    const newOrg = {
      id: `rw-org-${Date.now()}`,
      shortName,
      phone: "",
    };
    setWorkLogOrganizations((prev) => [...prev, newOrg]);
    setWorkLogDraft((d) => ({ ...d, orgId: newOrg.id }));
    setSelectedWorkLogSettlementId(newOrg.id);
    closeWorkLogAddOrgModal();
  };

  const addWorkLogDraftPart = () => {
    const name = workLogPartDraft.name.trim();
    if (!name) return;
    const qty = Math.max(1, parseInt(String(workLogPartDraft.qty), 10) || 1);
    const id = `wlp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setWorkLogDraft((d) => ({
      ...d,
      installedParts: [...(d.installedParts ?? []), { id, name, qty }],
    }));
    setWorkLogPartDraft({ name: "", qty: "1" });
  };

  const removeWorkLogDraftPart = (partId) => {
    setWorkLogDraft((d) => ({
      ...d,
      installedParts: (d.installedParts ?? []).filter((p) => p.id !== partId),
    }));
  };

  const addWorkLogDraftHpfpParam = () => {
    const name = workLogHpfpParamDraft.name.trim();
    if (!name) return;
    const id = `whp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setWorkLogDraft((d) => ({
      ...d,
      hpfpParameters: [...(d.hpfpParameters ?? []), { id, name }],
    }));
    setWorkLogHpfpParamDraft({ name: "" });
  };

  const removeWorkLogDraftHpfpParam = (paramId) => {
    setWorkLogDraft((d) => ({
      ...d,
      hpfpParameters: (d.hpfpParameters ?? []).filter((p) => p.id !== paramId),
    }));
  };

  const setWorkLogDraftField = (field, value) => {
    setWorkLogDraft((d) => ({ ...d, [field]: value }));
  };

  const submitWorkLogFromModal = () => {
    if (!workLogDraft.clientLastName.trim()) {
      setWorkLogClientLastNameMissing(true);
      return;
    }
    setWorkLogClientLastNameMissing(false);
    const hpfpParameters = normalizeHpfpParametersFromEntry(workLogDraft);
    const payload = { ...workLogDraft, hpfpParameters };
    if (workLogEditingId) {
      setWorkLogEntries((rows) =>
        rows.map((r) =>
          r.id === workLogEditingId
            ? stripLegacyPumpNumbers({ ...r, ...payload })
            : r,
        ),
      );
    } else {
      setWorkLogEntries((rows) => [
        ...rows,
        stripLegacyPumpNumbers({
          id: makeRepairWorkLogId(),
          ...payload,
        }),
      ]);
    }
    closeWorkLogModal();
  };

  const removeWorkLogEntry = (entryId) => {
    setWorkLogEntries((rows) => rows.filter((r) => r.id !== entryId));
  };

  const lb =
    "mb-1.5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400";
  const inText =
    "w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20";
  const ta = `${inText} min-h-[7.5rem] resize-y leading-snug`;
  const iconBtn =
    "inline-flex !h-9 !w-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 outline-none transition hover:border-blue-600/30 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-400";
  const iconBtnDel =
    "inline-flex !h-9 !w-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-red-700 outline-none transition hover:bg-red-50 dark:border-red-900/40 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/50";

  const modalIntro =
    "text-sm leading-relaxed text-zinc-600 dark:text-zinc-400";
  const modalForm =
    "mt-4 flex flex-col gap-5 sm:mt-[1.15rem] sm:gap-[1.2rem]";
  const orgBlock =
    "border-b border-zinc-200 pb-4 dark:border-zinc-700";
  const orgControlsRow = "flex flex-wrap items-center gap-2";
  const fieldHint =
    "mt-1.5 text-xs leading-snug text-zinc-500 dark:text-zinc-400";
  const fieldError =
    "mt-1.5 text-xs text-red-700 dark:text-red-400";
  const partsRow =
    "flex flex-wrap items-center gap-2 border-b border-zinc-200 py-2 last:border-b-0 dark:border-zinc-700";
  const partRemove =
    "!inline-flex !h-9 min-h-9 cursor-pointer items-center justify-center border-0 bg-transparent px-1 text-lg leading-none text-zinc-500 hover:rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400";
  const addPartRow = "mt-2 flex flex-wrap items-center gap-2";
  const clientContactGrid =
    "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-0";
  const vehicleHpfpRowGrid =
    "grid grid-cols-1 gap-4 pt-0.5 md:grid-cols-3 md:gap-x-4 md:gap-y-0";
  const datesGrid =
    "grid grid-cols-1 gap-4 pt-0.5 sm:grid-cols-2 sm:gap-5";
  const worksPartsGrid =
    "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-4";
  return (
    <div className="box-border w-full max-w-none px-3 pb-14 pt-7 text-start sm:px-5">
      <header className="relative mb-9 overflow-hidden rounded-[10px] border border-zinc-200 bg-white shadow-sheet dark:border-zinc-700 dark:bg-zinc-900 sm:px-8 sm:py-7 px-5 py-6">
        <div
          className="absolute bottom-0 left-0 top-0 w-[3px] bg-blue-700 dark:bg-blue-500"
          aria-hidden
        />
        <div className="relative pl-1">
          <p className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            Журнал ремонта · автопарк
          </p>
          <h1 className="mb-3 text-pretty text-[clamp(1.45rem,3.2vw,1.95rem)] font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
            Топливные системы, расход и&nbsp;ТНВД
          </h1>
          <p className="max-w-prose text-pretty text-[0.98rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
            Журнал ремонта топливных систем по населённым пунктам. Данные
            сохраняются в браузере (localStorage) на этом устройстве.
          </p>
        </div>
      </header>

      <section className="mb-10" aria-labelledby="hpfp-orgs-title">
        <h2
          id="hpfp-orgs-title"
          className="mb-2 border-b border-zinc-200 pb-2 text-[1.0625rem] font-semibold tracking-tight text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
        >
          Учёт по населённым пунктам
        </h2>
        <p className="mb-5 max-w-prose text-pretty text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Населённые пункты из журнала: число заявок и уникальных номеров ТНВД.
          Нажмите карточку — ниже появится журнал ремонта по этому пункту;
          повторный клик по&nbsp;той же карточке снимает выбор и скрывает
          журнал.
        </p>
        <div className="flex flex-wrap gap-4">
          {workLogOrgStatsSorted.length === 0 ? (
            <div className="w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-5 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
              <p className="mb-4">
                Пока нет населённых пунктов. Добавьте первый — он появится в
                списке, и вы сможете открыть журнал ремонта по этому пункту.
              </p>
              <Button type="primary" onClick={openWorkLogAddOrgModal}>
                Добавить населённый пункт
              </Button>
            </div>
          ) : (
            workLogOrgStatsSorted.map((o) => (
              <Button
                key={o.id}
                type="default"
                htmlType="button"
                data-org-card
                className={[
                  "!flex !h-auto !min-h-0 w-fit max-w-full min-w-0 flex-col items-stretch rounded-lg border p-5 text-left font-inherit text-inherit shadow-none transition",
                  selectedWorkLogSettlementId === o.id
                    ? "border-blue-600/35 bg-blue-50 shadow-sheet dark:border-blue-500/40 dark:bg-blue-950/30"
                    : "border-zinc-200 bg-white shadow-[0_1px_0_rgb(28_25_23/0.04)] hover:border-blue-600/25 hover:shadow dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-500/30",
                ].join(" ")}
                aria-pressed={selectedWorkLogSettlementId === o.id}
                onClick={() => selectWorkLogSettlement(o.id)}
              >
                <h3 className="mb-3 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {o.shortName}
                </h3>
                <dl className="m-0 flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-700">
                  <div className="flex flex-col gap-0.5">
                    <dt className="m-0 text-[0.66rem] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Заявок
                    </dt>
                    <dd className="m-0 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {o.applicationsCount}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="m-0 text-[0.66rem] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Номеров&nbsp;ТНВД
                    </dt>
                    <dd className="m-0 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {o.uniquePumpNumbersCount}
                    </dd>
                  </div>
                </dl>
              </Button>
            ))
          )}
        </div>
      </section>

      {selectedWorkLogSettlementId && selectedWorkLogSettlement ? (
        <section className="mb-10" aria-labelledby="repair-worklog-title">
          <h2
            id="repair-worklog-title"
            className="mb-2 border-b border-zinc-200 pb-2 text-[1.0625rem] font-semibold tracking-tight text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
          >
            Журнал ремонта топливных систем
          </h2>
          <p className="mb-5 max-w-prose text-pretty text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Заявки по выбранному населённому пункту. Добавление и изменение
            карточки — в модальном окне (кнопки «Добавить карточку» и
            «Редактировать» в таблице). У каждой единицы транспорта в карточке
            указывается один ТНВД и один его номер. Чтобы скрыть журнал, нажмите
            ту же карточку пункта в&nbsp;блоке «Учёт по населённым пунктам» ещё
            раз.
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-3 gap-x-5">
            <Button type="primary" onClick={openWorkLogModal}>
              Добавить карточку
            </Button>
            <p className="m-0 text-sm text-zinc-600 dark:text-zinc-400" role="status">
              Журнал:{" "}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedWorkLogSettlement.shortName}
              </strong>
            </p>
          </div>

          <div
            className="mb-4 flex flex-wrap items-end gap-4 gap-y-3"
            role="search"
            aria-label="Фильтры таблицы журнала"
          >
            <div className="min-w-[min(100%,12rem)] flex-1 sm:max-w-[14rem]">
              <label
                htmlFor="worklog-table-filter-transport"
                className={lb}
              >
                Тип транспорта
              </label>
              <Select
                id="worklog-table-filter-transport"
                className="w-full"
                value={workLogTableFilterTransport}
                onChange={(v) => setWorkLogTableFilterTransport(v ?? "")}
                options={[
                  { value: "", label: "Все" },
                  ...workLogTableFilterOptions.transports.map((t) => ({
                    value: t,
                    label: t,
                  })),
                ]}
                popupMatchSelectWidth
              />
            </div>
            <div className="min-w-[min(100%,12rem)] flex-1 sm:max-w-[14rem]">
              <label htmlFor="worklog-table-filter-hpfp" className={lb}>
                Тип ТНВД
              </label>
              <Select
                id="worklog-table-filter-hpfp"
                className="w-full"
                value={workLogTableFilterHpfpType}
                onChange={(v) => setWorkLogTableFilterHpfpType(v ?? "")}
                options={[
                  { value: "", label: "Все" },
                  ...workLogTableFilterOptions.hpfpTypes.map((t) => ({
                    value: t,
                    label: t,
                  })),
                ]}
                popupMatchSelectWidth
              />
            </div>
            <div className="min-w-[min(100%,12rem)] flex-1 sm:max-w-[14rem]">
              <label
                htmlFor="worklog-table-filter-pump-number"
                className={lb}
              >
                Номер ТНВД
              </label>
              <Select
                id="worklog-table-filter-pump-number"
                className="w-full"
                value={workLogTableFilterPumpNumber}
                onChange={(v) => setWorkLogTableFilterPumpNumber(v ?? "")}
                options={[
                  { value: "", label: "Все" },
                  ...workLogTableFilterOptions.pumpNumbers.map((n) => ({
                    value: n,
                    label: n,
                  })),
                ]}
                popupMatchSelectWidth
              />
            </div>
            {(workLogTableFilterTransport ||
              workLogTableFilterHpfpType ||
              workLogTableFilterPumpNumber) && (
                <Button
                  onClick={() => {
                    setWorkLogTableFilterTransport("");
                    setWorkLogTableFilterHpfpType("");
                    setWorkLogTableFilterPumpNumber("");
                  }}
                >
                  Сбросить фильтры
                </Button>
              )}
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-zinc-200 bg-white shadow-[0_1px_0_rgb(28_25_23/0.04)] dark:border-zinc-700 dark:bg-zinc-900">
            <table className="w-full border-collapse text-[0.82rem]">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    П/п
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Клиент (фамилия)
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Телефон клиента
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Тип транспорта
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Тип ТНВД
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Номер ТНВД
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Начало
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Окончание
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Выполненные работы
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Установленные запчасти
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Параметры ТНВД
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    Примечание
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap bg-gradient-to-b from-zinc-50 to-zinc-100/90 px-3 py-2.5 text-left text-[0.66rem] font-semibold uppercase tracking-wide text-zinc-500 dark:from-zinc-800/90 dark:to-zinc-900 dark:text-zinc-400 max-sm:whitespace-normal max-sm:leading-snug"
                  >
                    <span className="sr-only">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {workLogEntriesForSelectedSettlement.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-3 py-5 text-center text-sm text-zinc-500 dark:text-zinc-400"
                    >
                      По этому населённому пункту заявок пока нет. Нажмите
                      «Добавить карточку».
                    </td>
                  </tr>
                ) : workLogEntriesFilteredForTable.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="px-3 py-5 text-center text-sm text-zinc-500 dark:text-zinc-400"
                    >
                      Нет записей с выбранными фильтрами. Измените условия или
                      нажмите «Сбросить фильтры».
                    </td>
                  </tr>
                ) : (
                  workLogEntriesFilteredForTable.map((entry, index) => {
                    const transportText =
                      (entry.transportType ?? "").trim() || "—";
                    const hpfpTypeText =
                      (entry.hpfpType ?? "").trim() || "—";
                    const works = entry.completedWorks.trim() || "—";
                    const hpfpParamsList = normalizeHpfpParametersFromEntry(
                      entry,
                    );
                    const remarkText =
                      (entry.remark ?? "").trim() || "—";
                    const partsList = entry.installedParts ?? [];
                    const pumpNumberText =
                      normalizePumpNumberFromEntry(entry) || "—";
                    const clientLabel =
                      (entry.clientLastName ?? "").trim() || "—";
                    const clientPhoneRaw = String(
                      entry.clientPhone ?? "",
                    ).trim();
                    const clientTelHref = phoneToTelHref(clientPhoneRaw);
                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-zinc-200 last:border-b-0 hover:bg-zinc-50/80 dark:border-zinc-700 dark:hover:bg-zinc-800/40"
                      >
                        <td className="align-top px-3 py-2.5">{index + 1}</td>
                        <td className="align-top px-3 py-2.5 font-semibold text-zinc-900 dark:text-zinc-100">
                          {clientLabel}
                        </td>
                        <td className="min-w-[9.5rem] whitespace-nowrap px-3 py-2.5 align-top text-[0.8rem] tabular-nums text-zinc-900 dark:text-zinc-200">
                          {clientPhoneRaw ? (
                            clientTelHref ? (
                              <a
                                className="text-blue-700 no-underline hover:underline dark:text-blue-400"
                                href={clientTelHref}
                              >
                                {clientPhoneRaw}
                              </a>
                            ) : (
                              clientPhoneRaw
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="min-w-[14rem] max-w-xs px-3 py-2.5 align-top text-[0.8rem] leading-snug text-zinc-900 dark:text-zinc-200">
                          {transportText}
                        </td>
                        <td className="min-w-[11rem] max-w-xs px-3 py-2.5 align-top text-[0.8rem] leading-snug text-zinc-900 dark:text-zinc-200">
                          {hpfpTypeText}
                        </td>
                        <td className="min-w-[10rem] px-3 py-2.5 align-top text-[0.8rem] tabular-nums text-zinc-900 dark:text-zinc-200">
                          {pumpNumberText}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-top tabular-nums text-zinc-900 dark:text-zinc-200">
                          {formatDateRu(entry.startDate)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 align-top tabular-nums text-zinc-900 dark:text-zinc-200">
                          {formatDateRu(entry.endDate)}
                        </td>
                        <td className="min-w-[12rem] max-w-xs px-3 py-2.5 align-top text-[0.8rem] leading-snug text-zinc-900 dark:text-zinc-200">
                          {works}
                        </td>
                        <td className="min-w-[12rem] max-w-xs px-3 py-2.5 align-top text-[0.8rem] text-zinc-900 dark:text-zinc-200">
                          {partsList.length > 0 ? (
                            <ul className="m-0 list-disc pl-[1.15em] text-left">
                              {partsList.map((p) => (
                                <li key={p.id} className="my-0.5 leading-snug">
                                  {p.name}
                                  <span className="whitespace-nowrap tabular-nums">
                                    {" "}
                                    ×{p.qty}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="min-w-[11rem] max-w-xs px-3 py-2.5 align-top text-[0.8rem] text-zinc-900 dark:text-zinc-200">
                          {hpfpParamsList.length > 0 ? (
                            <ul className="m-0 list-disc pl-[1.15em] text-left">
                              {hpfpParamsList.map((p) => (
                                <li key={p.id} className="my-0.5 leading-snug">
                                  {p.name}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="min-w-[10rem] max-w-xs px-3 py-2.5 align-top text-[0.8rem] leading-snug text-zinc-500 dark:text-zinc-400">
                          {remarkText}
                        </td>
                        <td className="align-top px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              type="default"
                              className={iconBtn}
                              icon={
                                <svg
                                  className="block h-[18px] w-[18px] shrink-0"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                </svg>
                              }
                              onClick={() => openWorkLogEditModal(entry)}
                              aria-label={`Редактировать заявку: ${clientLabel}`}
                              title="Редактировать"
                            />
                            <Button
                              danger
                              type="default"
                              className={iconBtnDel}
                              icon={
                                <svg
                                  className="block h-[18px] w-[18px] shrink-0"
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              }
                              onClick={() => removeWorkLogEntry(entry.id)}
                              aria-label={`Удалить заявку: ${clientLabel}`}
                              title="Удалить"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <Modal
        open={workLogModalOpen}
        onCancel={closeWorkLogModal}
        title={
          workLogEditingId
            ? "Редактирование карточки"
            : "Новая карточка ремонта"
        }
        width={720}
        zIndex={1000}
        centered
        classNames={{ body: "app-scrollbar" }}
        styles={{
          body: {
            maxHeight: "min(90vh, 880px)",
            overflowY: "auto",
            paddingTop: 12,
            paddingBottom: 12,
          },
          mask: { backdropFilter: "blur(4px)" },
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={closeWorkLogModal}>Отмена</Button>
            <Button type="primary" onClick={submitWorkLogFromModal}>
              {workLogEditingId ? "Сохранить" : "Добавить в журнал"}
            </Button>
          </div>
        }
      >
        <p className={`${modalIntro} mb-0 mt-1`}>
          {workLogEditingId
            ? "Измените поля и нажмите «Сохранить»."
            : "Заполните поля и нажмите «Добавить в журнал» — запись появится в таблице."}
        </p>

        <div className={modalForm}>
          <div className={orgBlock}>
            <div className="min-w-0 flex-1">
              <label htmlFor="worklog-modal-org" className={lb}>
                Населённый пункт
              </label>
              <div className={orgControlsRow}>
                <div className="min-w-[12rem] flex-1">
                  <Select
                    id="worklog-modal-org"
                    className="w-full"
                    value={workLogDraft.orgId}
                    onChange={(v) => setWorkLogDraftField("orgId", v)}
                    options={workLogOrganizations.map((o) => ({
                      value: o.id,
                      label: o.shortName,
                    }))}
                  />
                </div>
                <Button className="shrink-0" onClick={openWorkLogAddOrgModal}>
                  Добавить населённый пункт
                </Button>
              </div>
            </div>
          </div>

          <div className={clientContactGrid}>
            <div className="min-w-0">
              <label htmlFor="worklog-modal-client-last" className={lb}>
                Фамилия клиента{" "}
                <abbr
                  className="no-underline font-bold text-blue-700 dark:text-blue-400"
                  title="обязательно"
                >
                  *
                </abbr>
              </label>
              <Input
                id="worklog-modal-client-last"
                autoComplete="family-name"
                placeholder="Например: Иванов"
                value={workLogDraft.clientLastName}
                onChange={(e) => {
                  setWorkLogDraftField("clientLastName", e.target.value);
                  if (
                    workLogClientLastNameMissing &&
                    e.target.value.trim()
                  ) {
                    setWorkLogClientLastNameMissing(false);
                  }
                }}
                status={workLogClientLastNameMissing ? "error" : undefined}
                aria-invalid={workLogClientLastNameMissing}
                aria-describedby={
                  workLogClientLastNameMissing
                    ? "worklog-client-last-error"
                    : undefined
                }
              />
              {workLogClientLastNameMissing ? (
                <p
                  id="worklog-client-last-error"
                  className={fieldError}
                  role="alert"
                >
                  Укажите фамилию клиента
                </p>
              ) : null}
            </div>

            <div className="min-w-0">
              <label htmlFor="worklog-modal-client-phone" className={lb}>
                Телефон клиента
              </label>
              <Input
                id="worklog-modal-client-phone"
                type="tel"
                autoComplete="tel"
                placeholder="+7 (900) 000-00-00"
                value={workLogDraft.clientPhone}
                onChange={(e) =>
                  setWorkLogDraftField("clientPhone", e.target.value)
                }
                inputMode="tel"
              />
            </div>
          </div>

          <div className={vehicleHpfpRowGrid}>
            <div className="min-w-0">
              <label htmlFor="worklog-modal-transport-type" className={lb}>
                Тип транспорта
              </label>
              <Input
                id="worklog-modal-transport-type"
                placeholder="Например: Mercedes Sprinter 316 CDI · К555МН99"
                value={workLogDraft.transportType}
                onChange={(e) =>
                  setWorkLogDraftField("transportType", e.target.value)
                }
                autoComplete="off"
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="worklog-modal-hpfp-type" className={lb}>
                Тип ТНВД
              </label>
              <Input
                id="worklog-modal-hpfp-type"
                placeholder="Например: Bosch CP3"
                value={workLogDraft.hpfpType}
                onChange={(e) =>
                  setWorkLogDraftField("hpfpType", e.target.value)
                }
                autoComplete="off"
              />
            </div>

            <div className="min-w-0">
              <label htmlFor="worklog-modal-pump-number" className={lb}>
                Номер ТНВД
              </label>
              <Input
                id="worklog-modal-pump-number"
                placeholder="Один номер насоса на эту единицу транспорта"
                value={workLogDraft.pumpNumber}
                onChange={(e) =>
                  setWorkLogDraftField("pumpNumber", e.target.value)
                }
                autoComplete="off"
                aria-describedby="worklog-pump-number-hint"
              />
            </div>
          </div>

          <div className={datesGrid}>
            <div>
              <label htmlFor="worklog-modal-start" className={lb}>
                Дата начала ремонта
              </label>
              <DatePicker
                id="worklog-modal-start"
                className="w-full"
                format="DD.MM.YYYY"
                placeholder="Выберите дату"
                allowClear
                value={parseDraftDate(workLogDraft.startDate)}
                onChange={(d) =>
                  setWorkLogDraftField(
                    "startDate",
                    d ? d.format("YYYY-MM-DD") : "",
                  )
                }
              />
            </div>
            <div>
              <label htmlFor="worklog-modal-end" className={lb}>
                Дата окончания ремонта
              </label>
              <DatePicker
                id="worklog-modal-end"
                className="w-full"
                format="DD.MM.YYYY"
                placeholder="Выберите дату"
                allowClear
                value={parseDraftDate(workLogDraft.endDate)}
                onChange={(d) =>
                  setWorkLogDraftField(
                    "endDate",
                    d ? d.format("YYYY-MM-DD") : "",
                  )
                }
              />
            </div>
          </div>

          <div className={worksPartsGrid}>
            <div>
              <label htmlFor="worklog-modal-works" className={lb}>
                Перечень выполненных работ
              </label>
              <textarea
                id="worklog-modal-works"
                className={ta}
                placeholder="Опишите выполненные работы…"
                value={workLogDraft.completedWorks}
                onChange={(e) =>
                  setWorkLogDraftField("completedWorks", e.target.value)
                }
                rows={5}
              />
            </div>
            <div>
              <span className={lb}>Установленные запчасти</span>
              <ul className="m-0 list-none p-0">
                {(workLogDraft.installedParts ?? []).map((p) => (
                  <li key={p.id} className={partsRow}>
                    <span className="min-w-0 flex-1 text-sm text-zinc-900 dark:text-zinc-100">
                      {p.name}
                    </span>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                      ×{p.qty}
                    </span>
                    <Button
                      type="text"
                      className={partRemove}
                      aria-label={`Удалить запчасть ${p.name}`}
                      onClick={() => removeWorkLogDraftPart(p.id)}
                    >
                      ×
                    </Button>
                  </li>
                ))}
              </ul>
              <div className={addPartRow}>
                <Input
                  className="min-w-[12rem] flex-1"
                  placeholder="Наименование запчасти"
                  value={workLogPartDraft.name}
                  onChange={(e) =>
                    setWorkLogPartDraft((x) => ({
                      ...x,
                      name: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addWorkLogDraftPart();
                    }
                  }}
                  aria-label="Наименование запчасти"
                />
                <InputNumber
                  min={1}
                  className="w-20 shrink-0"
                  title="Количество"
                  controls={false}
                  value={
                    Math.max(1, parseInt(String(workLogPartDraft.qty), 10) || 1)
                  }
                  onChange={(v) =>
                    setWorkLogPartDraft((x) => ({
                      ...x,
                      qty:
                        v != null && v !== ""
                          ? String(Math.max(1, Number(v)))
                          : "1",
                    }))
                  }
                  aria-label="Количество"
                />
                <Button onClick={addWorkLogDraftPart}>Добавить</Button>
              </div>
            </div>
          </div>

          <div>
            <span className={lb}>Параметры ТНВД</span>
            <ul className="m-0 list-none p-0">
              {(workLogDraft.hpfpParameters ?? []).map((p) => (
                <li key={p.id} className={partsRow}>
                  <span className="min-w-0 flex-1 text-sm text-zinc-900 dark:text-zinc-100">
                    {p.name}
                  </span>
                  <Button
                    type="text"
                    className={partRemove}
                    aria-label={`Удалить параметр ${p.name}`}
                    onClick={() => removeWorkLogDraftHpfpParam(p.id)}
                  >
                    ×
                  </Button>
                </li>
              ))}
            </ul>
            <div className={`${addPartRow} mt-1`}>
              <Input
                id="worklog-modal-hpfp-param"
                className="min-w-[14rem] flex-1"
                placeholder="Например: давление на обратке 4 бар"
                value={workLogHpfpParamDraft.name}
                onChange={(e) =>
                  setWorkLogHpfpParamDraft((x) => ({
                    ...x,
                    name: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addWorkLogDraftHpfpParam();
                  }
                }}
                aria-label="Текст параметра ТНВД"
              />
              <Button onClick={addWorkLogDraftHpfpParam}>Добавить</Button>
            </div>
          </div>

          <div>
            <label htmlFor="worklog-modal-remark" className={lb}>
              Примечание
            </label>
            <textarea
              id="worklog-modal-remark"
              className={`${inText} min-h-[4.5rem]`}
              placeholder="Дополнительные пометки, сроки, согласования…"
              value={workLogDraft.remark}
              onChange={(e) =>
                setWorkLogDraftField("remark", e.target.value)
              }
              rows={3}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={workLogAddOrgModalOpen}
        onCancel={closeWorkLogAddOrgModal}
        title="Новый населённый пункт"
        width={440}
        zIndex={1100}
        centered
        classNames={{ body: "app-scrollbar" }}
        styles={{
          body: {
            paddingTop: 8,
            paddingBottom: 8,
          },
          mask: { backdropFilter: "blur(4px)" },
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={closeWorkLogAddOrgModal}>Отмена</Button>
            <Button
              type="primary"
              onClick={submitWorkLogNewOrg}
              disabled={!workLogNewOrg.shortName.trim()}
            >
              Добавить и выбрать
            </Button>
          </div>
        }
      >
        <p className={`${modalIntro} mb-4 sm:mb-[1.1rem]`}>
          Введите название населённого пункта — он сразу будет выбран в
          карточке журнала.
        </p>
        <div>
          <label htmlFor="worklog-new-org-name" className={lb}>
            Название населённого пункта
          </label>
          <Input
            id="worklog-new-org-name"
            placeholder="Например: Савоськин"
            value={workLogNewOrg.shortName}
            onChange={(e) =>
              setWorkLogNewOrg((x) => ({
                ...x,
                shortName: e.target.value,
              }))
            }
            autoComplete="organization"
          />
        </div>
      </Modal>
    </div>
  );
}
