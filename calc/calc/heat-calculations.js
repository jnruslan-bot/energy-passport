// ===============================
// ТЕПЛОТЕХНИЧЕСКИЕ РАСЧЁТЫ
// Строгий нормативный модуль
// ===============================


// -------------------------------
// Диапазон ГСОП
// -------------------------------
// Используется для выбора qнорм
export function getGsopRange(gsop) {
  if (!Number.isFinite(gsop)) return null;

  if (gsop < 3000) return 1;
  if (gsop < 4000) return 2;
  if (gsop < 5000) return 3;
  if (gsop < 6000) return 4;
  return 5;
}


// -------------------------------
// Нормативная удельная отопительная характеристика qнорм
// Вт / (м³·°C)
// -------------------------------
export function getQnorm({ city, purpose, qNormTable }) {
  if (!city || !purpose || !qNormTable) return null;
  if (!Number.isFinite(city.gsop)) return null;

  const range = getGsopRange(city.gsop);
  if (!range) return null;

  return qNormTable[purpose]?.[range] ?? null;
}


// -------------------------------
// Фактическая удельная характеристика qфакт
// -------------------------------
// qф = qн × (1 ± отклонение / 100)
export function calculateQFact(qNorm, deviationPercent) {
  if (!Number.isFinite(qNorm)) return null;

  // если отклонение не введено — считаем 0 %
  const dev = Number.isFinite(deviationPercent) ? deviationPercent : 0;

  return qNorm * (1 + dev / 100);
}

// -------------------------------
// Объём здания, м³
// -------------------------------
export function calculateBuildingVolume(area, height) {
  if (!Number.isFinite(area) || !Number.isFinite(height)) return null;
  if (area <= 0 || height <= 0) return null;

  return area * height;
}


// -------------------------------
// Годовой расход тепла на отопление и вентиляцию
// Qот, Гкал / год
// -------------------------------
// НОРМАТИВНАЯ ФОРМУЛА (через ГСОП):
//
// Qот = qф × V × ГСОП × 24 / (1.163 × 10⁹)
//
// где:
// qф   — Вт / (м³·°C)
// V    — м³
// ГСОП — °C·сут
//
export function calculateHeatingEnergy({
  qFact,
  volume,
  gsop
}) {
  if (![qFact, volume, gsop].every(Number.isFinite)) return null;
  if (qFact <= 0 || volume <= 0 || gsop <= 0) return null;

  // 1 Гкал = 1.163 × 10⁹ Вт·ч
  const GJ_TO_WATT_HOUR = 1.163e9;

  return qFact * volume * gsop * 24 / GJ_TO_WATT_HOUR;
}
// -------------------------------
// Годовой расход тепла на ГВС
// Qгвс, Гкал / год
// -------------------------------
export function calculateHotWaterEnergy({
  area,
  peoplePerArea = 10,     // м²/чел
  waterPerPerson = 0.03  // м³/чел·сут
}) {
  if (!Number.isFinite(area) || area <= 0) return null;

  const people = area / peoplePerArea;
  const waterPerDay = people * waterPerPerson;

  // 0.05 Гкал на 1 м³/сут в год
  return waterPerDay * 365 * 0.05;
}
// -------------------------------
// Оценка приведённого сопротивления теплопередаче Rпр
// -------------------------------
export function calculateRpr({
  purpose,
  qNorm,
  qFact,
  rNormTable
}) {
  if (!purpose || !rNormTable[purpose]) return null;
  if (!Number.isFinite(qNorm) || !Number.isFinite(qFact)) return null;
  if (qFact <= 0) return null;

  const k = qNorm / qFact; // коэффициент состояния

  const base = rNormTable[purpose];

  const limits = {
    walls:   { min: 1.2, max: 6.0 },
    roof:    { min: 2.0, max: 8.0 },
    floor:   { min: 1.5, max: 6.0 },
    windows: { min: 0.3, max: 1.2 }
  };

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  return {
    walls:   clamp(base.walls   * k, limits.walls.min,   limits.walls.max),
    roof:    clamp(base.roof    * k, limits.roof.min,    limits.roof.max),
    floor:   clamp(base.floor   * k, limits.floor.min,   limits.floor.max),
    windows: clamp(base.windows * k, limits.windows.min, limits.windows.max)
  };
}
