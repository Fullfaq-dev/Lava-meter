/** Нормализует значение для сравнения dirty-состояния */
function normalizeValue(v) {
  if (v === "" || v === undefined) return null;
  if (typeof v === "number" && Number.isNaN(v)) return null;
  return v;
}

/**
 * Сравнивает два объекта формы (только указанные ключи или все ключи из обоих).
 */
export function isFormDirty(current, saved, keys = null) {
  const keyList =
    keys ||
    Array.from(
      new Set([...Object.keys(current || {}), ...Object.keys(saved || {})])
    );

  return keyList.some((key) => {
    const a = normalizeValue(current?.[key]);
    const b = normalizeValue(saved?.[key]);
    if (a === b) return false;
    // числа из инпута иногда приходят строкой
    if (a != null && b != null && Number(a) === Number(b) && !Number.isNaN(Number(a))) {
      return false;
    }
    return true;
  });
}

export function snapshotForm(form, keys = null) {
  const src = form || {};
  const keyList = keys || Object.keys(src);
  const out = {};
  keyList.forEach((key) => {
    out[key] = normalizeValue(src[key]);
  });
  return out;
}
