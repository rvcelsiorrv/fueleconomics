import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadRepairWorkLogState,
  saveRepairWorkLogState,
} from "../lib/repairWorkLogStorage";
import "../App.css";

function makeRepairWorkLogId() {
  return `rwl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function phoneToTelHref(phone) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  return `tel:+${digits}`;
}

function formatDateRu(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
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

function normalizeLoadedOrganization(raw, index) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? "").trim();
  if (!id) return null;
  let number = parseInt(String(raw.number), 10);
  if (!Number.isFinite(number) || number < 1) number = index + 1;
  return {
    id,
    number,
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
    .map((o, i) => normalizeLoadedOrganization(o, i))
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
  const [workLogNewOrg, setWorkLogNewOrg] = useState({
    shortName: "",
    phone: "",
  });
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
    if (!workLogModalOpen && !workLogAddOrgModalOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (workLogAddOrgModalOpen) {
        setWorkLogAddOrgModalOpen(false);
      } else {
        setWorkLogModalOpen(false);
        setWorkLogEditingId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [workLogModalOpen, workLogAddOrgModalOpen]);

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
    () => [...workLogOrgStats].sort((a, b) => a.number - b.number),
    [workLogOrgStats],
  );

  const workLogEntriesForSelectedSettlement = useMemo(() => {
    if (!selectedWorkLogSettlementId) return [];
    return workLogEntries.filter(
      (e) => e.orgId === selectedWorkLogSettlementId,
    );
  }, [workLogEntries, selectedWorkLogSettlementId]);

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
    setWorkLogNewOrg({ shortName: "", phone: "" });
    setWorkLogClientLastNameMissing(false);
  };

  const openWorkLogAddOrgModal = () => {
    setWorkLogNewOrg({ shortName: "", phone: "" });
    setWorkLogAddOrgModalOpen(true);
  };

  const closeWorkLogAddOrgModal = () => {
    setWorkLogAddOrgModalOpen(false);
    setWorkLogNewOrg({ shortName: "", phone: "" });
  };

  const submitWorkLogNewOrg = () => {
    const shortName = workLogNewOrg.shortName.trim();
    const phone = workLogNewOrg.phone.trim();
    if (!shortName || !phone) return;
    const nextNum =
      workLogOrganizations.length === 0
        ? 1
        : Math.max(...workLogOrganizations.map((o) => o.number)) + 1;
    const newOrg = {
      id: `rw-org-${Date.now()}`,
      number: nextNum,
      shortName,
      phone,
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

  const workLogModalOrg = workLogOrgById[workLogDraft.orgId];
  const workLogModalTel = workLogModalOrg
    ? phoneToTelHref(workLogModalOrg.phone)
    : undefined;

  return (
    <div className="fuel-page">
      <header className="fuel-page__intro">
        <p className="fuel-page__eyebrow">Автопарк · учёт</p>
        <h1 className="fuel-page__title">
          Топливные системы, расход и&nbsp;ТНВД
        </h1>
        <p className="fuel-page__lead">
          Журнал ремонта топливных систем по населённым пунктам. Данные
          сохраняются в браузере (localStorage) на этом устройстве.
        </p>
      </header>

      <section className="hpfp-orgs-section" aria-labelledby="hpfp-orgs-title">
        <h2 id="hpfp-orgs-title" className="fuel-section-title">
          Учёт по населённым пунктам
        </h2>
        <p className="fuel-section-desc">
          Населённые пункты из журнала: число заявок и уникальных номеров ТНВД.
          Нажмите карточку — ниже появится журнал ремонта по этому пункту;
          повторный клик по&nbsp;той же карточке снимает выбор и скрывает
          журнал.
        </p>
        <div className="hpfp-org-cards">
          {workLogOrgStatsSorted.length === 0 ? (
            <div className="repair-worklog-empty repair-worklog-empty--orgs">
              <p>
                Пока нет населённых пунктов. Добавьте первый — он появится в
                списке, и вы сможете открыть журнал ремонта по этому пункту.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                onClick={openWorkLogAddOrgModal}
              >
                Добавить населённый пункт
              </button>
            </div>
          ) : (
            workLogOrgStatsSorted.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`hpfp-org-card hpfp-org-card--filter${
                  selectedWorkLogSettlementId === o.id
                    ? " hpfp-org-card--filter-active"
                    : ""
                }`}
                aria-pressed={selectedWorkLogSettlementId === o.id}
                onClick={() => selectWorkLogSettlement(o.id)}
              >
                <h3 className="hpfp-org-card__name">
                  №{o.number} — {o.shortName}
                </h3>
                <p className="hpfp-org-card__inn">Тел. {o.phone}</p>
                <dl className="hpfp-org-card__stats">
                  <div>
                    <dt>Заявок</dt>
                    <dd>{o.applicationsCount}</dd>
                  </div>
                  <div>
                    <dt>Номеров&nbsp;ТНВД</dt>
                    <dd>{o.uniquePumpNumbersCount}</dd>
                  </div>
                </dl>
              </button>
            ))
          )}
        </div>
      </section>

      {selectedWorkLogSettlementId && selectedWorkLogSettlement ? (
        <section
          className="repair-worklog-section"
          aria-labelledby="repair-worklog-title"
        >
          <h2 id="repair-worklog-title" className="fuel-section-title">
            Журнал ремонта топливных систем
          </h2>
          <p className="fuel-section-desc">
            Заявки по выбранному населённому пункту. Добавление и изменение
            карточки — в модальном окне (кнопки «Добавить карточку» и
            «Редактировать» в таблице). У каждой единицы транспорта в карточке
            указывается один ТНВД и один его номер. Чтобы скрыть журнал, нажмите
            ту же карточку пункта в&nbsp;блоке «Учёт по населённым пунктам» ещё
            раз.
          </p>
          <div className="repair-worklog-toolbar repair-worklog-toolbar--filter">
            <button
              type="button"
              className="btn btn--primary"
              onClick={openWorkLogModal}
            >
              Добавить карточку
            </button>
            <p className="repair-worklog-toolbar__filter-hint" role="status">
              Журнал:{" "}
              <strong>
                №{selectedWorkLogSettlement.number} —{" "}
                {selectedWorkLogSettlement.shortName}
              </strong>
            </p>
          </div>

          <div className="repair-worklog-table-wrap">
            <table className="repair-worklog-table">
              <thead>
                <tr>
                  <th scope="col">П/п</th>
                  <th scope="col">Клиент (фамилия)</th>
                  <th scope="col">Телефон</th>
                  <th scope="col">Тип транспорта</th>
                  <th scope="col">Тип ТНВД</th>
                  <th scope="col">Номер ТНВД</th>
                  <th scope="col">Начало</th>
                  <th scope="col">Окончание</th>
                  <th scope="col">Выполненные работы</th>
                  <th scope="col">Установленные запчасти</th>
                  <th scope="col">Параметры ТНВД</th>
                  <th scope="col">Примечание</th>
                  <th scope="col">
                    <span className="visually-hidden">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {workLogEntriesForSelectedSettlement.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="repair-worklog-table__empty-filter"
                    >
                      По этому населённому пункту заявок пока нет. Нажмите
                      «Добавить карточку».
                    </td>
                  </tr>
                ) : (
                  workLogEntriesForSelectedSettlement.map((entry, index) => {
                    const org = workLogOrgById[entry.orgId];
                    const tel = org ? phoneToTelHref(org.phone) : undefined;
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
                    return (
                      <tr key={entry.id}>
                        <td>{index + 1}</td>
                        <td className="repair-worklog-table__org repair-worklog-table__client-name">
                          {clientLabel}
                        </td>
                        <td>
                          {org && tel ? (
                            <a href={tel}>{org.phone}</a>
                          ) : (
                            (org?.phone ?? "—")
                          )}
                        </td>
                        <td className="repair-worklog-table__fuel-system">
                          {transportText}
                        </td>
                        <td className="repair-worklog-table__hpfp-type">
                          {hpfpTypeText}
                        </td>
                        <td className="repair-worklog-table__pump-numbers">
                          {pumpNumberText}
                        </td>
                        <td className="repair-worklog-table__date">
                          {formatDateRu(entry.startDate)}
                        </td>
                        <td className="repair-worklog-table__date">
                          {formatDateRu(entry.endDate)}
                        </td>
                        <td className="repair-worklog-table__works">
                          {works}
                        </td>
                        <td className="repair-worklog-table__parts">
                          {partsList.length > 0 ? (
                            <ul className="repair-worklog-table__cell-list">
                              {partsList.map((p) => (
                                <li key={p.id}>
                                  {p.name}
                                  <span className="repair-worklog-table__cell-qty">
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
                        <td className="repair-worklog-table__hpfp-params">
                          {hpfpParamsList.length > 0 ? (
                            <ul className="repair-worklog-table__cell-list">
                              {hpfpParamsList.map((p) => (
                                <li key={p.id}>{p.name}</li>
                              ))}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="repair-worklog-table__remark">
                          {remarkText}
                        </td>
                        <td className="repair-worklog-table__actions">
                          <button
                            type="button"
                            className="repair-worklog-table__icon-btn repair-worklog-table__icon-btn--edit"
                            onClick={() => openWorkLogEditModal(entry)}
                            aria-label={`Редактировать заявку: ${clientLabel}`}
                            title="Редактировать"
                          >
                            <svg
                              className="repair-worklog-table__icon"
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
                          </button>
                          <button
                            type="button"
                            className="repair-worklog-table__icon-btn repair-worklog-table__icon-btn--delete"
                            onClick={() => removeWorkLogEntry(entry.id)}
                            aria-label={`Удалить заявку: ${clientLabel}`}
                            title="Удалить"
                          >
                            <svg
                              className="repair-worklog-table__icon"
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
                          </button>
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

      <footer className="fuel-page__footer">
        <p>
          Данные хранятся только в этом браузере. Очистка сайта или режим
          инкогнито могут их удалить; для облачной синхронизации нужен отдельный
          бэкенд.
        </p>
      </footer>

      {workLogModalOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={closeWorkLogModal}
        >
            <div
              className="modal-dialog modal-dialog--worklog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="worklog-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="modal-close"
                aria-label="Закрыть"
                onClick={closeWorkLogModal}
              />
              <h2 id="worklog-modal-title" className="modal-dialog__title">
                {workLogEditingId
                  ? "Редактирование карточки"
                  : "Новая карточка ремонта"}
              </h2>
              <p className="modal-dialog__desc repair-worklog-modal__intro">
                {workLogEditingId
                  ? "Измените поля и нажмите «Сохранить»."
                  : "Заполните поля и нажмите «Добавить в журнал» — запись появится в таблице."}
              </p>

              <div className="repair-worklog-card__head repair-worklog-modal__head repair-worklog-modal__org-row">
                <div className="repair-worklog-card__org-field repair-worklog-modal__org-select-wrap">
                  <label
                    htmlFor="worklog-modal-org"
                    className="repair-worklog-card__org-label"
                  >
                    Населённый пункт
                  </label>
                  <div className="repair-worklog-modal__org-controls">
                    <select
                      id="worklog-modal-org"
                      className="repair-worklog-card__select"
                      value={workLogDraft.orgId}
                      onChange={(e) =>
                        setWorkLogDraftField("orgId", e.target.value)
                      }
                    >
                      {workLogOrganizations.map((o) => (
                        <option key={o.id} value={o.id}>
                          №{o.number} — {o.shortName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn--secondary repair-worklog-modal__add-org-btn"
                      onClick={openWorkLogAddOrgModal}
                    >
                      Добавить населённый пункт
                    </button>
                  </div>
                </div>
                <div className="repair-worklog-card__phone">
                  <span className="repair-worklog-card__phone-label">
                    Телефон
                  </span>
                  <span className="repair-worklog-card__phone-value">
                    {workLogModalOrg && workLogModalTel ? (
                      <a href={workLogModalTel}>{workLogModalOrg.phone}</a>
                    ) : (
                      (workLogModalOrg?.phone ?? "—")
                    )}
                  </span>
                </div>
              </div>

              <div className="repair-worklog-modal__client-field">
                <label
                  htmlFor="worklog-modal-client-last"
                  className="repair-worklog-card__field-label"
                >
                  Фамилия клиента{" "}
                  <abbr
                    className="repair-worklog-modal__req"
                    title="обязательно"
                  >
                    *
                  </abbr>
                </label>
                <input
                  id="worklog-modal-client-last"
                  type="text"
                  className="repair-worklog-card__input"
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
                    className="repair-worklog-modal__field-error"
                    role="alert"
                  >
                    Укажите фамилию клиента
                  </p>
                ) : null}
              </div>

              <p className="repair-worklog-card__fuel-line">
                <strong>Техника:</strong> населённый пункт №{" "}
                {workLogModalOrg?.number ?? "—"}{" "}
                {`(${workLogModalOrg?.shortName ?? "—"})`} — у каждого транспорта
                один ТНВД: укажите тип транспорта, тип ТНВД и единственный номер
                насоса.
              </p>

              <div>
                <label
                  htmlFor="worklog-modal-transport-type"
                  className="repair-worklog-card__field-label"
                >
                  Тип транспорта
                </label>
                <input
                  id="worklog-modal-transport-type"
                  type="text"
                  className="repair-worklog-card__input"
                  placeholder="Например: Mercedes Sprinter 316 CDI · К555МН99"
                  value={workLogDraft.transportType}
                  onChange={(e) =>
                    setWorkLogDraftField("transportType", e.target.value)
                  }
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor="worklog-modal-hpfp-type"
                  className="repair-worklog-card__field-label"
                >
                  Тип ТНВД
                </label>
                <input
                  id="worklog-modal-hpfp-type"
                  type="text"
                  className="repair-worklog-card__input"
                  placeholder="Например: Bosch CP3"
                  value={workLogDraft.hpfpType}
                  onChange={(e) =>
                    setWorkLogDraftField("hpfpType", e.target.value)
                  }
                  autoComplete="off"
                />
              </div>

              <div className="repair-worklog-modal__pump-numbers">
                <label
                  htmlFor="worklog-modal-pump-number"
                  className="repair-worklog-card__field-label"
                >
                  Номер ТНВД
                </label>
                <input
                  id="worklog-modal-pump-number"
                  type="text"
                  className="repair-worklog-card__input"
                  placeholder="Один номер насоса на эту единицу транспорта"
                  value={workLogDraft.pumpNumber}
                  onChange={(e) =>
                    setWorkLogDraftField("pumpNumber", e.target.value)
                  }
                  autoComplete="off"
                  aria-describedby="worklog-pump-number-hint"
                />
                <p
                  id="worklog-pump-number-hint"
                  className="repair-worklog-modal__field-hint"
                >
                  У одного транспорта может быть только один ТНВД — укажите один
                  номер.
                </p>
              </div>

              <div className="repair-worklog-card__dates">
                <div>
                  <label
                    htmlFor="worklog-modal-start"
                    className="repair-worklog-card__field-label"
                  >
                    Дата начала ремонта
                  </label>
                  <input
                    id="worklog-modal-start"
                    type="date"
                    className="repair-worklog-card__date-input"
                    value={workLogDraft.startDate}
                    onChange={(e) =>
                      setWorkLogDraftField("startDate", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="worklog-modal-end"
                    className="repair-worklog-card__field-label"
                  >
                    Дата окончания ремонта
                  </label>
                  <input
                    id="worklog-modal-end"
                    type="date"
                    className="repair-worklog-card__date-input"
                    value={workLogDraft.endDate}
                    onChange={(e) =>
                      setWorkLogDraftField("endDate", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="repair-worklog-modal__works-parts">
                <div className="repair-worklog-card__works">
                  <label
                    htmlFor="worklog-modal-works"
                    className="repair-worklog-card__field-label"
                  >
                    Перечень выполненных работ
                  </label>
                  <textarea
                    id="worklog-modal-works"
                    className="repair-worklog-card__textarea"
                    placeholder="Опишите выполненные работы…"
                    value={workLogDraft.completedWorks}
                    onChange={(e) =>
                      setWorkLogDraftField("completedWorks", e.target.value)
                    }
                    rows={5}
                  />
                </div>
                <div className="repair-worklog-modal__parts-block">
                  <span className="repair-worklog-card__field-label">
                    Установленные запчасти
                  </span>
                  <ul className="repair-worklog-modal__parts-list">
                    {(workLogDraft.installedParts ?? []).map((p) => (
                      <li
                        key={p.id}
                        className="repair-worklog-modal__parts-item"
                      >
                        <span className="repair-worklog-modal__parts-name">
                          {p.name}
                        </span>
                        <span className="repair-worklog-modal__parts-qty">
                          ×{p.qty}
                        </span>
                        <button
                          type="button"
                          className="hpfp-number-remove"
                          aria-label={`Удалить запчасть ${p.name}`}
                          onClick={() => removeWorkLogDraftPart(p.id)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="repair-worklog-modal__add-part">
                    <input
                      type="text"
                      className="repair-worklog-card__input"
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
                    <input
                      type="number"
                      min={1}
                      className="repair-worklog-card__input repair-worklog-modal__part-qty"
                      title="Количество"
                      value={workLogPartDraft.qty}
                      onChange={(e) =>
                        setWorkLogPartDraft((x) => ({
                          ...x,
                          qty: e.target.value,
                        }))
                      }
                      aria-label="Количество"
                    />
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={addWorkLogDraftPart}
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              </div>

              <div className="repair-worklog-modal__parts-block">
                <span className="repair-worklog-card__field-label">
                  Параметры ТНВД
                </span>
                <ul className="repair-worklog-modal__parts-list">
                  {(workLogDraft.hpfpParameters ?? []).map((p) => (
                    <li
                      key={p.id}
                      className="repair-worklog-modal__parts-item repair-worklog-modal__parts-item--param"
                    >
                      <span className="repair-worklog-modal__parts-name">
                        {p.name}
                      </span>
                      <button
                        type="button"
                        className="hpfp-number-remove"
                        aria-label={`Удалить параметр ${p.name}`}
                        onClick={() => removeWorkLogDraftHpfpParam(p.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="repair-worklog-modal__add-part repair-worklog-modal__add-part--param">
                  <input
                    type="text"
                    id="worklog-modal-hpfp-param"
                    className="repair-worklog-card__input"
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
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={addWorkLogDraftHpfpParam}
                  >
                    Добавить
                  </button>
                </div>
              </div>

              <div className="repair-worklog-card__works repair-worklog-modal__remark">
                <label
                  htmlFor="worklog-modal-remark"
                  className="repair-worklog-card__field-label"
                >
                  Примечание
                </label>
                <textarea
                  id="worklog-modal-remark"
                  className="repair-worklog-card__textarea repair-worklog-card__textarea--remark"
                  placeholder="Дополнительные пометки, сроки, согласования…"
                  value={workLogDraft.remark}
                  onChange={(e) =>
                    setWorkLogDraftField("remark", e.target.value)
                  }
                  rows={3}
                />
              </div>

              <div className="repair-worklog-modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={closeWorkLogModal}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={submitWorkLogFromModal}
                >
                  {workLogEditingId ? "Сохранить" : "Добавить в журнал"}
                </button>
              </div>
            </div>
          </div>
      ) : null}

      {workLogAddOrgModalOpen ? (
        <div
          className="modal-backdrop modal-backdrop--worklog-org"
          role="presentation"
          onClick={closeWorkLogAddOrgModal}
        >
          <div
            className="modal-dialog modal-dialog--worklog-org"
            role="dialog"
            aria-modal="true"
            aria-labelledby="worklog-add-org-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Закрыть"
              onClick={closeWorkLogAddOrgModal}
            />
            <h2 id="worklog-add-org-title" className="modal-dialog__title">
              Новый населённый пункт
            </h2>
            <p className="modal-dialog__desc repair-worklog-modal__intro">
              Укажите название населённого пункта и&nbsp;номер телефона для
              контакта. Пункт получит следующий порядковый номер и&nbsp;сразу
              будет выбран в карточке.
            </p>
            <div>
              <label
                htmlFor="worklog-new-org-name"
                className="repair-worklog-card__field-label"
              >
                Название населённого пункта
              </label>
              <input
                id="worklog-new-org-name"
                type="text"
                className="repair-worklog-card__input"
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
            <div className="repair-worklog-modal__new-org-phone">
              <label
                htmlFor="worklog-new-org-phone"
                className="repair-worklog-card__field-label"
              >
                Телефон
              </label>
              <input
                id="worklog-new-org-phone"
                type="tel"
                className="repair-worklog-card__input"
                placeholder="+7 (900) 000-00-00"
                value={workLogNewOrg.phone}
                onChange={(e) =>
                  setWorkLogNewOrg((x) => ({
                    ...x,
                    phone: e.target.value,
                  }))
                }
                autoComplete="tel"
              />
            </div>
            <div className="repair-worklog-modal-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={closeWorkLogAddOrgModal}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={submitWorkLogNewOrg}
                disabled={
                  !workLogNewOrg.shortName.trim() ||
                  !workLogNewOrg.phone.trim()
                }
              >
                Добавить и выбрать
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
