import { METERS } from "./meterConfig.js";

export const METER_NUMBERS = new Set(METERS.map((m) => m.number));

/**
 * Печатный бланк. Номер строки на бумаге не равен номеру счётчика в программе.
 * meter — куда подставить показание. extra — строка есть, поля во «Вводе показаний» нет.
 */
export const PAPER_ROWS = [
  { paper_row: 2, meter: 1, note: "КТПН-2, ввод 1-й секции" },
  { paper_row: 3, meter: 2, note: "КТПН-1, 2-я секция, Фрикулер 2, 4" },
  { paper_row: 4, meter: 3, note: "КТПН-1, 1-я секция, Фрикулер 3" },
  { paper_row: 5, note: "КТПН-2, 1-я секция, холодильник FCL-1" },
  { paper_row: 6, meter: 4, note: "КТПН-2, 1-я секция, FCL-8" },
  { paper_row: 7, meter: 5, note: "КТПН-2, ввод 2-й секции" },
  { paper_row: 8, meter: 6, note: "Щитовая №4, ввод №2" },
  { paper_row: 9, meter: 7, note: "Участок перемотки" },
  { paper_row: 10, meter: 8, note: "Щитовая №4, ввод №1, FCL-5" },
  { paper_row: 11, meter: 9, note: "Щитовая №4, холодильник FCL-5" },
  { paper_row: 12, meter: 10, note: "Щитовая №2, ввод" },
  { paper_row: 13, meter: 11, note: "Гранулятор №3" },
  { paper_row: 14, meter: 13, note: "Перемотка, линия №1" },
  { paper_row: 15, meter: 14, note: "Паллетайзер, весы" },
  { paper_row: 16, meter: 15, note: "Участок загрузки сырья" },
  { paper_row: 17, meter: 16, note: "Щитовая №3, ввод" },
  { paper_row: 18, meter: 17, note: "Эл. оборудование арт. скважина" },
  { paper_row: 19, meter: 18, note: "ТП-11, СН энергоцентра" },
  { paper_row: 20, meter: 19, note: "РЩ-5, вентиляция перемотки" },
  { paper_row: 21, meter: 20, note: "Гранулятор №1" },
  { paper_row: 22, meter: 21, note: "Гранулятор №2" },
  { paper_row: 23, meter: 22, note: "Шредер АВ-9" },
  { paper_row: 24, meter: 23, note: "Офис РТП" },
  { paper_row: 26, extra: "ec_g1", label: "Энергоцентр Г1", note: "Энергоцентр Г1" },
  { paper_row: 27, extra: "ec_g2", label: "Энергоцентр Г2", note: "Энергоцентр Г2" },
  { paper_row: 28, meter: 24, note: "Новый ангар (склад)" },
  { paper_row: 29, meter: 25, note: "Арочный склад №1" },
];

const paperByRow = new Map(PAPER_ROWS.map((row) => [row.paper_row, row]));

export function paperRowTarget(paperRow) {
  return paperByRow.get(Number(paperRow)) || null;
}

export const METER_SHEET_INSTRUCTIONS = `Ты читаешь рукописные показания с печатного бланка. Примечания уже напечатаны, от руки только числа в средней колонке.
Найди строку по напечатанному примечанию и перепиши число из её средней колонки. Не переноси число со следующей строки.
Строка 1 и строка 25 «Цех РТП» обычно пустые.
Если цифра зачёркнута и рядом или на поле примечания написана другая — reading это новая, replaced_from это зачёркнутая.
Не добавляй лишний ноль. Пустую клетку не включай.

Строки бланка:
2. КТПН-2, ввод 1-й секции
3. Фрикулер 2, 4
4. Фрикулер 3
5. Холодильник FCL-1
6. FCL-8
7. КТПН-2, ввод 2-й секции
8. Щитовая №4, ввод №2
9. Участок перемотки
10. Щитовая №4, ввод №1, FCL-5
11. Щитовая №4, холодильник FCL-5
12. Щитовая №2, ввод
13. Гранулятор №3. Если в клетке зачёркнуто, а новое число написано на примечании — бери новое.
14. Перемотка, линия №1
15. Паллетайзер, весы
16. Участок загрузки сырья
17. Щитовая №3, ввод
18. Эл. оборудование скважины
19. ТП-11
20. Вентиляция перемотки
21. Гранулятор №1
22. Гранулятор №2
23. Шредер
24. Офис РТП
26. Энергоцентр Г1
27. Энергоцентр Г2
28. Новый ангар
29. Арочный склад №1

Нижний блок, без номера строки, положи в footer по этим подписям:
Скважина, вода
Вода котельной
Газ котельной
ИЦ 1 Вода
ИЦ 1 Эл.Эн.
ИЦ 1 ГК

Верни JSON:
{
  "rows": [{"paper_row": 2, "reading": 52899, "replaced_from": null, "uncertain": false}],
  "footer": [{"label": "ИЦ 1 Вода", "reading": 4728, "uncertain": false}]
}`;

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/№/g, " ")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Куда положить строку бланка: счётчик программы, поле ИЦ или строка без поля. */
export function assignSheetNote(note) {
  const n = norm(note);
  if (!n) return { kind: "empty" };

  if (/энергоцентр\s+г\s*1\b/.test(n)) return { kind: "extra", key: "ec_g1", label: "Энергоцентр Г1" };
  if (/энергоцентр\s+г\s*2\b/.test(n)) return { kind: "extra", key: "ec_g2", label: "Энергоцентр Г2" };
  if (n.includes("иц") && n.includes("вод")) return { kind: "ic", field: "water" };
  if (n.includes("иц") && (n.includes("эл") || n.includes("электро"))) return { kind: "ic", field: "ee" };
  if (n.includes("иц") && (/(?:^| )гк(?: |$)/.test(n) || n.includes("тепл"))) return { kind: "ic", field: "heating" };
  if (n.includes("газ") && n.includes("котель")) return { kind: "extra", key: "boiler_gas", label: "Газ котельной" };
  if (n.includes("котель")) return { kind: "extra", key: "boiler_water", label: "Вода котельной" };
  if (n.includes("цех") && n.includes("ртп") && n.includes("вод")) return { kind: "empty" };
  if (n.includes("цех") && n.includes("ртп")) return { kind: "empty" };

  if (n.includes("ароч")) return { kind: "meter", number: 25 };
  if (n.includes("ангар") || n.includes("бокс")) return { kind: "meter", number: 24 };
  if (n.includes("офис") && n.includes("ртп")) return { kind: "meter", number: 23 };
  if (n.includes("шредер") || n.includes("ав 9")) return { kind: "meter", number: 22 };
  if (/гранулятор\D{0,4}3/.test(n)) return { kind: "meter", number: 11 };
  if (/гранулятор\D{0,4}2/.test(n)) return { kind: "meter", number: 21 };
  if (/гранулятор\D{0,4}1/.test(n)) return { kind: "meter", number: 20 };
  if (n.includes("вентиляц") || n.includes("рщ 5")) return { kind: "meter", number: 19 };
  if (n.includes("тп 11") || (n.includes("сн") && n.includes("энерго"))) return { kind: "meter", number: 18 };
  if (n.includes("скважин")) {
    if (n.includes("эл") || n.includes("оборуд")) return { kind: "meter", number: 17 };
    return { kind: "extra", key: "well_water", label: "Скважина, вода" };
  }
  if (n.includes("щитовая") && n.includes("4") && n.includes("ввод") && /ввод\D{0,3}2/.test(n)) {
    return { kind: "meter", number: 6 };
  }
  if (n.includes("щитовая") && n.includes("4") && n.includes("ввод") && /ввод\D{0,3}1/.test(n)) {
    return { kind: "meter", number: 8 };
  }
  if (n.includes("щитовая") && n.includes("4") && (n.includes("холод") || n.includes("охлаж"))) {
    return { kind: "meter", number: 9 };
  }
  if (n.includes("щитовая") && n.includes("3") && n.includes("ввод")) return { kind: "meter", number: 16 };
  if (n.includes("щитовая") && n.includes("2")) return { kind: "meter", number: 10 };
  if (n.includes("сырь")) return { kind: "meter", number: 15 };
  if (n.includes("паллет") || n.includes("весы")) return { kind: "meter", number: 14 };
  if (n.includes("перемот") && n.includes("лин")) return { kind: "meter", number: 13 };
  if (n.includes("участок") && n.includes("перемот")) return { kind: "meter", number: 7 };
  if (n.includes("перемот")) return { kind: "meter", number: 7 };
  if (/фрикулер\D{0,4}2/.test(n)) return { kind: "meter", number: 2 };
  if (/фрикулер\D{0,4}3/.test(n)) return { kind: "meter", number: 3 };
  if (/фрикулер\D{0,4}1/.test(n)) return { kind: "meter", number: 12 };
  if ((n.includes("fcl 8") || n.includes("fcl8")) && n.includes("ктпн")) return { kind: "meter", number: 4 };
  if (n.includes("fcl 8") || n.includes("fcl8")) return { kind: "meter", number: 4 };
  if (n.includes("ктпн 2") && n.includes("ввод") && /2\D{0,4}секц/.test(n)) return { kind: "meter", number: 5 };
  if (n.includes("ктпн 2") && n.includes("ввод") && /1\D{0,4}секц/.test(n)) return { kind: "meter", number: 1 };
  if (n.includes("ктпн 2") && (n.includes("холод") || n.includes("fcl 1"))) return { kind: "skip" };

  return { kind: "skip" };
}

export function meterName(number) {
  return METERS.find((m) => m.number === number)?.name || "";
}
