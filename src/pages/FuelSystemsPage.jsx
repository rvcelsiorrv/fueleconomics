import { useEffect, useMemo, useState } from "react";
import {
  fuelBySystemType,
  fuelFleetSummary,
  fuelVehicles,
} from "../data/mockFuelFleet";
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

function emptyWorkLogDraft() {
  return {
    orgId: repairWorkLogOrganizations[0].id,
    transportHpfp: "",
    startDate: "",
    endDate: "",
    completedWorks: "",
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

  const workLogOrgById = useMemo(
    () =>
      Object.fromEntries(repairWorkLogOrganizations.map((o) => [o.id, o])),
    [],
  );

  const [workLogEntries, setWorkLogEntries] = useState(() =>
    repairWorkLogInitialEntries.map((e) => ({ ...e })),
  );

  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogDraft, setWorkLogDraft] = useState(emptyWorkLogDraft);

  useEffect(() => {
    if (!workLogModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setWorkLogModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [workLogModalOpen]);

  const maxLiters = useMemo(
    () => Math.max(...fuelBySystemType.map((s) => s.litersMonth), 1),
    [],
  );

  const orgById = useMemo(
    () => Object.fromEntries(hpfpOrganizations.map((o) => [o.id, o])),
    [],
  );

  const repairsFiltered = useMemo(() => {
    if (orgFilter === "all") return hpfpRepairs;
    return hpfpRepairs.filter((r) => r.orgId === orgFilter);
  }, [hpfpRepairs, orgFilter]);

  const orgStats = useMemo(() => {
    return hpfpOrganizations.map((o) => ({
      ...o,
      repairsCount: hpfpRepairs.filter((r) => r.orgId === o.id).length,
      pumpsNumbered: hpfpRepairs
        .filter((r) => r.orgId === o.id)
        .reduce((s, r) => s + r.numbers.length, 0),
      partsCount: hpfpRepairs
        .filter((r) => r.orgId === o.id)
        .reduce((s, r) => s + r.installedParts.length, 0),
    }));
  }, [hpfpRepairs]);

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

  const openWorkLogModal = () => {
    setWorkLogDraft(emptyWorkLogDraft());
    setWorkLogModalOpen(true);
  };

  const closeWorkLogModal = () => setWorkLogModalOpen(false);

  const setWorkLogDraftField = (field, value) => {
    setWorkLogDraft((d) => ({ ...d, [field]: value }));
  };

  const submitWorkLogFromModal = () => {
    setWorkLogEntries((rows) => [
      ...rows,
      {
        id: makeRepairWorkLogId(),
        ...workLogDraft,
      },
    ]);
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
          Сводка по автопарку, типам впрыска и&nbsp;ГБО, учёт заявок
          на&nbsp;ремонт ТНВД по&nbsp;организациям и журнал выполненных работ.
          Период: <strong>{fuelFleetSummary.periodLabel}</strong>.
        </p>
      </header>

      <section className="fuel-stats" aria-label="Ключевые показатели">
        <div className="fuel-stats__grid">
          <article className="fuel-stat-card">
            <span className="fuel-stat-card__label">Единиц в парке</span>
            <span className="fuel-stat-card__value">
              {fuelFleetSummary.totalVehicles}
            </span>
          </article>
          <article className="fuel-stat-card">
            <span className="fuel-stat-card__label">
              Заправлено за месяц, л
            </span>
            <span className="fuel-stat-card__value">
              {formatNum(fuelFleetSummary.totalFuelLiters)}
            </span>
          </article>
          <article className="fuel-stat-card">
            <span className="fuel-stat-card__label">Затраты за месяц</span>
            <span className="fuel-stat-card__value fuel-stat-card__value--sm">
              {formatMoney(fuelFleetSummary.totalSpentRub)}
            </span>
          </article>
          <article className="fuel-stat-card">
            <span className="fuel-stat-card__label">
              Средний расход (парк), л/&nbsp;100&nbsp;км
            </span>
            <span className="fuel-stat-card__value">
              {formatNum(fuelFleetSummary.avgConsumptionL100)}
            </span>
          </article>
        </div>
      </section>

      <section
        className="fuel-breakdown"
        aria-labelledby="fuel-breakdown-title"
      >
        <h2 id="fuel-breakdown-title" className="fuel-section-title">
          Расход по типам топливных систем
        </h2>
        <p className="fuel-section-desc">
          Доля заправок в литрах (эквивалент) по&nbsp;классификации систем
          питания двигателя.
        </p>
        <ul className="fuel-bars">
          {fuelBySystemType.map((row) => (
            <li key={row.id} className="fuel-bars__item">
              <div className="fuel-bars__head">
                <span className="fuel-bars__label">{row.label}</span>
                <span className="fuel-bars__meta">
                  {row.vehicles}&nbsp;а/м · {formatNum(row.litersMonth)}&nbsp;л
                </span>
              </div>
              <div
                className="fuel-bars__track"
                role="presentation"
                aria-hidden="true"
              >
                <div
                  className="fuel-bars__fill"
                  style={{
                    width: `${(row.litersMonth / maxLiters) * 100}%`,
                    "--bar-h": `${row.colorHue}`,
                  }}
                />
              </div>
              <span className="fuel-bars__pct">
                {row.sharePct}%&nbsp;парка
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="hpfp-orgs-section"
        aria-labelledby="hpfp-orgs-title"
      >
        <h2 id="hpfp-orgs-title" className="fuel-section-title">
          Учёт по организациям
        </h2>
        <p className="fuel-section-desc">
          Контрагенты, сдавшие ТНВД в&nbsp;ремонт: заявки, номера насосов
          и&nbsp;позиции установленных запчастей.
        </p>
        <div className="hpfp-org-cards">
          {orgStats.map((o) => (
            <article key={o.id} className="hpfp-org-card">
              <h3 className="hpfp-org-card__name">{o.shortName}</h3>
              <p className="hpfp-org-card__full">{o.name}</p>
              <p className="hpfp-org-card__inn">ИНН {o.inn}</p>
              <dl className="hpfp-org-card__stats">
                <div>
                  <dt>Заявок</dt>
                  <dd>{o.repairsCount}</dd>
                </div>
                <div>
                  <dt>Номеров&nbsp;ТНВД</dt>
                  <dd>{o.pumpsNumbered}</dd>
                </div>
                <div>
                  <dt>Запчастей учтено</dt>
                  <dd>{o.partsCount}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section
        className="repair-worklog-section"
        aria-labelledby="repair-worklog-title"
      >
        <h2 id="repair-worklog-title" className="fuel-section-title">
          Журнал ремонта топливных систем
        </h2>
        <p className="fuel-section-desc">
          Записи ведутся в таблице; новая карточка добавляется через форму
          в&nbsp;модальном окне (организация с&nbsp;номером, телефон, привязка
          к транспорту и&nbsp;ТНВД, даты, перечень работ).
        </p>
        <div className="repair-worklog-toolbar">
          <button
            type="button"
            className="btn btn--primary"
            onClick={openWorkLogModal}
          >
            Добавить карточку
          </button>
        </div>

        {workLogEntries.length === 0 ? (
          <p className="repair-worklog-empty">
            Записей пока нет. Нажмите «Добавить карточку», чтобы открыть форму.
          </p>
        ) : (
          <div className="repair-worklog-table-wrap">
            <table className="repair-worklog-table">
              <thead>
                <tr>
                  <th scope="col">П/п</th>
                  <th scope="col">Организация</th>
                  <th scope="col">Телефон</th>
                  <th scope="col">Топливная система</th>
                  <th scope="col">Начало</th>
                  <th scope="col">Окончание</th>
                  <th scope="col">Выполненные работы</th>
                  <th scope="col">
                    <span className="visually-hidden">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {workLogEntries.map((entry, index) => {
                  const org = workLogOrgById[entry.orgId];
                  const tel = org ? phoneToTelHref(org.phone) : undefined;
                  const fuelSummary = [
                    `Орг. №${org?.number ?? "—"} (${org?.shortName ?? "—"})`,
                    entry.transportHpfp.trim() || null,
                  ]
                    .filter(Boolean)
                    .join(". ");
                  const works =
                    entry.completedWorks.trim() || "—";
                  return (
                    <tr key={entry.id}>
                      <td>{index + 1}</td>
                      <td className="repair-worklog-table__org">
                        №{org?.number ?? "—"} — {org?.shortName ?? "—"}
                      </td>
                      <td>
                        {org && tel ? (
                          <a href={tel}>{org.phone}</a>
                        ) : (
                          (org?.phone ?? "—")
                        )}
                      </td>
                      <td>{fuelSummary}</td>
                      <td className="repair-worklog-table__date">
                        {formatDateRu(entry.startDate)}
                      </td>
                      <td className="repair-worklog-table__date">
                        {formatDateRu(entry.endDate)}
                      </td>
                      <td className="repair-worklog-table__works">{works}</td>
                      <td>
                        <button
                          type="button"
                          className="repair-worklog-table__delete"
                          onClick={() => removeWorkLogEntry(entry.id)}
                          aria-label={`Удалить запись ${index + 1}`}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                      <span
                        className={`hpfp-status hpfp-status--${r.status}`}
                      >
                        {hpfpStatusLabels[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="hpfp-table__nowrap">{r.openedAt}</td>
                    <td>
                      {r.estimateRub != null
                        ? formatMoney(r.estimateRub)
                        : "—"}
                    </td>
                    <td className="hpfp-table__numbers-cell">
                      <ol className="hpfp-number-list">
                        {r.numbers.map((num, idx) => (
                          <li key={`${r.id}-${idx}-${num}`} className="hpfp-number-list__item">
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
                            <span className="hpfp-parts-list__name">{p.name}</span>
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

      <section className="fuel-table-section" aria-labelledby="fuel-table-title">
        <h2 id="fuel-table-title" className="fuel-section-title">
          Учёт по автомобилям
        </h2>
        <div className="fuel-table-wrap">
          <table className="fuel-table">
            <thead>
              <tr>
                <th scope="col">Автомобиль</th>
                <th scope="col">Топливная система</th>
                <th scope="col">Бак, л</th>
                <th scope="col">Норма расхода</th>
                <th scope="col">Последняя заправка</th>
                <th scope="col">Заправка, л</th>
                <th scope="col">Сумма</th>
                <th scope="col">Пробег, км</th>
              </tr>
            </thead>
            <tbody>
              {fuelVehicles.map((v) => (
                <tr key={v.id}>
                  <td className="fuel-table__model">{v.model}</td>
                  <td>{v.fuelSystem}</td>
                  <td>{v.tankL}</td>
                  <td className="fuel-table__nowrap">
                    {v.consumptionL100 != null
                      ? `${formatNum(v.consumptionL100)} л/100 км`
                      : `газ ${formatNum(v.consumptionL100Gas)} / бенз. ${formatNum(v.consumptionL100Petrol)}`}
                  </td>
                  <td>{v.lastRefill}</td>
                  <td>{formatNum(v.lastLiters)}</td>
                  <td>{formatMoney(v.lastCostRub)}</td>
                  <td>{formatNum(v.odometerKm)}</td>
                </tr>
              ))}
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
              Новая карточка ремонта
            </h2>
            <p className="modal-dialog__desc repair-worklog-modal__intro">
              Заполните поля и&nbsp;нажмите «Добавить в журнал» — запись
              появится в таблице ниже.
            </p>

            <div className="repair-worklog-card__head repair-worklog-modal__head">
              <div className="repair-worklog-card__org-field">
                <label
                  htmlFor="worklog-modal-org"
                  className="repair-worklog-card__org-label"
                >
                  Организация
                </label>
                <select
                  id="worklog-modal-org"
                  className="repair-worklog-card__select"
                  value={workLogDraft.orgId}
                  onChange={(e) =>
                    setWorkLogDraftField("orgId", e.target.value)
                  }
                >
                  {repairWorkLogOrganizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      №{o.number} — {o.shortName}
                    </option>
                  ))}
                </select>
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

            <p className="repair-worklog-card__fuel-line">
              <strong>Топливная система:</strong> организация №
              &nbsp;{workLogModalOrg?.number ?? "—"} (
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
                Добавить в журнал
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
