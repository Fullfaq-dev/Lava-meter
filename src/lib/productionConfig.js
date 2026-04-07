// Конфигурация групп фрикуллеров
// Каждая группа: фрикуллер (meter_number) распределяет потребление пропорционально выпуску линий

export const FRICOOLER_GROUPS = [
  {
    // Фрикуллер №3 (Сч.3, meter 3) → FCL-3, FCL-5, FCL-6
    fricooler_meter_number: 3,
    lines: [
      {
        fcl: "FCL-3",
        meter_number: 10,          // Сч.11 — ввод FCL-3
        output_key: "fcl3",
        subtract_meters: [15, 12], // минус Сч.16 (meter 15) и минус Сч.13 (meter 12)
      },
      { fcl: "FCL-5", meter_number: 8,  output_key: "fcl5" }, // Сч.9
      { fcl: "FCL-6", meter_number: 16, output_key: "fcl6" }, // Сч.17
    ],
  },
  {
    // Фрикуллер №1 (Сч.13, meter 12) → FCL-7, FCL-8
    fricooler_meter_number: 12,
    lines: [
      { fcl: "FCL-8", meter_number: 4, output_key: "fcl8" }, // Сч.5
      { fcl: "FCL-7", meter_number: 6, output_key: "fcl7" }, // Сч.7
    ],
  },
  {
    // Фрикуллер №2 (Сч.2, meter 2) → FCL-1, FCL-4
    fricooler_meter_number: 2,
    lines: [
      {
        fcl: "FCL-1",
        meter_number: 1,         // Сч.1 — ввод секции 1
        output_key: "fcl1",
        subtract_meters: [4, 7], // минус Сч.5 (meter 4, FCL-8) и минус Сч.8 (meter 7, перемотка)
      },
      {
        fcl: "FCL-4",
        meter_number: 5,         // Сч.6 — ввод секции 2
        output_key: "fcl4",
        subtract_meters: [6],    // минус Сч.7 (meter 6, FCL-7)
      },
    ],
  },
];

// Линии для ввода выпуска продукции
export const PRODUCTION_LINES = [
  { key: "fcl1",         label: "FCL-1" },
  { key: "fcl2",         label: "FCL-2" },
  { key: "fcl3",         label: "FCL-3" },
  { key: "fcl4",         label: "FCL-4" },
  { key: "fcl5",         label: "FCL-5" },
  { key: "fcl6",         label: "FCL-6" },
  { key: "fcl7",         label: "FCL-7" },
  { key: "fcl8",         label: "FCL-8" },
  { key: "fcl9",         label: "FCL-9" },
  { key: "peremotka",    label: "Линия перемотки" },
  { key: "shreder",      label: "Шрёдер" },
  { key: "granulyaciya1", label: "Грануляция 1 (гильотина)" },
  { key: "granulyaciya2", label: "Грануляция 2" },
  { key: "granulyaciya3", label: "Грануляция 3" },
];