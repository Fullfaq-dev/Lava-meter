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
} from "docx";
import { saveAs } from "file-saver";
import { MONTHS_GENITIVE } from "./meterConfig";
import { getPrevMonth } from "./icCalc";
import {
  IC_EE_TRANSFORM_COEF,
  IC_WATER_SUPPLY_TARIFF,
  IC_WATER_DRAINAGE_TARIFF,
  IC_HEATING_TARIFF_PER_GCAL,
} from "./icConfig";

const fmt = (v, digits = 2) =>
  v != null && !isNaN(v)
    ? Number(v).toLocaleString("ru-RU", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "—";

const fmtMoney = (v) =>
  v != null && !isNaN(v)
    ? Number(v).toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";

const border = {
  top: { style: BorderStyle.SINGLE, size: 1 },
  bottom: { style: BorderStyle.SINGLE, size: 1 },
  left: { style: BorderStyle.SINGLE, size: 1 },
  right: { style: BorderStyle.SINGLE, size: 1 },
};

function cell(text, opts = {}) {
  const { bold = false, align = AlignmentType.LEFT, colspan = 1 } = opts;
  return new TableCell({
    borders: border,
    columnSpan: colspan,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(text), bold })],
      }),
    ],
  });
}

function headerRow(cells) {
  return new TableRow({
    children: cells.map((t) => cell(t, { bold: true, align: AlignmentType.CENTER })),
  });
}

function dataRow(cells) {
  return new TableRow({
    children: cells.map((t, i) =>
      cell(t, { align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER })
    ),
  });
}

function sectionTable(title, headerCells, dataCells, calcLines, totalLabel, totalValue) {
  const rows = [
    new TableRow({
      children: [cell(title, { bold: true, colspan: headerCells.length })],
    }),
    headerRow(headerCells),
    dataRow(dataCells),
  ];

  calcLines.forEach((line) => {
    rows.push(
      new TableRow({
        children: [cell(line, { colspan: headerCells.length })],
      })
    );
  });

  rows.push(
    new TableRow({
      children: [
        cell(totalLabel, { bold: true, colspan: headerCells.length - 1 }),
        cell(totalValue, { bold: true, align: AlignmentType.CENTER }),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function monthGenitive(monthName) {
  const idx = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ].indexOf(monthName);
  return idx >= 0 ? MONTHS_GENITIVE[idx] : monthName;
}

export async function exportIcReportWord({
  monthName,
  year,
  form,
  prevForm,
  calc,
}) {
  const prev = getPrevMonth(year, monthName);
  const prevMonthGen = prev ? monthGenitive(prev.month) : "—";
  const currMonthGen = monthGenitive(monthName);

  const eeKwh =
    calc.eeConsumption != null ? calc.eeConsumption * IC_EE_TRANSFORM_COEF : null;

  const waterReading = form.water_reading ?? form.water_supply_reading;
  const prevWater = prevForm?.water_reading ?? prevForm?.water_supply_reading;

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Отчет по коммунальным услугам", bold: true, size: 28 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Исправительный центр", size: 24 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: `${monthName} ${year} г.`, size: 24 })],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: `Количество проживающих: ${form.residents_count ?? "—"} человек`,
              }),
            ],
          }),

          sectionTable(
            "Электроэнергия",
            [
              `Показания счетчика на конец ${prevMonthGen}`,
              `Показания счетчика на конец ${currMonthGen}`,
              "Разница",
              "Тариф",
              "Сумма",
            ],
            [
              fmt(prevForm?.ee_reading, 0),
              fmt(form.ee_reading, 0),
              fmt(calc.eeConsumption, 0),
              calc.eeTariff != null
                ? `${fmt(calc.eeTariff, 2)} (тариф за ${monthName.toLowerCase()})`
                : "—",
              fmtMoney(calc.eeAmount),
            ],
            [
              `Расчет: (${fmt(form.ee_reading, 0)}-${fmt(prevForm?.ee_reading, 0)})=${fmt(calc.eeConsumption, 0)}; ${fmt(calc.eeConsumption, 0)}×${IC_EE_TRANSFORM_COEF} (коэффициент трансформации) = ${fmt(eeKwh, 0)} кВт·ч; ${fmt(eeKwh, 0)}×${fmt(calc.eeTariff, 2)} (тариф за ${monthName.toLowerCase()}) = ${fmtMoney(calc.eeAmount)} руб`,
            ],
            "",
            ""
          ),

          new Paragraph({ spacing: { before: 300 } }),

          sectionTable(
            "Вода",
            [
              `Показания счетчика на конец ${prevMonthGen}`,
              `Показания счетчика на конец ${currMonthGen}`,
              "Разница",
              "Тариф",
              "Сумма",
            ],
            [
              fmt(prevWater, 0),
              fmt(waterReading, 0),
              calc.waterSupplyConsumption != null
                ? `${fmt(calc.waterSupplyConsumption, 0)} м³`
                : "—",
              `${IC_WATER_SUPPLY_TARIFF} / ${IC_WATER_DRAINAGE_TARIFF}`,
              fmtMoney(calc.waterTotalAmount),
            ],
            [
              `Расчет: (${fmt(waterReading, 0)}-${fmt(prevWater, 0)})=${fmt(calc.waterSupplyConsumption, 0)} м³`,
              `${fmt(calc.waterSupplyConsumption, 0)} х ${IC_WATER_SUPPLY_TARIFF} = ${fmtMoney(calc.waterSupplyAmount)} водоснабжение`,
              `${fmt(calc.waterDrainageConsumption, 0)} х ${IC_WATER_DRAINAGE_TARIFF} = ${fmtMoney(calc.waterDrainageAmount)} водоотведение`,
              `итого ${fmtMoney(calc.waterTotalAmount)} руб`,
            ],
            "",
            ""
          ),

          new Paragraph({ spacing: { before: 300 } }),

          sectionTable(
            "Отопление",
            [
              `Показания счетчика на конец ${prevMonthGen}`,
              `Показания счетчика на конец ${currMonthGen}`,
              "Разница",
              "Тариф",
              "Сумма",
            ],
            [
              fmt(prevForm?.heating_reading, 0),
              fmt(form.heating_reading, 0),
              fmt(calc.heatingConsumption, 0),
              `${IC_HEATING_TARIFF_PER_GCAL} (стоимость 1 Гк)`,
              fmtMoney(calc.heatingAmount),
            ],
            [
              `Расчет: (${fmt(form.heating_reading, 0)}-${fmt(prevForm?.heating_reading, 0)})=${fmt(calc.heatingConsumption, 0)}; ${fmt(calc.heatingConsumption, 0)}×${IC_HEATING_TARIFF_PER_GCAL} (стоимость 1 Гк) = ${fmtMoney(calc.heatingAmount)} руб`,
            ],
            "",
            ""
          ),

          new Paragraph({ spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "ИТОГО ", bold: true, size: 24 }),
              new TextRun({ text: `${fmtMoney(calc.totalAmount)} руб`, bold: true, size: 24 }),
            ],
          }),
        ],
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
