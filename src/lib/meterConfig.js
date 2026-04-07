// All meters sorted by sequential number (1, 2, 3...)
// Based on the original spreadsheet data

export const METERS = [
  { number: 1, code: "Сч.1", name: "КТПН-2, ввод 0.4 кВ, 1-я секция", location: "FCL-1(6;2)", type: "АСКУЭ", coefficient: 800, initialReading: 0, initialDate: "2025-12-01" },
  { number: 2, code: "Сч.2", name: "Фрикулер №2 охлаждение", location: "FCL-1 и FCL-4", type: "АСКУЭ", coefficient: 120, initialReading: 62344, initialDate: "2025-12-01" },
  { number: 3, code: "Сч.3", name: "Фрикулер №3 охлаждение", location: "FCL-5, FCL-3 и FCL-6", type: "АСКУЭ", coefficient: 120, initialReading: 77660, initialDate: "2025-12-01" },
  { number: 4, code: "Сч.5", name: "Линия FCL-8", location: "8(1)-я линия", type: "АСКУЭ", coefficient: 400, initialReading: 87674, initialDate: "2025-12-01" },
  { number: 5, code: "Сч.6", name: "КТПН-2, ввод 0.4 кВ, 2-я секция", location: "FCL-4", type: "АСКУЭ", coefficient: 800, initialReading: 55555, initialDate: "2025-12-01" },
  { number: 6, code: "Сч.7", name: "Щитовая №4, ВВОД №2", location: "FCL-7", type: "АСКУЭ", coefficient: 400, initialReading: 70596, initialDate: "2025-12-01" },
  { number: 7, code: "Сч.8", name: "Участок перемотки общий учёт", location: "", type: "АСКУЭ", coefficient: 60, initialReading: 29776, initialDate: "2025-12-01" },
  { number: 8, code: "Сч.9", name: "Щитовая №4, ВВОД №1 для FCL-5", location: "FCL-5", type: "АСКУЭ", coefficient: 400, initialReading: 133778, initialDate: "2025-12-01" },
  { number: 9, code: "Сч.10", name: "Щитовая №4, охлаждение FCL-5", location: "", type: "АСКУЭ", coefficient: 120, initialReading: null, initialDate: "2025-12-01" },
  { number: 10, code: "Сч.11", name: "Щитовая №2 ВВОД для FCL-3", location: "FCL-3", type: "АСКУЭ", coefficient: 400, initialReading: 124999, initialDate: "2025-12-01" },
  { number: 11, code: "Сч.12", name: "Гранулятор №3 (Гранулятор №2)", location: "", type: "АСКУЭ", coefficient: 80, initialReading: 8008, initialDate: "2025-12-01" },
  { number: 12, code: "Сч.13", name: "Фрикулер №1", location: "FCL-8 и FCL-7", type: "АСКУЭ", coefficient: 200, initialReading: 53775, initialDate: "2025-12-01" },
  { number: 13, code: "Сч.14", name: "Линия перемотки №1 (новый разрезной станок)", location: "", type: "техучет", coefficient: 20, initialReading: 0, initialDate: "2025-12-01" },
  { number: 14, code: "Сч.15", name: "Паллетайзер, весы", location: "FCL-5", type: "техучет", coefficient: 40, initialReading: 20493, initialDate: "2025-12-01" },
  { number: 15, code: "Сч.16", name: "Участок загрузки сырья", location: "", type: "АСКУЭ", coefficient: 40, initialReading: 23188, initialDate: "2025-12-01" },
  { number: 16, code: "Сч.17", name: "Щитовая №3 ВВОД", location: "FCL-6", type: "техучет", coefficient: 200, initialReading: 97961, initialDate: "2025-12-01" },
  { number: 17, code: "Сч.18", name: "Скважина", location: "", type: "техучет", coefficient: 1, initialReading: 0, initialDate: "2025-12-01" },
  { number: 18, code: "Сч.19", name: "ТП-11 ВВОД 0.4 кВ", location: "СН Энергоцентр", type: "АСКУЭ", coefficient: 200, initialReading: 32863, initialDate: "2025-12-01" },
  { number: 19, code: "Сч.20", name: "Вентиляция участка перемотки", location: "FCL-2, FCL-3", type: "техучет", coefficient: 20, initialReading: 40412, initialDate: "2025-12-01" },
  { number: 20, code: "Сч.21", name: "Гранулятор №1, гильотина", location: "", type: "АСКУЭ", coefficient: 80, initialReading: 41434, initialDate: "2025-12-01" },
  { number: 21, code: "Сч.22", name: "Гранулятор №2 (ор№3)", location: "", type: "АСКУЭ", coefficient: 60, initialReading: 9832, initialDate: "2025-12-01" },
  { number: 22, code: "Сч.23", name: "Шрёдер - измельчитель", location: "", type: "АСКУЭ", coefficient: 50, initialReading: 3930, initialDate: "2025-12-01" },
  { number: 23, code: "Сч.24", name: "Офис РТП", location: "", type: "техучет", coefficient: 60, initialReading: 54585, initialDate: "2025-12-01" },
  { number: 24, code: "Сч.28", name: "Здание Бокса (склад)", location: "", type: "ВУ", coefficient: 1, initialReading: 736, initialDate: "2025-12-01" },
  { number: 25, code: "Сч.29", name: "Арочный склад №1", location: "", type: "ВУ", coefficient: 1, initialReading: 23, initialDate: "2025-12-01" },
];

export const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

export const MONTH_SHORT = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"
];