/**
 * Расчёт итогового потребления для линий с учётом фрикуллеров.
 *
 * Для каждой линии в группе:
 *   total = собственное потребление (consumption из meter_readings)
 *           + доля фрикуллера пропорционально выпуску продукции
 *
 * Доля = (выпуск линии / суммарный выпуск всех линий группы) * потребление фрикуллера
 */

import { FRICOOLER_GROUPS } from "./productionConfig";

/**
 * @param {Array} readings - все показания за месяц (из listReadings)
 * @param {Object} production - запись ProductionOutput за месяц (или null)
 * @returns {Array} - массив { fcl, meter_number, own_consumption, fricooler_share, total_consumption }
 */
export function calcLineConsumption(readings, production) {
  const results = [];

  for (const group of FRICOOLER_GROUPS) {
    // Потребление фрикуллера
    const fricoolerReading = readings.find(
      (r) => r.meter_number === group.fricooler_meter_number
    );
    const fricoolerConsumption = fricoolerReading?.consumption ?? 0;

    // Выпуск каждой линии группы
    const lineOutputs = group.lines.map((line) => ({
      ...line,
      output: production ? (production[line.output_key] ?? 0) : 0,
    }));

    const totalOutput = lineOutputs.reduce((sum, l) => sum + l.output, 0);

    for (const line of lineOutputs) {
      const ownReading = readings.find((r) => r.meter_number === line.meter_number);
      let ownConsumption = ownReading?.consumption ?? 0;

      // Вычитаем потребление дочерних счётчиков (если указаны)
      let subtracted = 0;
      if (line.subtract_meters) {
        for (const subMeterNum of line.subtract_meters) {
          const subReading = readings.find((r) => r.meter_number === subMeterNum);
          subtracted += subReading?.consumption ?? 0;
        }
      }
      ownConsumption = ownConsumption - subtracted;

      const share = totalOutput > 0 ? line.output / totalOutput : 0;
      const fricoolerShare = Math.round(share * fricoolerConsumption);
      const totalConsumption = ownConsumption + fricoolerShare;

      results.push({
        fcl: line.fcl,
        meter_number: line.meter_number,
        output_kg: line.output,
        share_pct: Math.round(share * 10000) / 100,
        own_consumption: ownConsumption,
        fricooler_meter_number: group.fricooler_meter_number,
        fricooler_consumption: fricoolerConsumption,
        fricooler_share: fricoolerShare,
        total_consumption: totalConsumption,
      });
    }
  }

  return results;
}