/** Организации и заявки на ремонт ТНВД (учебные данные) */

export const hpfpOrganizations = [
  {
    id: "org-1",
    name: 'ООО «Транслогистик Северо-Запад»',
    shortName: "Транслогистик",
    inn: "7810123456",
  },
  {
    id: "org-2",
    name: 'АО «АгроТехСервис»',
    shortName: "АгроТехСервис",
    inn: "5020987654",
  },
  {
    id: "org-3",
    name: 'ИП Кузнецов А.В.',
    shortName: "ИП Кузнецов",
    inn: "540123456789",
  },
];

/**
 * numbers — заводские/инвентарные номера насосов в рамках заявки (можно дополнять в UI)
 * installedParts — запчасти, установленные при ремонте (наименование + кол-во)
 */
export const hpfpRepairsInitial = [
  {
    id: "hpfp-1",
    orgId: "org-1",
    assetLabel: "Ford Transit 2.0 TDCi · А123ВЕ 77",
    pumpType: "Bosch CP4 (ТНВД Common Rail)",
    status: "in_progress",
    openedAt: "2026-03-18",
    estimateRub: 68_000,
    numbers: ["0445010619", "0445010620"],
    installedParts: [
      { id: "pt-1-1", name: "Ремкомплект уплотнений ТНВД (сальники, кольца CP4)", qty: 1 },
      { id: "pt-1-2", name: "Клапан ограничения давления (PRV) Common Rail", qty: 1 },
      { id: "pt-1-3", name: "Болты крепления ТНВД (комплект)", qty: 1 },
    ],
  },
  {
    id: "hpfp-2",
    orgId: "org-1",
    assetLabel: "Mercedes Sprinter 316 CDI · К555МН 99",
    pumpType: "Bosch CP3",
    status: "ready",
    openedAt: "2026-03-05",
    closedAt: "2026-03-27",
    estimateRub: 82_500,
    numbers: ["0986437340"],
    installedParts: [
      { id: "pt-2-1", name: "Вал привода ТНВД (новый)", qty: 1 },
      { id: "pt-2-2", name: "Подшипник опорный передний", qty: 1 },
      { id: "pt-2-3", name: "Фильтр тонкой очистки топлива", qty: 1 },
    ],
  },
  {
    id: "hpfp-3",
    orgId: "org-2",
    assetLabel: "John Deere 6130M (с/х)",
    pumpType: "Denso HP3",
    status: "accepted",
    openedAt: "2026-03-29",
    estimateRub: null,
    numbers: [],
    installedParts: [],
  },
  {
    id: "hpfp-4",
    orgId: "org-3",
    assetLabel: "Toyota Hilux 2.4 D-4D · У777ОК 178",
    pumpType: "Denso (ТНВД)",
    status: "in_progress",
    openedAt: "2026-03-22",
    estimateRub: 54_200,
    numbers: ["294000-090#", "294000-091#"],
    installedParts: [
      { id: "pt-4-1", name: "Плунжерная пара ТНВД (восстановленная)", qty: 1 },
      { id: "pt-4-2", name: "Пружина регулятора давления", qty: 2 },
    ],
  },
];

export const hpfpStatusLabels = {
  accepted: "Принят",
  in_progress: "В ремонте",
  ready: "Готов к выдаче",
};
