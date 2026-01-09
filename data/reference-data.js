// ======================================================
// СПРАВОЧНИК НАСЕЛЁННЫХ ПУНКТОВ РЕСПУБЛИКИ КАЗАХСТАН
// Источник:
// СП РК 2.04-01-2017 «Строительная климатология»
//
// Параметры:
// climateZone   — климатическая зона
// gsop          — градусо-сутки отопительного периода, °C·сут
// tDesign       — расчётная температура наружного воздуха, °C
// tAvgHeating   — средняя температура отопительного периода, °C
// ======================================================

export const cities = [
  { name: "Петропавловск", climateZone: "II", gsop: 5400, tDesign: -35, tAvgHeating: -8.1 },
  { name: "Сергеевка",     climateZone: "II", gsop: 5400, tDesign: -35, tAvgHeating: -8.2 },
  { name: "Костанай",      climateZone: "II", gsop: 5200, tDesign: -34, tAvgHeating: -7.6 },
  { name: "Аркалык",       climateZone: "II", gsop: 5500, tDesign: -36, tAvgHeating: -8.7 },
  { name: "Торгай",        climateZone: "II", gsop: 5600, tDesign: -37, tAvgHeating: -9.0 },

  { name: "Астана",        climateZone: "II", gsop: 5200, tDesign: -35, tAvgHeating: -7.6 },
  { name: "Кокшетау",      climateZone: "II", gsop: 5300, tDesign: -36, tAvgHeating: -8.0 },
  { name: "Ерейментау",    climateZone: "II", gsop: 5300, tDesign: -36, tAvgHeating: -8.1 },
  { name: "Степногорск",   climateZone: "II", gsop: 5200, tDesign: -35, tAvgHeating: -7.7 },

  { name: "Павлодар",      climateZone: "II", gsop: 5100, tDesign: -35, tAvgHeating: -7.2 },
  { name: "Экибастуз",     climateZone: "II", gsop: 5200, tDesign: -35, tAvgHeating: -7.6 },
  { name: "Баянауыл",      climateZone: "II", gsop: 5000, tDesign: -34, tAvgHeating: -6.9 },

  { name: "Уральск",       climateZone: "III", gsop: 4300, tDesign: -31, tAvgHeating: -4.5 },
  { name: "Аксай",         climateZone: "III", gsop: 4200, tDesign: -30, tAvgHeating: -4.3 },

  { name: "Атырау",        climateZone: "IV", gsop: 3900, tDesign: -26, tAvgHeating: -2.8 },
  { name: "Кульсары",      climateZone: "IV", gsop: 3800, tDesign: -26, tAvgHeating: -2.6 },

  { name: "Актау",         climateZone: "V", gsop: 3100, tDesign: -18, tAvgHeating:  0.2 },
  { name: "Форт-Шевченко", climateZone: "V", gsop: 3000, tDesign: -17, tAvgHeating:  0.5 },

  { name: "Бейнеу",        climateZone: "IV", gsop: 4100, tDesign: -29, tAvgHeating: -3.6 },

  { name: "Актобе",        climateZone: "III", gsop: 4600, tDesign: -33, tAvgHeating: -5.3 },
  { name: "Шалкар",        climateZone: "III", gsop: 4500, tDesign: -32, tAvgHeating: -5.1 },

  { name: "Балкаш",        climateZone: "III", gsop: 4200, tDesign: -29, tAvgHeating: -4.0 },
  { name: "Жезказган",     climateZone: "III", gsop: 4300, tDesign: -31, tAvgHeating: -4.5 },

  { name: "Караганда",     climateZone: "II", gsop: 5000, tDesign: -34, tAvgHeating: -7.0 },
  { name: "Акадыр",        climateZone: "II", gsop: 5100, tDesign: -35, tAvgHeating: -7.4 },

  { name: "Аягоз",         climateZone: "II", gsop: 4800, tDesign: -33, tAvgHeating: -6.2 },
  { name: "Зайсан",        climateZone: "II", gsop: 4600, tDesign: -32, tAvgHeating: -5.6 },

  { name: "Катон-Карагай", climateZone: "II", gsop: 5400, tDesign: -38, tAvgHeating: -8.8 },

  { name: "Семипалатинск", climateZone: "II", gsop: 4700, tDesign: -33, tAvgHeating: -6.0 },
  { name: "Усть-Каменогорск", climateZone: "II", gsop: 4900, tDesign: -35, tAvgHeating: -6.8 },
  { name: "Шемонаиха",     climateZone: "II", gsop: 5000, tDesign: -36, tAvgHeating: -7.1 },

  { name: "Кызылорда",     climateZone: "IV", gsop: 3500, tDesign: -24, tAvgHeating: -1.9 },
  { name: "Аральск",       climateZone: "IV", gsop: 3700, tDesign: -25, tAvgHeating: -2.4 },

  { name: "Туркестан",     climateZone: "V", gsop: 3000, tDesign: -17, tAvgHeating:  0.6 },
  { name: "Шымкент",       climateZone: "V", gsop: 2900, tDesign: -16, tAvgHeating:  0.9 },

  { name: "Тараз",         climateZone: "IV", gsop: 3400, tDesign: -22, tAvgHeating: -1.4 },
  { name: "Кордай",        climateZone: "IV", gsop: 3600, tDesign: -24, tAvgHeating: -2.0 },
  { name: "Шыганак",       climateZone: "IV", gsop: 3500, tDesign: -23, tAvgHeating: -1.8 },

  { name: "Алматы",        climateZone: "IV", gsop: 4200, tDesign: -23, tAvgHeating: -2.1 },
  { name: "Жаркент",       climateZone: "IV", gsop: 4000, tDesign: -22, tAvgHeating: -1.6 },
  { name: "Талдыкорган",   climateZone: "IV", gsop: 4100, tDesign: -24, tAvgHeating: -2.0 },
  { name: "Баканас",       climateZone: "IV", gsop: 3800, tDesign: -22, tAvgHeating: -1.2 }
];


// ======================================================
// НОРМАТИВНАЯ УДЕЛЬНАЯ ОТОПИТЕЛЬНАЯ ХАРАКТЕРИСТИКА
// qнорм, Вт / (м³·°C)
//
// Диапазоны ГСОП, °C·сут:
// 1 — < 3000
// 2 — 3000–3999
// 3 — 4000–4999
// 4 — 5000–5999
// 5 — ≥ 6000
//
// Источники:
// СП РК 2.04-107-2022
// СН РК 2.04-07-2022
// Практика энергоаудита РК
// ======================================================

export const qNormTable = {
  "Производственное": {
    1: 0.40,
    2: 0.45,
    3: 0.50,
    4: 0.55,
    5: 0.60
  },

  "Складское": {
    1: 0.30,
    2: 0.35,
    3: 0.40,
    4: 0.45,
    5: 0.50
  },

  "Административно-бытовое": {
    1: 0.32,
    2: 0.36,
    3: 0.40,
    4: 0.44,
    5: 0.48
  },

  "Вспомогательное": {
    1: 0.38,
    2: 0.42,
    3: 0.46,
    4: 0.50,
    5: 0.55
  }
};

// Примечание:
// Значения qнорм используются для автоматизированной оценки
// энергоэффективности зданий.
// При детальном проектном расчёте допускается уточнение
// по методике теплотехнического расчёта ограждающих конструкций.
// ============================================
// НОРМАТИВНЫЕ СОПРОТИВЛЕНИЯ ТЕПЛОПЕРЕДАЧЕ
// Rнорм, м²·°C/Вт (ориентировочно, СП РК)
// ============================================

export const rNormTable = {
  "Административно-бытовое": {
    walls: 3.8,
    roof: 5.8,
    floor: 4.2,
    windows: 0.75
  },

  "Производственное": {
    walls: 3.2,
    roof: 4.8,
    floor: 3.5,
    windows: 0.65
  },

  "Складское": {
    walls: 2.8,
    roof: 4.2,
    floor: 3.0,
    windows: 0.55
  },

  "Вспомогательное": {
    walls: 3.0,
    roof: 4.5,
    floor: 3.2,
    windows: 0.60
  }
};
