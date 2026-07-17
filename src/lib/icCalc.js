import { MONTHS } from "./meterConfig";
import {
  IC_EE_TRANSFORM_COEF,
  IC_WATER_SUPPLY_TARIFF,
  IC_WATER_DRAINAGE_TARIFF,
  IC_HEATING_TARIFF_PER_GCAL,
} from "./icConfig";

export function getPrevMonth(year, monthName) {
  const idx = MONTHS.indexOf(monthName);
  if (idx < 0) return null;
  if (idx === 0) return { year: year - 1, month: MONTHS[11] };
  return { year, month: MONTHS[idx - 1] };
}

export function calcMonthDiff(current, previous) {
  if (current == null || previous == null || isNaN(current) || isNaN(previous)) return null;
  const diff = Number(current) - Number(previous);
  return diff >= 0 ? diff : null;
}

/** Фактическая стоимость 1 кВт·ч из вкладки «Потребление ЭЭ» */
export function calcEeTariffPerKwh(energyReport) {
  if (!energyReport) return null;
  const totalKwh =
    (energyReport.vazma_active_kwh ?? 0) + (energyReport.ec_produced_kwh ?? 0);
  if (totalKwh <= 0) return null;
  const totalCost =
    (energyReport.vazma_active_rosseti_rub ?? 0) +
    (energyReport.vazma_active_atom_rub ?? 0) +
    (energyReport.ec_gas_payment_rub ?? 0);
  return totalCost / totalKwh;
}

export function buildIcCalculation({ form, prevForm, energyReport }) {
  const eeConsumption = calcMonthDiff(form.ee_reading, prevForm?.ee_reading);

  const waterReading = form.water_reading ?? form.water_supply_reading;
  const prevWaterReading = prevForm?.water_reading ?? prevForm?.water_supply_reading;
  const waterConsumption = calcMonthDiff(waterReading, prevWaterReading);
  const waterSupplyConsumption = waterConsumption;
  const waterDrainageConsumption = waterConsumption;

  const heatingConsumption = calcMonthDiff(form.heating_reading, prevForm?.heating_reading);

  const eeTariff = calcEeTariffPerKwh(energyReport);
  const eeAmount =
    eeConsumption != null && eeTariff != null
      ? eeConsumption * IC_EE_TRANSFORM_COEF * eeTariff
      : null;

  const waterSupplyAmount =
    waterSupplyConsumption != null
      ? waterSupplyConsumption * IC_WATER_SUPPLY_TARIFF
      : null;
  const waterDrainageAmount =
    waterDrainageConsumption != null
      ? waterDrainageConsumption * IC_WATER_DRAINAGE_TARIFF
      : null;
  const waterTotalAmount =
    waterSupplyAmount != null && waterDrainageAmount != null
      ? waterSupplyAmount + waterDrainageAmount
      : null;

  const heatingAmount =
    heatingConsumption != null
      ? heatingConsumption * IC_HEATING_TARIFF_PER_GCAL
      : null;

  const totalAmount =
    [eeAmount, waterTotalAmount, heatingAmount].every((v) => v != null)
      ? eeAmount + waterTotalAmount + heatingAmount
      : null;

  return {
    eeConsumption,
    waterSupplyConsumption,
    waterDrainageConsumption,
    heatingConsumption,
    eeTariff,
    eeTransformCoef: IC_EE_TRANSFORM_COEF,
    eeAmount,
    waterSupplyAmount,
    waterDrainageAmount,
    waterTotalAmount,
    heatingAmount,
    totalAmount,
  };
}
