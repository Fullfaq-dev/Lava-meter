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

function prevWaterReading(prevForm) {
  if (!prevForm) return null;
  return prevForm.water_reading ?? prevForm.water_supply_reading ?? prevForm.water_drainage_reading ?? null;
}

export function defaultWaterTariffs() {
  return {
    water_supply_tariff: IC_WATER_SUPPLY_TARIFF,
    water_drainage_tariff: IC_WATER_DRAINAGE_TARIFF,
  };
}

export function buildIcFormFromDb(icData) {
  const tariffs = defaultWaterTariffs();
  if (icData) {
    return {
      ee_reading: icData.ee_reading,
      water_reading: icData.water_supply_reading ?? icData.water_drainage_reading ?? null,
      heating_reading: icData.heating_reading,
      residents_count: icData.residents_count,
      ...tariffs,
    };
  }
  return {
    ee_reading: null,
    water_reading: null,
    heating_reading: null,
    residents_count: null,
    ...tariffs,
  };
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
  const waterConsumption = calcMonthDiff(waterReading, prevWaterReading(prevForm));
  const waterSupplyConsumption = waterConsumption;
  const waterDrainageConsumption = waterConsumption;

  const heatingConsumption = calcMonthDiff(form.heating_reading, prevForm?.heating_reading);

  const waterSupplyTariff = form.water_supply_tariff ?? IC_WATER_SUPPLY_TARIFF;
  const waterDrainageTariff = form.water_drainage_tariff ?? IC_WATER_DRAINAGE_TARIFF;

  const eeTariff = calcEeTariffPerKwh(energyReport);
  const eeAmount =
    eeConsumption != null && eeTariff != null
      ? eeConsumption * IC_EE_TRANSFORM_COEF * eeTariff
      : null;

  const waterSupplyAmount =
    waterSupplyConsumption != null ? waterSupplyConsumption * waterSupplyTariff : null;
  const waterDrainageAmount =
    waterDrainageConsumption != null ? waterDrainageConsumption * waterDrainageTariff : null;
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

  const perPersonAmount =
    totalAmount != null && form.residents_count > 0
      ? totalAmount / form.residents_count
      : null;

  return {
    eeConsumption,
    waterSupplyConsumption,
    waterDrainageConsumption,
    heatingConsumption,
    eeTariff,
    eeTransformCoef: IC_EE_TRANSFORM_COEF,
    waterSupplyTariff,
    waterDrainageTariff,
    eeAmount,
    waterSupplyAmount,
    waterDrainageAmount,
    waterTotalAmount,
    heatingAmount,
    totalAmount,
    perPersonAmount,
  };
}

/** Что ещё нужно заполнить для полного расчёта ИЦ */
export function getIcMissingFields({ form, prevForm, energyReport }) {
  const missing = [];
  if (!prevForm) missing.push("показания за прошлый месяц");
  if (form.ee_reading == null) missing.push("показание ЭЭ");
  if ((form.water_reading ?? form.water_supply_reading) == null) missing.push("показание воды");
  if (form.heating_reading == null) missing.push("показание отопления");
  if (form.residents_count == null) missing.push("число проживающих");
  if (!energyReport) missing.push("вкладка «Потребление ЭЭ»");
  return missing;
}
