/** Организации для журнала ремонта (номер + контакт). Учебные данные. */

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
    transportHpfp:
      "КАМАЗ-6520, А174BC23; ТНВД Bosch CP3, инв. № 0986437398",
    startDate: "2026-02-03",
    endDate: "2026-02-14",
    completedWorks:
      "Снятие ТНВД, замена комплекта уплотнений и клапана PRV, проверка на стенде, установка, пуск.",
  },
  {
    id: "rwl-mock-2",
    orgId: "rw-org-2",
    transportHpfp: "Mercedes Sprinter 316 CDI, К555МН99; ТНВД CP3",
    startDate: "2026-02-18",
    endDate: "2026-03-01",
    completedWorks:
      "Диагностика утечки, замена вала привода и подшипника, регулировка подачи.",
  },
  {
    id: "rwl-mock-3",
    orgId: "rw-org-3",
    transportHpfp: "John Deere 6130M; насос Denso HP3",
    startDate: "2026-03-05",
    endDate: "",
    completedWorks:
      "Принят в работу, дефектовка. Окончание ремонта — по факту выполнения.",
  },
  {
    id: "rwl-mock-4",
    orgId: "rw-org-4",
    transportHpfp: "ГАЗон Next Cummins ISF, У777OK178; ТНВД Common Rail",
    startDate: "2026-03-12",
    endDate: "2026-03-20",
    completedWorks:
      "Ремонт плунжерной пары, обновление топливного фильтра, обкатка на стенде.",
  },
];
