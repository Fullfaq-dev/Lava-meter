import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
} from "docx";
import { saveAs } from "file-saver";
import { MONTHS, MONTHS_GENITIVE } from "./meterConfig";
import { getPrevMonth } from "./icCalc";
import {
  IC_EE_TRANSFORM_COEF,
  IC_HEATING_TARIFF_PER_GCAL,
} from "./icConfig";

const BLUE = "2E75B6";
const FONT = "Times New Roman";

/** Ширины колонок (DXA), суммарно ~ A4 с полями */
const COL_W = [1700, 1700, 3200, 1700, 1400];
const TABLE_W = COL_W.reduce((a, b) => a + b, 0);

const border = {
  top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
};

const fmtInt = (v) =>
  v != null && !isNaN(v) ? Number(v).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) : "—";

const fmtNum = (v, digits = 2) =>
  v != null && !isNaN(v)
    ? Number(v).toLocaleString("ru-RU", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "—";

/** Без пробелов тысяч — как в промежуточных строках референса */
const fmtPlain = (v, digits = 2) => {
  if (v == null || isNaN(v)) return "—";
  return Number(v).toFixed(digits).replace(".", ",");
};

const fmtMoney = (v) => (v != null && !isNaN(v) ? fmtNum(v, 2) : "—");

function monthGenitive(monthName) {
  const idx = MONTHS.indexOf(monthName);
  return idx >= 0 ? MONTHS_GENITIVE[idx] : monthName;
}

function monthLower(monthName) {
  return String(monthName || "").toLowerCase();
}

function p(text, opts = {}) {
  const {
    bold = false,
    blue = false,
    center = false,
    size = 22,
    after = 0,
    before = 0,
  } = opts;
  return new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before, after },
    children: [
      new TextRun({
        text: String(text),
        bold,
        size,
        font: FONT,
        color: blue ? BLUE : "000000",
      }),
    ],
  });
}

function cell(text, opts = {}) {
  const {
    bold = false,
    center = true,
    width,
    header = false,
  } = opts;
  return new TableCell({
    borders: border,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [
          new TextRun({
            text: String(text ?? ""),
            bold: bold || header,
            size: 18,
            font: FONT,
          }),
        ],
      }),
    ],
  });
}

function makeTable(headers, values) {
  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA },
    columnWidths: COL_W,
    rows: [
      new TableRow({
        children: headers.map((t, i) =>
          cell(t, { header: true, width: COL_W[i] })
        ),
      }),
      new TableRow({
        children: values.map((t, i) =>
          cell(t, { bold: true, width: COL_W[i] })
        ),
      }),
    ],
  });
}

function sectionTitle(text) {
  return p(text, { bold: true, blue: true, size: 24, before: 280, after: 80 });
}

export async function exportIcReportWord({
  monthName,
  year,
  form,
  prevForm,
  calc,
}) {
  const prev = getPrevMonth(year, monthName);
  const prevGen = prev ? monthGenitive(prev.month) : "—";
  const currGen = monthGenitive(monthName);
  const monthTariff = monthLower(monthName);

  const eeCons = calc.eeConsumption;
  const eeKwh = eeCons != null ? eeCons * IC_EE_TRANSFORM_COEF : null;
  const eeTariff = calc.eeTariff;

  const waterVol = calc.waterSupplyConsumption;
  const waterReading = form.water_reading ?? form.water_supply_reading;
  const prevWater =
    prevForm?.water_reading ?? prevForm?.water_supply_reading ?? prevForm?.water_drainage_reading;
  const waterSupplyTariff = calc.waterSupplyTariff;
  const waterDrainageTariff = calc.waterDrainageTariff;

  const children = [
    p("Отчет по коммунальным услугам", { bold: true, blue: true, center: true, size: 28, after: 40 }),
    p("Исправительный центр", { bold: true, blue: true, center: true, size: 26, after: 40 }),
    p(`${monthName} ${year} г.`, { blue: true, center: true, size: 24, after: 200 }),
    p(`Количество проживающих: ${form.residents_count ?? "—"} человек`, {
      bold: true,
      size: 22,
      after: 200,
    }),

    // ——— Электроэнергия ———
    sectionTitle("Электроэнергия"),
    makeTable(
      [
        `Показания счетчика на конец ${prevGen}`,
        `Показания счетчика на конец ${currGen}`,
        "Разница",
        "Тариф",
        "Сумма",
      ],
      [
        fmtInt(prevForm?.ee_reading),
        fmtInt(form.ee_reading),
        eeCons != null && eeKwh != null
          ? `${fmtInt(eeCons)} × ${IC_EE_TRANSFORM_COEF} (коэффициент трансформации) = ${fmtInt(eeKwh)} кВт·ч`
          : "—",
        eeTariff != null
          ? `${fmtNum(eeTariff, 2)} (тариф за ${monthTariff})`
          : "—",
        fmtMoney(calc.eeAmount),
      ]
    ),
    p(
      `Расчет: (${fmtInt(form.ee_reading)}-${fmtInt(prevForm?.ee_reading)})=${fmtInt(eeCons)};`,
      { size: 20, before: 80 }
    ),
    p(
      `${fmtInt(eeCons)}×${IC_EE_TRANSFORM_COEF} (коэффициент трансформации) = ${fmtInt(eeKwh)} кВт·ч;`,
      { size: 20 }
    ),
    p(
      `${fmtInt(eeKwh)}×${fmtNum(eeTariff, 2)} (тариф за ${monthTariff}) = ${fmtMoney(calc.eeAmount)} руб`,
      { bold: true, size: 20, after: 120 }
    ),

    // ——— Вода ———
    sectionTitle("Вода"),
    makeTable(
      [
        `Показания счетчика на конец ${prevGen}`,
        `Показания счетчика на конец ${currGen}`,
        "Разница",
        "Тариф",
        "Сумма",
      ],
      [
        fmtInt(prevWater),
        fmtInt(waterReading),
        waterVol != null ? `${fmtInt(waterVol)} м³` : "—",
        `${fmtNum(waterSupplyTariff, 2)} / ${fmtNum(waterDrainageTariff, 2)}`,
        fmtMoney(calc.waterTotalAmount),
      ]
    ),
    p(
      `Расчет: (${fmtInt(waterReading)}-${fmtInt(prevWater)})=${fmtInt(waterVol)} м³`,
      { size: 20, before: 80 }
    ),
    p(
      `${fmtInt(waterVol)} х ${fmtNum(waterSupplyTariff, 2)} = ${fmtPlain(calc.waterSupplyAmount)} водоснабжение`,
      { size: 20 }
    ),
    p(
      `${fmtInt(calc.waterDrainageConsumption)} х ${fmtNum(waterDrainageTariff, 2)} = ${fmtPlain(calc.waterDrainageAmount)} водоотведение`,
      { size: 20 }
    ),
    p(`итого ${fmtMoney(calc.waterTotalAmount)} руб`, {
      bold: true,
      size: 20,
      after: 120,
    }),

    // ——— Отопление ———
    sectionTitle("Отопление"),
    makeTable(
      [
        `Показания счетчика на конец ${prevGen}`,
        `Показания счетчика на конец ${currGen}`,
        "Разница",
        "Тариф",
        "Сумма",
      ],
      [
        fmtInt(prevForm?.heating_reading),
        fmtInt(form.heating_reading),
        fmtInt(calc.heatingConsumption),
        `${IC_HEATING_TARIFF_PER_GCAL} (стоимость 1 Гк)`,
        fmtMoney(calc.heatingAmount),
      ]
    ),
    p(
      `Расчет: (${fmtInt(form.heating_reading)}-${fmtInt(prevForm?.heating_reading)})=${fmtInt(calc.heatingConsumption)};`,
      { size: 20, before: 80 }
    ),
    p(
      `${fmtInt(calc.heatingConsumption)}×${IC_HEATING_TARIFF_PER_GCAL}(стоимость 1 Гк) = ${fmtMoney(calc.heatingAmount)} руб,`,
      { size: 20, after: 200 }
    ),

    // ——— ИТОГО ———
    p("ИТОГО", { bold: true, blue: true, size: 28, before: 200, after: 60 }),
    p(`${fmtMoney(calc.totalAmount)} руб,`, { bold: true, size: 24 }),
    ...(calc.perPersonAmount != null
      ? [
          p(`На человека: ${fmtMoney(calc.perPersonAmount)} руб`, {
            bold: true,
            size: 22,
            before: 80,
          }),
        ]
      : []),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Отчет_Исправительный_Центр_${monthName}_${year}.docx`);
}

/** @deprecated используйте exportIcReportWord */
export async function exportAllIcWord(params) {
  await exportIcReportWord(params);
}
