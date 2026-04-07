import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { METERS } from './meterConfig';

export const exportEnergyReportToExcel = async ({
  monthName,
  year,
  form,
  lineCalc,
  readings,
  production,
  vazmaCostPerKwh
}) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Ведомость', {
    pageSetup: { paperSize: 9, orientation: 'landscape' }
  });

  // --- Styles ---
  const borderAll = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  const borderMedium = {
    top: { style: 'medium' },
    left: { style: 'medium' },
    bottom: { style: 'medium' },
    right: { style: 'medium' }
  };

  const fontBold = { name: 'Times New Roman', size: 12, bold: true };
  const fontNormal = { name: 'Times New Roman', size: 12 };
  const fontTitle = { name: 'Times New Roman', size: 14, bold: true };

  const alignCenter = { vertical: 'middle', horizontal: 'center', wrapText: true };
  const alignLeft = { vertical: 'middle', horizontal: 'left', wrapText: true };
  const alignRight = { vertical: 'middle', horizontal: 'right', wrapText: true };

  const fillGreen = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC4D79B' } // Light green similar to the image
  };

  // --- Column Widths ---
  sheet.columns = [
    { width: 25 }, // A: Наименование
    { width: 18 }, // B: Потребление
    { width: 18 }, // C: Всего в т.ч. брак / Оплата Россети
    { width: 15 }, // D: Брак / Оплата Атом
    { width: 22 }, // E: Товарная продукция / Факт стоимость
    { width: 18 }, // F: Норма от всего
    { width: 18 }, // G: Норма от товара
  ];

  // --- Top Section ---
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ';
  sheet.getCell('A1').font = fontTitle;
  sheet.getCell('A1').alignment = alignCenter;

  sheet.mergeCells('A2:G2');
  sheet.getCell('A2').value = '«Лава»';
  sheet.getCell('A2').font = fontTitle;
  sheet.getCell('A2').alignment = alignCenter;

  sheet.mergeCells('A3:G3');
  sheet.getCell('A3').value = 'Ведомость потребления электрической энергии';
  sheet.getCell('A3').font = fontNormal;
  sheet.getCell('A3').alignment = alignCenter;

  sheet.mergeCells('A4:G4');
  sheet.getCell('A4').value = `${monthName}-${year.toString().slice(-2)}`;
  sheet.getCell('A4').font = fontBold;
  sheet.getCell('A4').alignment = alignCenter;

  sheet.mergeCells('A5:G5');
  sheet.getCell('A5').value = 'Источник электроснабжения: п/ст. Вязьма – 2 (СН1) (ВН)';
  sheet.getCell('A5').font = fontBold;
  sheet.getCell('A5').alignment = alignCenter;

  // --- Top Table Header ---
  sheet.getRow(6).height = 60;
  
  sheet.getCell('A6').value = 'Данные АСКУЭ';
  sheet.getCell('B6').value = 'Потребление\nот ПС Вязьма-2,\nкВтч.';
  sheet.getCell('C6').value = 'Оплата\n«Россети Центр»-«Смоленск-энерго»,\nруб.';
  sheet.mergeCells('D6:E6');
  sheet.getCell('D6').value = 'Оплата,\nАтомЭнергоСбыт, руб';
  sheet.mergeCells('F6:G6');
  sheet.getCell('F6').value = 'Фактическая стоимость\n1 кВтч., руб./кВтч.';

  ['A6', 'B6', 'C6', 'D6', 'F6'].forEach(cell => {
    sheet.getCell(cell).font = fontBold;
    sheet.getCell(cell).alignment = alignCenter;
    sheet.getCell(cell).border = borderMedium;
  });
  sheet.getCell('E6').border = borderMedium;
  sheet.getCell('G6').border = borderMedium;

  // --- Top Table Data ---
  sheet.getRow(7).height = 30;
  sheet.getCell('A7').value = 'Активная энергия';
  sheet.getCell('A7').font = fontBold;
  sheet.getCell('A7').alignment = alignCenter;
  sheet.getCell('A7').border = borderMedium;

  sheet.getCell('B7').value = form.vazma_active_kwh || 0;
  sheet.getCell('B7').fill = fillGreen;
  sheet.getCell('B7').font = fontBold;
  sheet.getCell('B7').alignment = alignCenter;
  sheet.getCell('B7').border = borderMedium;

  sheet.getCell('C7').value = form.vazma_active_rosseti_rub || 0;
  sheet.getCell('C7').fill = fillGreen;
  sheet.getCell('C7').font = fontBold;
  sheet.getCell('C7').alignment = alignCenter;
  sheet.getCell('C7').border = borderMedium;
  sheet.getCell('C7').numFmt = '#,##0.00 ₽';

  sheet.mergeCells('D7:E7');
  sheet.getCell('D7').value = form.vazma_active_atom_rub || 0;
  sheet.getCell('D7').fill = fillGreen;
  sheet.getCell('D7').font = fontBold;
  sheet.getCell('D7').alignment = alignCenter;
  sheet.getCell('D7').border = borderMedium;
  sheet.getCell('D7').numFmt = '#,##0.00 ₽';
  sheet.getCell('E7').border = borderMedium;

  sheet.mergeCells('F7:G7');
  sheet.getCell('F7').value = vazmaCostPerKwh || 0;
  sheet.getCell('F7').fill = fillGreen;
  sheet.getCell('F7').font = fontBold;
  sheet.getCell('F7').alignment = alignCenter;
  sheet.getCell('F7').border = borderMedium;
  sheet.getCell('F7').numFmt = '#,##0.00 ₽';
  sheet.getCell('G7').border = borderMedium;

  sheet.getRow(8).height = 30;
  sheet.getCell('A8').value = 'Реактивная энергия';
  sheet.getCell('A8').font = fontBold;
  sheet.getCell('A8').alignment = alignCenter;
  sheet.getCell('A8').border = borderMedium;

  sheet.getCell('B8').value = form.vazma_reactive_kwh || 0;
  sheet.getCell('B8').fill = fillGreen;
  sheet.getCell('B8').font = fontBold;
  sheet.getCell('B8').alignment = alignCenter;
  sheet.getCell('B8').border = borderMedium;

  sheet.getCell('C8').value = form.vazma_reactive_rosseti_rub || 0;
  sheet.getCell('C8').fill = fillGreen;
  sheet.getCell('C8').font = fontBold;
  sheet.getCell('C8').alignment = alignCenter;
  sheet.getCell('C8').border = borderMedium;
  sheet.getCell('C8').numFmt = '#,##0.00 ₽';

  // Empty cells for reactive
  sheet.mergeCells('D8:E8');
  sheet.getCell('D8').border = borderMedium;
  sheet.getCell('E8').border = borderMedium;
  sheet.mergeCells('F8:G8');
  sheet.getCell('F8').border = borderMedium;
  sheet.getCell('G8').border = borderMedium;

  // --- Spacer ---
  sheet.getRow(9).height = 15;

  // --- Bottom Table Header ---
  sheet.getRow(10).height = 20;
  sheet.mergeCells('A10:A12');
  sheet.getCell('A10').value = 'Наименование\nтехнологического\nоборудования';
  
  sheet.mergeCells('B10:B12');
  sheet.getCell('B10').value = 'Потребление\nэлектроэнергии\nна производстве,\nкВтч.';

  sheet.mergeCells('C10:G10');
  sheet.getCell('C10').value = 'Производственные показатели';

  sheet.getRow(11).height = 30;
  sheet.mergeCells('C11:E11');
  sheet.getCell('C11').value = 'Выпуск продукции, кг';

  sheet.mergeCells('F11:F12');
  sheet.getCell('F11').value = 'Факт. Норма\nпотребл., кВтч/кг от\n«всего»';

  sheet.mergeCells('G11:G12');
  sheet.getCell('G11').value = 'Факт. Норма\nпотребл.\nкВтч/кг от\n«товара»';

  sheet.getRow(12).height = 30;
  sheet.getCell('C12').value = 'Всего в т.ч.\nбрак';
  sheet.getCell('D12').value = 'Брак';
  sheet.getCell('E12').value = 'Товарная продукция\n«чистый выпуск»';

  // Apply styles to bottom header
  for (let r = 10; r <= 12; r++) {
    for (let c = 1; c <= 7; c++) {
      const cell = sheet.getCell(r, c);
      cell.font = fontBold;
      cell.alignment = alignCenter;
      cell.border = borderMedium;
    }
  }

  // --- Bottom Table Data ---
  let currentRow = 13;
  let totalConsumption = 0;

  const addRow = (name, consumption, totalProd, defectProd, goodProd, normTotal, normGood, isGreen = false) => {
    const row = sheet.getRow(currentRow);
    row.height = 20;
    
    sheet.getCell(`A${currentRow}`).value = name;
    sheet.getCell(`A${currentRow}`).font = fontNormal;
    sheet.getCell(`A${currentRow}`).alignment = alignCenter;
    sheet.getCell(`A${currentRow}`).border = borderMedium;

    sheet.getCell(`B${currentRow}`).value = consumption;
    sheet.getCell(`B${currentRow}`).font = fontNormal;
    sheet.getCell(`B${currentRow}`).alignment = alignCenter;
    sheet.getCell(`B${currentRow}`).border = borderMedium;
    if (isGreen) sheet.getCell(`B${currentRow}`).fill = fillGreen;

    sheet.getCell(`C${currentRow}`).value = totalProd !== null ? totalProd : '-';
    sheet.getCell(`C${currentRow}`).font = fontNormal;
    sheet.getCell(`C${currentRow}`).alignment = alignCenter;
    sheet.getCell(`C${currentRow}`).border = borderMedium;
    if (isGreen && totalProd !== null) sheet.getCell(`C${currentRow}`).fill = fillGreen;

    sheet.getCell(`D${currentRow}`).value = defectProd !== null ? defectProd : '-';
    sheet.getCell(`D${currentRow}`).font = fontNormal;
    sheet.getCell(`D${currentRow}`).alignment = alignCenter;
    sheet.getCell(`D${currentRow}`).border = borderMedium;
    if (isGreen && defectProd !== null) sheet.getCell(`D${currentRow}`).fill = fillGreen;

    sheet.getCell(`E${currentRow}`).value = goodProd !== null ? goodProd : '-';
    sheet.getCell(`E${currentRow}`).font = fontNormal;
    sheet.getCell(`E${currentRow}`).alignment = alignCenter;
    sheet.getCell(`E${currentRow}`).border = borderMedium;
    if (isGreen && goodProd !== null) sheet.getCell(`E${currentRow}`).fill = fillGreen;

    sheet.getCell(`F${currentRow}`).value = normTotal !== null ? normTotal : '-';
    sheet.getCell(`F${currentRow}`).font = fontNormal;
    sheet.getCell(`F${currentRow}`).alignment = alignCenter;
    sheet.getCell(`F${currentRow}`).border = borderMedium;
    if (normTotal !== null) sheet.getCell(`F${currentRow}`).numFmt = '0.000';

    sheet.getCell(`G${currentRow}`).value = normGood !== null ? normGood : '-';
    sheet.getCell(`G${currentRow}`).font = fontNormal;
    sheet.getCell(`G${currentRow}`).alignment = alignCenter;
    sheet.getCell(`G${currentRow}`).border = borderMedium;
    if (normGood !== null) sheet.getCell(`G${currentRow}`).numFmt = '0.000';

    if (typeof consumption === 'number') {
      totalConsumption += consumption;
    }

    currentRow++;
  };

  // Other equipment
  const getReading = (meterNum) => {
    const r = readings.find(r => r.meter_number === meterNum);
    return r ? r.consumption || 0 : 0;
  };

  const getProd = (key) => {
    return production ? production[key] || 0 : 0;
  };

  // FCL Lines
  const fclLines = [1, 3, 4, 5, 6, 7, 8, 9, 10];
  fclLines.forEach(num => {
    const lineName = `FCL-${num}`;
    const calcRow = lineCalc.find(lc => lc.fcl === lineName);
    
    let consumption = 0;
    let totalProd = 0;
    let defectProd = 0;
    let goodProd = 0;
    let normTotal = 0;
    let normGood = 0;

    if (calcRow) {
      consumption = calcRow.total_consumption || 0;
      totalProd = calcRow.output_kg || 0;
    } else {
      // If not in lineCalc (e.g. FCL-9, FCL-10), try to get from production directly
      totalProd = getProd(`fcl${num}`);
    }

    // Assuming defect is 0 for now as requested, but setting up the structure
    defectProd = 0;
    goodProd = totalProd - defectProd;
    normTotal = totalProd > 0 ? consumption / totalProd : 0;
    normGood = goodProd > 0 ? consumption / goodProd : 0;

    addRow(lineName, consumption, totalProd, defectProd, goodProd, normTotal, normGood, true);
  });

  // Участок перемотки (Сч.8)
  const peremotkaCons = getReading(7);
  const peremotkaProd = getProd('peremotka');
  const peremotkaDefect = 0; // Assuming we might have defect, if not 0
  const peremotkaGood = peremotkaProd - peremotkaDefect;
  const peremotkaNormTotal = peremotkaProd > 0 ? peremotkaCons / peremotkaProd : 0;
  const peremotkaNormGood = peremotkaGood > 0 ? peremotkaCons / peremotkaGood : 0;
  addRow('Участок перемотки', peremotkaCons, peremotkaProd || 0, peremotkaDefect, peremotkaGood || 0, peremotkaNormTotal, peremotkaNormGood, true);

  // Гранулятор-1 (Сч.21)
  const gran1Cons = getReading(20);
  const gran1Prod = getProd('granulyaciya1');
  const gran1NormGood = gran1Prod > 0 ? gran1Cons / gran1Prod : 0;
  addRow('Гранулятор-1', gran1Cons, gran1Prod || 0, '-', gran1Prod || 0, '-', gran1NormGood, true);

  // Гранулятор-2 (Сч.22)
  const gran2Cons = getReading(21);
  const gran2Prod = getProd('granulyaciya2');
  const gran2NormGood = gran2Prod > 0 ? gran2Cons / gran2Prod : 0;
  addRow('Гранулятор-2', gran2Cons, gran2Prod || 0, '-', gran2Prod || 0, '-', gran2NormGood, true);

  // Шрёдер (Сч.19)
  const shrederCons = getReading(18);
  addRow('Шрёдер', shrederCons, '-', '-', '-', '-', 0, true);

  // Участок загрузки сырья (Сч.14)
  const zagruzkaCons = getReading(13);
  addRow('Участок загрузки сырья', zagruzkaCons, '-', '-', '-', '-', '-', true);

  // «Интерполихим» (Сч.18)
  const interpolihimCons = getReading(17);
  addRow('«Интерполихим»', interpolihimCons, '-', '-', '-', '-', '-', true);

  // Total Row
  sheet.getRow(currentRow).height = 30;
  sheet.getCell(`A${currentRow}`).value = 'Всего потреблено на\nпроизводстве:';
  sheet.getCell(`A${currentRow}`).font = fontBold;
  sheet.getCell(`A${currentRow}`).alignment = alignCenter;
  sheet.getCell(`A${currentRow}`).border = borderMedium;

  sheet.getCell(`B${currentRow}`).value = totalConsumption;
  sheet.getCell(`B${currentRow}`).font = fontBold;
  sheet.getCell(`B${currentRow}`).alignment = alignCenter;
  sheet.getCell(`B${currentRow}`).border = borderMedium;
  sheet.getCell(`B${currentRow}`).fill = fillGreen;

  ['C', 'D', 'E', 'F', 'G'].forEach(col => {
    sheet.getCell(`${col}${currentRow}`).value = '-';
    sheet.getCell(`${col}${currentRow}`).font = fontNormal;
    sheet.getCell(`${col}${currentRow}`).alignment = alignCenter;
    sheet.getCell(`${col}${currentRow}`).border = borderMedium;
  });

  // Generate and save file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Ведомость_потребления_ЭЭ_${monthName}_${year}.xlsx`);
};
