import { useEffect, useMemo, useState } from "react";
import { fuelVehicles } from "../data/mockFuelFleet";
import {
  hpfpOrganizations,
  hpfpRepairsInitial,
  hpfpStatusLabels,
} from "../data/mockHpfpRepairs";
import {
  repairWorkLogInitialEntries,
  repairWorkLogOrganizations,
} from "../data/mockRepairWorkLog";
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

function makeEmptyWorkLogDraft(orgId) {
  return {
    orgId,
    clientLastName: "",
    transportHpfp: "",
    startDate: "",
    endDate: "",
    completedWorks: "",
    hpfpParameters: "",
    remark: "",
    installedParts: [],
    pumpNumbers: [],
  };
}

function formatMoney(n) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNum(n) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
  }).format(n);
}

export default function FuelSystemsPage() {
  const [hpfpRepairs, setHpfpRepairs] = useState(() =>
    hpfpRepairsInitial.map((r) => ({
      ...r,
      numbers: [...r.numbers],
      installedParts: (r.installedParts ?? []).map((p) => ({ ...p })),
    })),
  );
  const [hpfpInputs, setHpfpInputs] = useState({});
  const [partDrafts, setPartDrafts] = useState({});
  const [orgFilter, setOrgFilter] = useState("all");

  const [workLogOrganizations, setWorkLogOrganizations] = useState(() =>
    repairWorkLogOrganizations.map((o) => ({ ...o })),
  );

  const workLogOrgById = useMemo(
    () => Object.fromEntries(workLogOrganizations.map((o) => [o.id, o])),
    [workLogOrganizations],
  );

  const [workLogEntries, setWorkLogEntries] = useState(() =>
    repairWorkLogInitialEntries.map((e) => ({
      ...e,
      clientLastName: e.clientLastName ?? "",
      hpfpParameters: e.hpfpParameters ?? "",
      remark: e.remark ?? "",
      installedParts: (e.installedParts ?? []).map((p) => ({ ...p })),
      pumpNumbers: [...(e.pumpNumbers ?? [])],
    })),
  );

  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogAddOrgModalOpen, setWorkLogAddOrgModalOpen] = useState(false);
  const [workLogNewOrg, setWorkLogNewOrg] = useState({
    shortName: "",
    phone: "",
  });
  const [workLogEditingId, setWorkLogEditingId] = useState(null);
  const [workLogDraft, setWorkLogDraft] = useState(() =>
    makeEmptyWorkLogDraft(repairWorkLogOrganizations[0]?.id ?? ""),
  );
  const [workLogPartDraft, setWorkLogPartDraft] = useState({
    name: "",
    qty: "1",
  });
  const [workLogPumpInput, setWorkLogPumpInput] = useState("");
  const [workLogClientLastNameMissing, setWorkLogClientLastNameMissing] =
    useState(false);
  const [selectedWorkLogSettlementId, setSelectedWorkLogSettlementId] =
    useState(null);

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
    if (!workLogModalOpen) return;
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

  const orgById = useMemo(
    () => Object.fromEntries(hpfpOrganizations.map((o) => [o.id, o])),
    [],
  );

  const repairsFiltered = useMemo(() => {
    if (orgFilter === "all") return hpfpRepairs;
    return hpfpRepairs.filter((r) => r.orgId === orgFilter);
  }, [hpfpRepairs, orgFilter]);

  const workLogOrgStats = useMemo(() => {
    return workLogOrganizations.map((o) => {
      const uniquePump = new Set();
      let applicationsCount = 0;
      for (const e of workLogEntries) {
        if (e.orgId !== o.id) continue;
        applicationsCount += 1;
        for (const n of e.pumpNumbers ?? []) {
          const t = String(n).trim();
          if (t) uniquePump.add(t);
        }
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

  const setInput = (repairId, value) => {
    setHpfpInputs((prev) => ({ ...prev, [repairId]: value }));
  };

  const addHpfpNumber = (repairId) => {
    const raw = (hpfpInputs[repairId] ?? "").trim();
    if (!raw) return;
    setHpfpRepairs((rows) =>
      rows.map((r) =>
        r.id === repairId ? { ...r, numbers: [...r.numbers, raw] } : r,
      ),
    );
    setHpfpInputs((prev) => ({ ...prev, [repairId]: "" }));
  };

  const removeHpfpNumber = (repairId, index) => {
    setHpfpRepairs((rows) =>
      rows.map((r) =>
        r.id === repairId
          ? { ...r, numbers: r.numbers.filter((_, i) => i !== index) }
          : r,
      ),
    );
  };

  const partDraft = (repairId) =>
    partDrafts[repairId] ?? { name: "", qty: "1" };

  const setPartDraftField = (repairId, field, value) => {
    setPartDrafts((d) => {
      const cur = d[repairId] ?? { name: "", qty: "1" };
      return { ...d, [repairId]: { ...cur, [field]: value } };
    });
  };

  const addInstalledPart = (repairId) => {
    const { name: rawName, qty: rawQty } = partDraft(repairId);
    const name = rawName.trim();
    if (!name) return;
    const qty = Math.max(1, parseInt(String(rawQty), 10) || 1);
    const id = `pt-${repairId}-${Date.now()}`;
    setHpfpRepairs((rows) =>
      rows.map((r) =>
        r.id === repairId
          ? { ...r, installedParts: [...r.installedParts, { id, name, qty }] }
          : r,
      ),
    );
    setPartDrafts((d) => ({
      ...d,
      [repairId]: { name: "", qty: "1" },
    }));
  };

  const removeInstalledPart = (repairId, partId) => {
    setHpfpRepairs((rows) =>
      rows.map((r) =>
        r.id === repairId
          ? {
              ...r,
              installedParts: r.installedParts.filter((p) => p.id !== partId),
            }
          : r,
      ),
    );
  };

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
    setWorkLogPumpInput("");
    setWorkLogClientLastNameMissing(false);
    setWorkLogModalOpen(true);
  };

  const openWorkLogEditModal = (entry) => {
    setWorkLogEditingId(entry.id);
    setWorkLogAddOrgModalOpen(false);
    setWorkLogDraft({
      orgId: entry.orgId,
      clientLastName: entry.clientLastName ?? "",
      transportHpfp: entry.transportHpfp,
      startDate: entry.startDate,
      endDate: entry.endDate,
      completedWorks: entry.completedWorks,
      hpfpParameters: entry.hpfpParameters ?? "",
      remark: entry.remark ?? "",
      installedParts: (entry.installedParts ?? []).map((p) => ({ ...p })),
      pumpNumbers: [...(entry.pumpNumbers ?? [])],
    });
    setWorkLogPartDraft({ name: "", qty: "1" });
    setWorkLogPumpInput("");
    setWorkLogClientLastNameMissing(false);
    setWorkLogModalOpen(true);
  };

  const closeWorkLogModal = () => {
    setWorkLogModalOpen(false);
    setWorkLogEditingId(null);
    setWorkLogAddOrgModalOpen(false);
    setWorkLogNewOrg({ shortName: "", phone: "" });
    setWorkLogPumpInput("");
    setWorkLogClientLastNameMissing(false);
  };

  const addWorkLogDraftPumpNumber = () => {
    const raw = workLogPumpInput.trim();
    if (!raw) return;
    setWorkLogDraft((d) => ({
      ...d,
      pumpNumbers: [...(d.pumpNumbers ?? []), raw],
    }));
    setWorkLogPumpInput("");
  };

  const removeWorkLogDraftPumpNumber = (index) => {
    setWorkLogDraft((d) => ({
      ...d,
      pumpNumbers: (d.pumpNumbers ?? []).filter((_, i) => i !== index),
    }));
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

  const setWorkLogDraftField = (field, value) => {
    setWorkLogDraft((d) => ({ ...d, [field]: value }));
  };

  const submitWorkLogFromModal = () => {
    if (!workLogDraft.clientLastName.trim()) {
      setWorkLogClientLastNameMissing(true);
      return;
    }
    setWorkLogClientLastNameMissing(false);
    if (workLogEditingId) {
      setWorkLogEntries((rows) =>
        rows.map((r) =>
          r.id === workLogEditingId ? { ...r, ...workLogDraft } : r,
        ),
      );
    } else {
      setWorkLogEntries((rows) => [
        ...rows,
        {
          id: makeRepairWorkLogId(),
          ...workLogDraft,
        },
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
          Учёт заявок на&nbsp;ремонт ТНВД по&nbsp;организациям, журнал работ,
          карточки контрагентов и&nbsp;таблица автопарка (демо-данные).
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
          {workLogOrgStatsSorted.map((o) => (
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
          ))}
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
            Заявки по выбранному населённому пункту. Чтобы закрыть журнал,
            нажмите ту же карточку пункта в&nbsp;блоке «Учёт по населённым
            пунктам» ещё раз.
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
                  <th scope="col">Топливная система</th>
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
                      colSpan={11}
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
                    const fuelSystemOnly =
                      entry.transportHpfp.trim() || "—";
                    const works = entry.completedWorks.trim() || "—";
                    const hpfpParamsText =
                      (entry.hpfpParameters ?? "").trim() || "—";
                    const remarkText =
                      (entry.remark ?? "").trim() || "—";
                    const partsText =
                      entry.installedParts?.length > 0
                        ? entry.installedParts
                            .map((p) => `${p.name} ×${p.qty}`)
                            .join("; ")
                        : "—";
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
                          {fuelSystemOnly}
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
                          {partsText}
                        </td>
                        <td className="repair-worklog-table__hpfp-params">
                          {hpfpParamsText}
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

      <section className="hpfp-section" aria-labelledby="hpfp-repair-title">
        <h2 id="hpfp-repair-title" className="fuel-section-title">
          Ремонт ТНВД: заявки, номера и&nbsp;установленные запчасти
        </h2>
        <p className="fuel-section-desc">
          К&nbsp;каждой заявке добавляйте номера насосов и&nbsp;перечень
          запчастей, фактически установленных при ремонте (наименование
          и&nbsp;количество).
        </p>

        <div className="hpfp-toolbar">
          <label htmlFor="hpfp-org-filter" className="hpfp-toolbar__label">
            Организация
          </label>
          <select
            id="hpfp-org-filter"
            className="hpfp-select"
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
          >
            <option value="all">Все организации</option>
            {hpfpOrganizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.shortName}
              </option>
            ))}
          </select>
        </div>

        <div className="hpfp-table-wrap">
          <table className="hpfp-table">
            <thead>
              <tr>
                <th scope="col">Организация</th>
                <th scope="col">Объект / техника</th>
                <th scope="col">Тип ТНВД</th>
                <th scope="col">Статус</th>
                <th scope="col">Принят</th>
                <th scope="col">Сумма (оценка)</th>
                <th scope="col">Номера ТНВД (по порядку)</th>
                <th scope="col">Запчасти при ремонте</th>
              </tr>
            </thead>
            <tbody>
              {repairsFiltered.map((r) => {
                const org = orgById[r.orgId];
                return (
                  <tr key={r.id}>
                    <td className="hpfp-table__org">
                      <span className="hpfp-table__org-short">
                        {org?.shortName ?? r.orgId}
                      </span>
                      <span className="hpfp-table__org-inn">
                        ИНН {org?.inn}
                      </span>
                    </td>
                    <td className="hpfp-table__asset">{r.assetLabel}</td>
                    <td>{r.pumpType}</td>
                    <td>
                      <span className={`hpfp-status hpfp-status--${r.status}`}>
                        {hpfpStatusLabels[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="hpfp-table__nowrap">{r.openedAt}</td>
                    <td>
                      {r.estimateRub != null ? formatMoney(r.estimateRub) : "—"}
                    </td>
                    <td className="hpfp-table__numbers-cell">
                      <ol className="hpfp-number-list">
                        {r.numbers.map((num, idx) => (
                          <li
                            key={`${r.id}-${idx}-${num}`}
                            className="hpfp-number-list__item"
                          >
                            <span className="hpfp-number-list__value">
                              {num}
                            </span>
                            <button
                              type="button"
                              className="hpfp-number-remove"
                              aria-label={`Удалить номер ${num}`}
                              onClick={() => removeHpfpNumber(r.id, idx)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ol>
                      <div className="hpfp-add-number">
                        <input
                          type="text"
                          className="hpfp-add-number__input"
                          placeholder="Номер насоса"
                          value={hpfpInputs[r.id] ?? ""}
                          onChange={(e) => setInput(r.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addHpfpNumber(r.id);
                            }
                          }}
                          aria-label={`Добавить номер ТНВД, заявка ${r.assetLabel}`}
                        />
                        <button
                          type="button"
                          className="btn btn--secondary hpfp-add-number__btn"
                          onClick={() => addHpfpNumber(r.id)}
                        >
                          Добавить номер
                        </button>
                      </div>
                    </td>
                    <td className="hpfp-table__parts-cell">
                      <ul className="hpfp-parts-list">
                        {r.installedParts.map((p) => (
                          <li key={p.id} className="hpfp-parts-list__item">
                            <span className="hpfp-parts-list__name">
                              {p.name}
                            </span>
                            <span className="hpfp-parts-list__qty">
                              ×{p.qty}
                            </span>
                            <button
                              type="button"
                              className="hpfp-number-remove"
                              aria-label={`Удалить запчасть ${p.name}`}
                              onClick={() => removeInstalledPart(r.id, p.id)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="hpfp-add-part">
                        <input
                          type="text"
                          className="hpfp-add-part__name"
                          placeholder="Наименование запчасти"
                          value={partDraft(r.id).name}
                          onChange={(e) =>
                            setPartDraftField(r.id, "name", e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addInstalledPart(r.id);
                            }
                          }}
                          aria-label={`Наименование запчасти, ${r.assetLabel}`}
                        />
                        <input
                          type="number"
                          min={1}
                          className="hpfp-add-part__qty"
                          title="Количество"
                          value={partDraft(r.id).qty}
                          onChange={(e) =>
                            setPartDraftField(r.id, "qty", e.target.value)
                          }
                          aria-label="Количество"
                        />
                        <button
                          type="button"
                          className="btn btn--secondary hpfp-add-part__btn"
                          onClick={() => addInstalledPart(r.id)}
                        >
                          Добавить
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="fuel-page__footer">
        <p>
          Все данные на странице демонстрационные. Для работы в продакшене
          подключите API телематики или учётную систему автопарка.
        </p>
      </footer>

      {workLogModalOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            if (workLogAddOrgModalOpen) closeWorkLogAddOrgModal();
            else closeWorkLogModal();
          }}
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
                ? "Измените поля и&nbsp;нажмите «Сохранить»."
                : "Заполните поля и&nbsp;нажмите «Добавить в журнал» — запись появится в таблице."}
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
                <abbr className="repair-worklog-modal__req" title="обязательно">
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
                  if (workLogClientLastNameMissing && e.target.value.trim()) {
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
              <strong>Топливная система:</strong> населённый пункт № &nbsp;
              {workLogModalOrg?.number ?? "—"} (
              {workLogModalOrg?.shortName ?? "—"}) — укажите транспорт
              и&nbsp;принадлежность ТНВД в поле ниже.
            </p>

            <div>
              <label
                htmlFor="worklog-modal-transport"
                className="repair-worklog-card__field-label"
              >
                Транспорт и принадлежность ТНВД
              </label>
              <input
                id="worklog-modal-transport"
                type="text"
                className="repair-worklog-card__input"
                placeholder="Например: КАМАЗ-6520, госномер; ТНВД Bosch №…"
                value={workLogDraft.transportHpfp}
                onChange={(e) =>
                  setWorkLogDraftField("transportHpfp", e.target.value)
                }
                autoComplete="off"
              />
            </div>

            <div className="repair-worklog-modal__pump-numbers">
              <span className="repair-worklog-card__field-label">
                Номера ТНВД (для учёта по населённому пункту)
              </span>
              <ol className="hpfp-number-list repair-worklog-modal__pump-list">
                {(workLogDraft.pumpNumbers ?? []).map((num, idx) => (
                  <li
                    key={`pump-${idx}-${num}`}
                    className="hpfp-number-list__item"
                  >
                    <span className="hpfp-number-list__value">{num}</span>
                    <button
                      type="button"
                      className="hpfp-number-remove"
                      aria-label={`Удалить номер ${num}`}
                      onClick={() => removeWorkLogDraftPumpNumber(idx)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ol>
              <div className="hpfp-add-number">
                <input
                  type="text"
                  className="hpfp-add-number__input"
                  placeholder="Номер насоса / ТНВД"
                  value={workLogPumpInput}
                  onChange={(e) => setWorkLogPumpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addWorkLogDraftPumpNumber();
                    }
                  }}
                  aria-label="Добавить номер ТНВД"
                />
                <button
                  type="button"
                  className="btn btn--secondary hpfp-add-number__btn"
                  onClick={addWorkLogDraftPumpNumber}
                >
                  Добавить номер
                </button>
              </div>
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
                    <li key={p.id} className="repair-worklog-modal__parts-item">
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
                    className="repair-worklog-modal__part-qty"
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

            <div className="repair-worklog-card__works repair-worklog-modal__remark">
              <label
                htmlFor="worklog-modal-hpfp-params"
                className="repair-worklog-card__field-label"
              >
                Параметры ТНВД
              </label>
              <textarea
                id="worklog-modal-hpfp-params"
                className="repair-worklog-card__textarea repair-worklog-card__textarea--remark"
                placeholder="Например: давления, регулировки, показания стенда…"
                value={workLogDraft.hpfpParameters}
                onChange={(e) =>
                  setWorkLogDraftField("hpfpParameters", e.target.value)
                }
                rows={3}
              />
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
                onChange={(e) => setWorkLogDraftField("remark", e.target.value)}
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

            {workLogAddOrgModalOpen ? (
              <div
                className="modal-backdrop modal-backdrop--nested"
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
                  <h2
                    id="worklog-add-org-title"
                    className="modal-dialog__title"
                  >
                    Новый населённый пункт
                  </h2>
                  <p className="modal-dialog__desc repair-worklog-modal__intro">
                    Укажите название населённого пункта и&nbsp;номер телефона
                    для контакта. Пункт получит следующий порядковый номер
                    и&nbsp;сразу будет выбран в карточке.
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
        </div>
      ) : null}
    </div>
  );
}
