/** Константы для расчёта инвестиционной составляющей (ИЦ) */

export const IC_EE_TRANSFORM_COEF = 50;

/** Дефолтные тарифы воды (редактируются в UI) */
export const IC_WATER_SUPPLY_TARIFF = 51.26;
export const IC_WATER_DRAINAGE_TARIFF = 36.67;

/** Себестоимость 1 Гкал тепла от ГПУ. Лист «Расчёт себестоимости 1 Гкал тепла от ГПУ». */
export const IC_KWH_PER_GCAL = 1163;
/** Теплотворность природного газа, кВт·ч/м³ */
export const IC_GAS_CALORIFIC_KWH_PER_M3 = 9.3;
/** Общий КПД ГПУ: электричество около 40% и утилизация тепла около 47% */
export const IC_GPU_TOTAL_EFFICIENCY = 0.87;
/** Доля эксплуатационных расходов от топливной составляющей. Пока 0. */
export const IC_HEAT_OPEX_SHARE = 0;
