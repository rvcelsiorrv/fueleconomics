/** Населённые пункты журнала ремонта (номер + контакт). Учебные данные. */

export const repairWorkLogOrganizations = [
  {
    id: "rw-org-1",
    number: 1,
    shortName: "Савоськин",
    phone: "+7 (900) 111-22-01",
  },
  {
    id: "rw-org-2",
    number: 2,
    shortName: "Байков",
    phone: "+7 (900) 111-22-02",
  },
  {
    id: "rw-org-3",
    number: 3,
    shortName: "Киевка",
    phone: "+7 (900) 111-22-03",
  },
  {
    id: "rw-org-4",
    number: 4,
    shortName: "Дружба",
    phone: "+7 (900) 111-22-04",
  },
];

/** Начальные строки журнала ремонта (демо) */
export const repairWorkLogInitialEntries = [
  {
    id: "rwl-mock-1",
    orgId: "rw-org-1",
    clientLastName: "Козлов",
    transportHpfp:
      "КАМАЗ-6520, А174BC23; ТНВД Bosch CP3, инв. № 0986437398",
    startDate: "2026-02-03",
    endDate: "2026-02-14",
    completedWorks:
      "Снятие ТНВД, замена комплекта уплотнений и клапана PRV, проверка на стенде, установка, пуск.",
    remark: "Гарантия на работы 30 суток. Заказчик уведомлён о необходимости замены топливного фильтра через 500 км.",
    installedParts: [
      { id: "wlp-m1-1", name: "Комплект уплотнений ТНВД (CP3)", qty: 1 },
      { id: "wlp-m1-2", name: "Клапан ограничения давления (PRV)", qty: 1 },
    ],
    pumpNumbers: ["0986437398"],
  },
  {
    id: "rwl-mock-2",
    orgId: "rw-org-2",
    clientLastName: "Морозов",
    transportHpfp: "Mercedes Sprinter 316 CDI, К555МН99; ТНВД CP3",
    startDate: "2026-02-18",
    endDate: "2026-03-01",
    completedWorks:
      "Диагностика утечки, замена вала привода и подшипника, регулировка подачи.",
    remark: "Оплата по счёту № 184 от 15.02.2026.",
    installedParts: [
      { id: "wlp-m2-1", name: "Вал привода ТНВД", qty: 1 },
      { id: "wlp-m2-2", name: "Подшипник опорный", qty: 1 },
    ],
    pumpNumbers: ["0986437340", "0986437340"],
  },
  {
    id: "rwl-mock-3",
    orgId: "rw-org-3",
    clientLastName: "Волков",
    transportHpfp: "John Deere 6130M; насос Denso HP3",
    startDate: "2026-03-05",
    endDate: "",
    completedWorks:
      "Принят в работу, дефектовка. Окончание ремонта — по факту выполнения.",
    remark: "Согласовать с механиком хозяйства срок выдачи после поступления запчастей.",
    installedParts: [],
    pumpNumbers: ["294000-090"],
  },
  {
    id: "rwl-mock-4",
    orgId: "rw-org-4",
    clientLastName: "Соколов",
    transportHpfp: "ГАЗон Next Cummins ISF, У777OK178; ТНВД Common Rail",
    startDate: "2026-03-12",
    endDate: "2026-03-20",
    completedWorks:
      "Ремонт плунжерной пары, обновление топливного фильтра, обкатка на стенде.",
    remark: "",
    installedParts: [
      { id: "wlp-m4-1", name: "Плунжерная пара (восст.)", qty: 1 },
      { id: "wlp-m4-2", name: "Топливный фильтр тонкой очистки", qty: 1 },
    ],
    pumpNumbers: ["CR-7788"],
  },
  {
    id: "rwl-mock-5",
    orgId: "rw-org-1",
    clientLastName: "Лебедев",
    transportHpfp: "Volvo FH, Е999XX77; ТНВД Bosch",
    startDate: "2026-03-25",
    endDate: "",
    completedWorks: "Диагностика, ожидание запчастей.",
    remark: "Вторая заявка от той же организации — тот же номер ТНВД.",
    installedParts: [],
    pumpNumbers: ["0986437398"],
  },
];
