// ter-consumption.js
import { TER_REFERENCE } from "./ter-reference.js";

const STORAGE_KEY = "ter_matrix_v2";

// =====================
// DOM
// =====================
const startYearEl = document.getElementById("startYear");
const endYearEl = document.getElementById("endYear");
const applyYearsBtn = document.getElementById("applyYearsBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const clearBtn = document.getElementById("clearBtn");
const addTerBtn = document.getElementById("addTerBtn");

const thead = document.getElementById("terThead");
const tbody = document.getElementById("terTbody");

const chartsWrap = document.getElementById("chartsWrap");
const yearlyWrap = document.getElementById("yearlyWrap"); // ✅ из нового HTML

const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const downloadXlsxBtn = document.getElementById("downloadXlsxBtn");
const downloadChartsPngBtn = document.getElementById("downloadChartsPngBtn");

// =====================
// DATA
// =====================
const TER_MAP = new Map(TER_REFERENCE.map(r => [r.name, r]));

// 4 строки на каждый ТЭР — как в Excel
const ROW_TYPES = [
  { key: "natural", label: "В натуральном выражении", editable: true },
  { key: "tut",     label: "В условном топливе",      editable: false }, // авто
  { key: "money",   label: "В денежном выражении",    editable: true },
  { key: "cost",    label: "Себестоимость",           editable: false }, // авто
];

// “Блок” = один выбранный ТЭР со значениями по годам
let blocks = [
  { resourceName: "Электроэнергия", values: {} },
  { resourceName: "Теплоэнергия", values: {} },
  { resourceName: "Газ природный", values: {} },
];

// =====================
// CHARTS
// =====================
const chartInstances = new Map();
let chartsTimer = null;

// =====================
// utils
// =====================
function toNum(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const s = String(v).replace(/\s+/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) {
  return (Math.round(n * 100) / 100).toLocaleString("ru-RU");
}

function fmt2(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return (Math.round(n * 100) / 100).toLocaleString("ru-RU");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getYears() {
  const s = Number(startYearEl?.value);
  const e = Number(endYearEl?.value);
  if (!Number.isFinite(s) || !Number.isFinite(e) || s > e) return [];
  const years = [];
  for (let y = s; y <= e; y++) years.push(y);
  return years;
}

function getRef(block) {
  return TER_MAP.get(block.resourceName);
}
function getUnit(block) {
  return getRef(block)?.unit || "";
}
function getK(block) {
  return getRef(block)?.k || 0;
}
function costUnitFrom(unit) {
  return unit ? `тг/${unit}` : "тг/ед";
}

// ✅ отличаем "пусто" от "0"
function getCellValueOrNull(block, year, key) {
  const raw = block?.values?.[year]?.[key];
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = toNum(raw);
  return Number.isFinite(n) ? n : null;
}

function ensureBlockYears(block, years) {
  block.values ||= {};
  years.forEach(y => {
    block.values[y] ||= { natural: "", money: "" };
  });
}

function topN(items, n = 3) {
  return [...items].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, n);
}

function percent(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return part / total * 100;
}

// Палитра (стабильно по индексу)
function pieColors(count) {
  const bg = [];
  const br = [];
  for (let i = 0; i < count; i++) {
    const hue = Math.round((i * 360) / Math.max(1, count));
    bg.push(`hsla(${hue}, 70%, 55%, 0.65)`);
    br.push(`hsla(${hue}, 70%, 35%, 1)`);
  }
  return { bg, br };
}

// =====================
// table build
// =====================
function buildHead(years) {
  thead.innerHTML = `
    <tr>
      <th class="col-no">№</th>
      <th class="col-name">Наименование ТЭР</th>
      <th class="col-type">Потребление</th>
      <th class="col-unit">Ед.измерения</th>
      ${years.map(y => `<th>${y}</th>`).join("")}
      <th>Удалить</th>
    </tr>
  `;
}

function makeTerSelect(selectedName, blockIndex) {
  const options = TER_REFERENCE
    .map(r => `<option value="${escapeHtml(r.name)}" ${r.name === selectedName ? "selected" : ""}>${escapeHtml(r.name)}</option>`)
    .join("");

  return `
    <select data-ter-select="${blockIndex}" style="width:100%; max-width:420px;">
      <option value="">— выбери ТЭР —</option>
      ${options}
    </select>
  `;
}

function inputCell({ bi, rowKey, year, value, editable }) {
  const ro = editable ? "" : "readonly";
  const cls = editable ? "" : "readonly";
  return `
    <td class="yearCell">
      <input
        class="${cls}"
        type="text"
        inputmode="decimal"
        data-bi="${bi}"
        data-row="${rowKey}"
        data-year="${year}"
        value="${escapeHtml(value ?? "")}"
        ${ro}
      />
    </td>
  `;
}

function buildBody(years) {
  tbody.innerHTML = "";

  blocks.forEach((block, bi) => {
    ensureBlockYears(block, years);
    const unit = getUnit(block);

    ROW_TYPES.forEach((rt, rowIdx) => {
      const tr = document.createElement("tr");

      if (rowIdx === 0) {
        tr.innerHTML += `<td class="col-no" rowspan="${ROW_TYPES.length}">${bi + 1}</td>`;
        tr.innerHTML += `<td class="col-name" rowspan="${ROW_TYPES.length}">${makeTerSelect(block.resourceName, bi)}</td>`;
      }

      tr.innerHTML += `<td class="col-type">${rt.label}</td>`;

      let unitText = "";
      if (rt.key === "natural") unitText = unit;
      if (rt.key === "tut") unitText = "т.у.т";
      if (rt.key === "money") unitText = "тг.";
      if (rt.key === "cost") unitText = costUnitFrom(unit);

      tr.innerHTML += `<td class="col-unit" data-unit="${bi}:${rt.key}">${unitText}</td>`;

      years.forEach(y => {
        let v = "";
        if (rt.key === "natural") v = block.values[y]?.natural ?? "";
        if (rt.key === "money") v = block.values[y]?.money ?? "";
        tr.innerHTML += inputCell({ bi, rowKey: rt.key, year: y, value: v, editable: rt.editable });
      });

      if (rowIdx === 0) {
        tr.innerHTML += `
          <td rowspan="${ROW_TYPES.length}">
            <button class="btn" type="button" data-del-block="${bi}">✕</button>
          </td>
        `;
      }

      tbody.appendChild(tr);
    });
  });

  // ===== ИТОГО (3 строки) =====
  const TOTAL_ROWS = [
    { key: "tut",   label: "В условном топливе", unit: "т.у.т" },
    { key: "money", label: "В денежном выражении", unit: "тг." },
    { key: "cost",  label: "Себестоимость", unit: "тг/т.у.т" },
  ];

  TOTAL_ROWS.forEach((trt, idx) => {
    const tr = document.createElement("tr");

    if (idx === 0) {
      tr.innerHTML += `<td class="col-no" rowspan="${TOTAL_ROWS.length}"></td>`;
      tr.innerHTML += `<td class="col-name" rowspan="${TOTAL_ROWS.length}"><b>ИТОГО</b></td>`;
    }

    tr.innerHTML += `<td class="col-type"><b>${trt.label}</b></td>`;
    tr.innerHTML += `<td class="col-unit"><b>${trt.unit}</b></td>`;

    years.forEach(y => {
      tr.innerHTML += `
        <td class="yearCell">
          <input class="readonly" type="text" readonly data-total="${trt.key}" data-year="${y}" />
        </td>
      `;
    });

    tr.innerHTML += `<td></td>`;
    tbody.appendChild(tr);
  });

  wireEvents();        // новые элементы — новые слушатели
  recalcAll(years);    // пересчёт + графики
}

function wireEvents() {
  // выбор ТЭР из списка
  tbody.querySelectorAll("select[data-ter-select]").forEach(sel => {
    sel.addEventListener("change", () => {
      const bi = Number(sel.dataset.terSelect);
      blocks[bi].resourceName = sel.value || "";

      const unit = getUnit(blocks[bi]);
      const natUnitCell = tbody.querySelector(`[data-unit="${bi}:natural"]`);
      const costUnitCell = tbody.querySelector(`[data-unit="${bi}:cost"]`);
      if (natUnitCell) natUnitCell.textContent = unit;
      if (costUnitCell) costUnitCell.textContent = costUnitFrom(unit);

      recalcAll(getYears());
    });
  });

  // ввод значений (только editable)
  tbody.querySelectorAll("input").forEach(inp => {
    if (inp.hasAttribute("readonly")) return;
    inp.addEventListener("input", () => {
      const bi = Number(inp.dataset.bi);
      const row = inp.dataset.row; // natural | money
      const year = Number(inp.dataset.year);

      blocks[bi].values[year][row] = inp.value;
      recalcAll(getYears());
    });
  });

  // удалить блок
  tbody.querySelectorAll("button[data-del-block]").forEach(btn => {
    btn.addEventListener("click", () => {
      const bi = Number(btn.dataset.delBlock);
      blocks.splice(bi, 1);
      buildBody(getYears());
    });
  });
}

// =====================
// recalculation
// =====================
function recalcBlock(bi, years) {
  const block = blocks[bi];
  const k = getK(block);

  years.forEach(y => {
    const nat = toNum(block.values[y]?.natural);
    const mon = toNum(block.values[y]?.money);

    const tut = (nat > 0 && k > 0) ? fmt(nat * k) : "";
    const tutInp = tbody.querySelector(`input[data-bi="${bi}"][data-row="tut"][data-year="${y}"]`);
    if (tutInp) tutInp.value = tut;

    const cost = (nat > 0 && mon > 0) ? fmt(mon / nat) : "";
    const costInp = tbody.querySelector(`input[data-bi="${bi}"][data-row="cost"][data-year="${y}"]`);
    if (costInp) costInp.value = cost;
  });
}

function recalcTotals(years) {
  years.forEach(y => {
    let totalMoney = 0;
    let totalTut = 0;

    let hasMoney = false;
    let hasTut = false;

    blocks.forEach(b => {
      const nat = getCellValueOrNull(b, y, "natural");
      const mon = getCellValueOrNull(b, y, "money");
      const k = getK(b);

      if (mon !== null) { totalMoney += mon; hasMoney = true; }
      if (nat !== null && k > 0) { totalTut += nat * k; hasTut = true; }
    });

    const tutInp = tbody.querySelector(`input[data-total="tut"][data-year="${y}"]`);
    const monInp = tbody.querySelector(`input[data-total="money"][data-year="${y}"]`);
    const costInp = tbody.querySelector(`input[data-total="cost"][data-year="${y}"]`);

    if (tutInp) tutInp.value = hasTut ? fmt(totalTut) : "";
    if (monInp) monInp.value = hasMoney ? fmt(totalMoney) : "";

    const totalCost = (hasTut && totalTut !== 0 && hasMoney) ? (totalMoney / totalTut) : null;
    if (costInp) costInp.value = (totalCost !== null && totalCost > 0) ? fmt(totalCost) : "";
  });
}

function recalcAll(years) {
  blocks.forEach((_, bi) => recalcBlock(bi, years));
  recalcTotals(years);
  scheduleChartsUpdate(years);
}

// =====================
// charts + Δ tables
// =====================
function scheduleChartsUpdate(years) {
  if (!window.Chart) return;
  clearTimeout(chartsTimer);
  chartsTimer = setTimeout(() => renderAllVisuals(years), 150);
}

function destroyAllCharts() {
  chartInstances.forEach(ch => {
    try { ch.destroy(); } catch {}
  });
  chartInstances.clear();
}

function buildDeltaBoxHtml(labels, dataArr) {
  const vals = dataArr.map(v => (v === null || v === undefined ? null : Number(v)));
  const baseIdx = vals.findIndex(v => v !== null && Number.isFinite(v));
  const base = baseIdx >= 0 ? vals[baseIdx] : null;

  let maxUp = { i: -1, p: -Infinity };
  let maxDown = { i: -1, p: Infinity };

  const rows = labels.map((lab, i) => {
    const cur = vals[i];
    const prev = i > 0 ? vals[i - 1] : null;

    let d = null, dp = null, idx = null;

    if (cur !== null && prev !== null) {
      d = cur - prev;
      dp = (prev !== 0) ? (d / prev * 100) : null;

      if (dp !== null && Number.isFinite(dp)) {
        if (dp > maxUp.p) maxUp = { i, p: dp };
        if (dp < maxDown.p) maxDown = { i, p: dp };
      }
    }

    if (cur !== null && base !== null && base !== 0) {
      idx = cur / base * 100;
    }

    const cls =
      (d !== null && d > 0) ? "deltaUp" :
      (d !== null && d < 0) ? "deltaDown" : "";

    return `
      <tr>
        <td style="text-align:center;">${escapeHtml(lab)}</td>
        <td>${fmt2(cur)}</td>
        <td class="${cls}">${d === null ? "—" : fmt2(d)}</td>
        <td class="${cls}">${dp === null ? "—" : fmt2(dp)}%</td>
        <td>${idx === null ? "—" : fmt2(idx)}%</td>
      </tr>
    `;
  }).join("");

  const firstVal = vals.find(v => v !== null && Number.isFinite(v));
  const lastVal = [...vals].reverse().find(v => v !== null && Number.isFinite(v));

  let trend = "данных недостаточно для тренда";
  if (firstVal !== undefined && lastVal !== undefined) {
    const diff = lastVal - firstVal;
    if (Math.abs(diff) < 1e-9) trend = "без заметных изменений за период";
    else trend = diff > 0 ? "наблюдается общий рост за период" : "наблюдается общее снижение за период";
  }

  let extremes = "";
  if (maxUp.i >= 0) extremes += `Максимальный рост: ${labels[maxUp.i]} (+${fmt2(maxUp.p)}%). `;
  if (maxDown.i >= 0) extremes += `Максимальное снижение: ${labels[maxDown.i]} (${fmt2(maxDown.p)}%).`;

  const note = `${trend}. ${extremes}`.trim();

  return `
    <div class="deltaBox">
      <table class="deltaTable">
        <thead>
          <tr>
            <th>Год</th>
            <th>Значение</th>
            <th>Δ к пред.</th>
            <th>Δ%, к пред.</th>
            <th>Индекс, %</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="5" style="text-align:center; color:#777;">Нет данных</td></tr>`}
        </tbody>
      </table>
      <p class="deltaNote">${escapeHtml(note || "—")}</p>
    </div>
  `;
}

function addLineChartCard(gridEl, id, title, labels, dataArr, yLabel) {
  const card = document.createElement("div");
  card.className = "chartCard";

  const canvas = document.createElement("canvas");
  canvas.id = id;
  card.appendChild(canvas);

  const deltaWrap = document.createElement("div");
  deltaWrap.innerHTML = buildDeltaBoxHtml(labels, dataArr);
  card.appendChild(deltaWrap);

  gridEl.appendChild(card);

  const ctx = canvas.getContext("2d");
  const chart = new window.Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: title,
        data: dataArr,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { title: { display: true, text: title } },
      scales: { y: { title: { display: true, text: yLabel } } }
    }
  });

  chartInstances.set(id, chart);
}

function addPieCard(containerEl, id, title, labels, values, unitLabel) {
  const card = document.createElement("div");
  card.className = "yearCard";

  const canvas = document.createElement("canvas");
  canvas.id = id;
  card.appendChild(canvas);

  containerEl.appendChild(card);

  const { bg, br } = pieColors(labels.length);
  const ctx = canvas.getContext("2d");

  const chart = new window.Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        label: unitLabel,
        data: values,
        backgroundColor: bg,
        borderColor: br,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: title },
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw ?? 0;
              const sum = values.reduce((a, b) => a + (Number(b) || 0), 0);
              const p = sum > 0 ? (v / sum * 100) : 0;
              return `${ctx.label}: ${fmt2(Number(v))} (${fmt2(p)}%)`;
            }
          }
        }
      }
    }
  });

  chartInstances.set(id, chart);
}

// =====================
// RENDER: line charts + yearly pies
// =====================
function renderAllVisuals(years) {
  if (!window.Chart) return;

  destroyAllCharts();

  renderLineCharts(years);
  renderYearlyStructure(years);
}

function renderLineCharts(years) {
  if (!chartsWrap) return;

  chartsWrap.innerHTML = "";
  const labels = years.map(String);

  // ===== Графики по каждому ТЭР =====
  blocks.forEach((b, bi) => {
    const name = b.resourceName ? b.resourceName : `ТЭР #${bi + 1}`;
    const unit = getUnit(b) || "ед.";

    const nat = years.map(y => getCellValueOrNull(b, y, "natural"));
    const mon = years.map(y => getCellValueOrNull(b, y, "money"));

    const cost = years.map((_, i) => {
      const n = nat[i], m = mon[i];
      return (n !== null && n !== 0 && m !== null) ? +(m / n).toFixed(2) : null;
    });

    const section = document.createElement("div");
    section.className = "chartSection";
    section.innerHTML = `<h3 class="chartTitle">${escapeHtml(name)}</h3>`;

    const grid = document.createElement("div");
    grid.className = "chartsGrid";
    section.appendChild(grid);
    chartsWrap.appendChild(section);

    addLineChartCard(grid, `b${bi}_nat`,   "В натуральном выражении", labels, nat,  unit);
    addLineChartCard(grid, `b${bi}_money`, "В денежном выражении",    labels, mon,  "тг.");
    addLineChartCard(grid, `b${bi}_cost`,  "Себестоимость",           labels, cost, `тг/${unit}`);
  });

  // ===== Графики ИТОГО =====
  const totalTut = years.map(y => {
    let sum = 0;
    let has = false;
    blocks.forEach(b => {
      const nat = getCellValueOrNull(b, y, "natural");
      const k = getK(b);
      if (nat !== null && k > 0) { sum += nat * k; has = true; }
    });
    return has ? +sum.toFixed(2) : null;
  });

  const totalMoney = years.map(y => {
    let sum = 0;
    let has = false;
    blocks.forEach(b => {
      const m = getCellValueOrNull(b, y, "money");
      if (m !== null) { sum += m; has = true; }
    });
    return has ? +sum.toFixed(2) : null;
  });

  const totalCost = years.map((_, i) => {
    const t = totalTut[i], m = totalMoney[i];
    return (t !== null && t !== 0 && m !== null) ? +(m / t).toFixed(2) : null;
  });

  const totSection = document.createElement("div");
  totSection.className = "chartSection";
  totSection.innerHTML = `<h3 class="chartTitle">ИТОГО</h3>`;

  const totGrid = document.createElement("div");
  totGrid.className = "chartsGrid";
  totSection.appendChild(totGrid);
  chartsWrap.appendChild(totSection);

  addLineChartCard(totGrid, "tot_tut",   "В условном топливе",       labels, totalTut,   "т.у.т");
  addLineChartCard(totGrid, "tot_money", "В денежном выражении",     labels, totalMoney, "тг.");
  addLineChartCard(totGrid, "tot_cost",  "Себестоимость",            labels, totalCost,  "тг/т.у.т");
}

function renderYearlyStructure(years) {
  if (!yearlyWrap) return;

  yearlyWrap.innerHTML = "";

  years.forEach((y) => {
    // Собираем данные по ресурсам
    const rows = blocks.map((b) => {
      const name = b.resourceName || "—";
      const k = getK(b);
      const nat = getCellValueOrNull(b, y, "natural");
      const mon = getCellValueOrNull(b, y, "money");

      const tut = (nat !== null && k > 0) ? (nat * k) : null;

      return {
        name,
        tut: (tut !== null && tut > 0) ? tut : 0,
        money: (mon !== null && mon > 0) ? mon : 0,
      };
    });

    const sumTut = rows.reduce((a, r) => a + (r.tut || 0), 0);
    const sumMoney = rows.reduce((a, r) => a + (r.money || 0), 0);

    // Для pie берем только >0
    const tutItems = rows.filter(r => r.tut > 0);
    const monItems = rows.filter(r => r.money > 0);

    const tutLabels = tutItems.map(r => r.name);
    const tutValues = tutItems.map(r => +r.tut.toFixed(2));

    const monLabels = monItems.map(r => r.name);
    const monValues = monItems.map(r => +r.money.toFixed(2));

    // Секция года
    const section = document.createElement("div");
    section.className = "yearSection";
    section.innerHTML = `<h3 class="yearTitle">${y}</h3>`;

    const grid = document.createElement("div");
    grid.className = "yearGrid";
    section.appendChild(grid);

    // Pie: т.у.т
    if (tutValues.length) {
      addPieCard(grid, `y${y}_tut`, `Структура (т.у.т) — ${y}`, tutLabels, tutValues, "т.у.т");
    } else {
      const empty = document.createElement("div");
      empty.className = "yearCard";
      empty.innerHTML = `<div style="color:#777; padding:8px;">Нет данных для т.у.т за ${y}</div>`;
      grid.appendChild(empty);
    }

    // Pie: тг
    if (monValues.length) {
      addPieCard(grid, `y${y}_money`, `Структура (тг.) — ${y}`, monLabels, monValues, "тг.");
    } else {
      const empty = document.createElement("div");
      empty.className = "yearCard";
      empty.innerHTML = `<div style="color:#777; padding:8px;">Нет данных для тг. за ${y}</div>`;
      grid.appendChild(empty);
    }

    // Таблица сравнения
    const table = document.createElement("table");
    table.className = "yearTable";

    const bodyRows = rows.map(r => {
      const pTut = sumTut > 0 ? percent(r.tut, sumTut) : 0;
      const pMon = sumMoney > 0 ? percent(r.money, sumMoney) : 0;
      return `
        <tr>
          <td>${escapeHtml(r.name)}</td>
          <td>${r.tut > 0 ? fmt2(r.tut) : "—"}</td>
          <td>${sumTut > 0 && r.tut > 0 ? fmt2(pTut) + "%" : "—"}</td>
          <td>${r.money > 0 ? fmt2(r.money) : "—"}</td>
          <td>${sumMoney > 0 && r.money > 0 ? fmt2(pMon) + "%" : "—"}</td>
        </tr>
      `;
    }).join("");

    table.innerHTML = `
      <thead>
        <tr>
          <th>Энергоресурс</th>
          <th>т.у.т</th>
          <th>Доля, %</th>
          <th>тг.</th>
          <th>Доля, %</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows || `<tr><td colspan="5" style="text-align:center; color:#777;">Нет данных</td></tr>`}
        <tr>
          <th>ИТОГО</th>
          <th>${sumTut > 0 ? fmt2(sumTut) : "—"}</th>
          <th>${sumTut > 0 ? "100%" : "—"}</th>
          <th>${sumMoney > 0 ? fmt2(sumMoney) : "—"}</th>
          <th>${sumMoney > 0 ? "100%" : "—"}</th>
        </tr>
      </tbody>
    `;
    section.appendChild(table);

    // Короткое описание (top-1/2)
    const topTut = topN(tutItems.map(r => ({ name: r.name, value: r.tut })), 2);
    const topMon = topN(monItems.map(r => ({ name: r.name, value: r.money })), 2);

    const desc = document.createElement("p");
    desc.className = "yearDesc";

    const tutText = (sumTut > 0 && topTut.length)
      ? `По т.у.т лидирует: ${topTut.map(t => `${escapeHtml(t.name)} (${fmt2(percent(t.value, sumTut))}%)`).join(", ")}.`
      : `По т.у.т недостаточно данных.`;

    const monText = (sumMoney > 0 && topMon.length)
      ? `По тг. лидирует: ${topMon.map(t => `${escapeHtml(t.name)} (${fmt2(percent(t.value, sumMoney))}%)`).join(", ")}.`
      : `По тг. недостаточно данных.`;

    desc.innerHTML = `${tutText} ${monText}`;
    section.appendChild(desc);

    yearlyWrap.appendChild(section);
  });
}

// =====================
// actions: add/apply/save/load/clear
// =====================
function addBlock(defaultName = "") {
  const years = getYears();
  if (!years.length) return alert("Проверь годы.");

  const b = { resourceName: defaultName, values: {} };
  ensureBlockYears(b, years);
  blocks.push(b);

  buildBody(years);
}

function applyYears() {
  const years = getYears();
  if (!years.length) return alert("Проверь годы: начальный должен быть <= конечного.");

  blocks.forEach(b => ensureBlockYears(b, years));
  buildHead(years);
  buildBody(years);
}

function readPayload() {
  return {
    startYear: Number(startYearEl.value),
    endYear: Number(endYearEl.value),
    blocks
  };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readPayload()));
  alert("Сохранено (локально в браузере).");
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return alert("Нет сохранённых данных.");

  let payload;
  try { payload = JSON.parse(raw); }
  catch { return alert("Сохранение повреждено."); }

  startYearEl.value = payload.startYear ?? startYearEl.value;
  endYearEl.value = payload.endYear ?? endYearEl.value;

  blocks = Array.isArray(payload.blocks) ? payload.blocks : [];
  const years = getYears();
  blocks.forEach(b => ensureBlockYears(b, years));

  buildHead(years);
  buildBody(years);
}

function clearAll() {
  if (!confirm("Очистить таблицу?")) return;
  const years = getYears();
  blocks.forEach(b => {
    years.forEach(y => (b.values[y] = { natural: "", money: "" }));
  });
  buildBody(years);
}

// =====================
// PDF
// =====================
async function downloadPdf() {
  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    alert("PDF-библиотеки не загрузились. Проверь подключение html2canvas и jspdf в HTML.");
    return;
  }

  const btns = [downloadPdfBtn].filter(Boolean);
  btns.forEach(b => (b.disabled = true));

  try {
    const canvas = await window.html2canvas(document.body, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      ignoreElements: (el) =>
        el.classList?.contains("topbar") || el.classList?.contains("panel")
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let y = 0;
    pdf.addImage(imgData, "JPEG", 0, y, imgW, imgH);

    while (y + imgH > pageH) {
      y -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, y, imgW, imgH);
    }

    const s = Number(startYearEl.value);
    const e = Number(endYearEl.value);
    pdf.save(`Потребление_ТЭР_${s}-${e}.pdf`);
  } catch (err) {
    console.error(err);
    alert("Ошибка генерации PDF. Открой консоль (F12) и посмотри ошибку.");
  } finally {
    btns.forEach(b => (b.disabled = false));
  }
}

// =====================
// Excel: таблица + Δ-таблицы
// =====================
function safeSheetName(name) {
  const s = String(name || "Лист").replace(/[\\/?*[\]:]/g, " ").trim();
  return (s || "Лист").slice(0, 31);
}

function makeDeltaAoa(title, unit, labels, vals) {
  const v = vals.map(x => (x === null || x === undefined ? null : Number(x)));
  const baseIdx = v.findIndex(x => x !== null && Number.isFinite(x));
  const base = baseIdx >= 0 ? v[baseIdx] : null;

  const aoa = [];
  aoa.push([title, unit]);
  aoa.push(["Год", "Значение", "Δ к пред.", "Δ%, к пред.", "Индекс, %"]);

  for (let i = 0; i < labels.length; i++) {
    const cur = (v[i] !== null && Number.isFinite(v[i])) ? v[i] : null;
    const prev = (i > 0 && v[i - 1] !== null && Number.isFinite(v[i - 1])) ? v[i - 1] : null;

    let d = "";
    let dp = "";
    let idx = "";

    if (cur !== null && prev !== null) {
      d = cur - prev;
      dp = (prev !== 0) ? (d / prev * 100) : "";
    }
    if (cur !== null && base !== null && base !== 0) {
      idx = cur / base * 100;
    }

    aoa.push([labels[i], cur ?? "", d === "" ? "" : d, dp === "" ? "" : dp, idx === "" ? "" : idx]);
  }

  aoa.push([]);
  return aoa;
}

function buildMainTableAoa(years) {
  const header = ["№", "Наименование ТЭР", "Потребление", "Ед.измерения", ...years.map(String)];
  const aoa = [header];

  blocks.forEach((b, bi) => {
    const unit = getUnit(b) || "";
    const k = getK(b);

    const rows = [
      { key: "natural", label: "В натуральном выражении", unit: unit },
      { key: "tut",     label: "В условном топливе",      unit: "т.у.т" },
      { key: "money",   label: "В денежном выражении",    unit: "тг." },
      { key: "cost",    label: "Себестоимость",           unit: costUnitFrom(unit) },
    ];

    rows.forEach((r, idx) => {
      const row = [];
      row.push(idx === 0 ? (bi + 1) : "");
      row.push(idx === 0 ? (b.resourceName || "") : "");
      row.push(r.label);
      row.push(r.unit);

      years.forEach(y => {
        const nat = getCellValueOrNull(b, y, "natural");
        const mon = getCellValueOrNull(b, y, "money");

        let val = "";
        if (r.key === "natural") val = nat ?? "";
        if (r.key === "money")   val = mon ?? "";
        if (r.key === "tut")     val = (nat !== null && k > 0) ? (nat * k) : "";
        if (r.key === "cost")    val = (nat !== null && nat !== 0 && mon !== null) ? (mon / nat) : "";

        row.push(val === "" ? "" : Number(val));
      });

      aoa.push(row);
    });
  });

  // ИТОГО (3 строки)
  const totalTut = years.map(y => {
    let sum = 0, has = false;
    blocks.forEach(b => {
      const nat = getCellValueOrNull(b, y, "natural");
      const k = getK(b);
      if (nat !== null && k > 0) { sum += nat * k; has = true; }
    });
    return has ? sum : "";
  });

  const totalMoney = years.map(y => {
    let sum = 0, has = false;
    blocks.forEach(b => {
      const m = getCellValueOrNull(b, y, "money");
      if (m !== null) { sum += m; has = true; }
    });
    return has ? sum : "";
  });

  const totalCost = years.map((_, i) => {
    const t = totalTut[i], m = totalMoney[i];
    return (t !== "" && t !== 0 && m !== "") ? (m / t) : "";
  });

  aoa.push(["", "ИТОГО", "В условном топливе", "т.у.т", ...totalTut.map(x => x === "" ? "" : Number(x))]);
  aoa.push(["", "",     "В денежном выражении", "тг.", ...totalMoney.map(x => x === "" ? "" : Number(x))]);
  aoa.push(["", "",     "Себестоимость", "тг/т.у.т", ...totalCost.map(x => x === "" ? "" : Number(x))]);

  return aoa;
}
function buildYearlyStructureAoa(years) {
  const aoa = [];
  aoa.push(["СТРУКТУРА ПО ГОДАМ (как в круговых диаграммах)"]);
  aoa.push([]);

  years.forEach((y) => {
    // собираем по ресурсам
    const rows = blocks.map((b) => {
      const name = b.resourceName || "—";
      const k = getK(b);

      const nat = getCellValueOrNull(b, y, "natural");
      const mon = getCellValueOrNull(b, y, "money");

      const tut = (nat !== null && k > 0) ? (nat * k) : 0;
      const money = (mon !== null) ? mon : 0;

      return { name, tut, money };
    });

    const sumTut = rows.reduce((a, r) => a + (Number(r.tut) || 0), 0);
    const sumMoney = rows.reduce((a, r) => a + (Number(r.money) || 0), 0);

    aoa.push([`Год: ${y}`]);
    aoa.push(["Энергоресурс", "т.у.т", "Доля, % (т.у.т)", "тг.", "Доля, % (тг.)"]);

    rows.forEach(r => {
      const pTut = sumTut > 0 ? (r.tut / sumTut * 100) : "";
      const pMon = sumMoney > 0 ? (r.money / sumMoney * 100) : "";
      aoa.push([
        r.name,
        r.tut ? Number(r.tut) : "",
        pTut === "" ? "" : Number(pTut),
        r.money ? Number(r.money) : "",
        pMon === "" ? "" : Number(pMon),
      ]);
    });

    aoa.push([
      "ИТОГО",
      sumTut > 0 ? Number(sumTut) : "",
      sumTut > 0 ? 100 : "",
      sumMoney > 0 ? Number(sumMoney) : "",
      sumMoney > 0 ? 100 : "",
    ]);

    aoa.push([]);
  });

  return aoa;
}

// Доли по годам для каждого ресурса (для Δ-таблиц)
function buildShareSeries(years, mode /* "tut" | "money" */) {
  // считаем тоталы
  const totals = years.map((y) => {
    if (mode === "tut") {
      let sum = 0;
      blocks.forEach(b => {
        const nat = getCellValueOrNull(b, y, "natural");
        const k = getK(b);
        if (nat !== null && k > 0) sum += nat * k;
      });
      return sum;
    } else {
      let sum = 0;
      blocks.forEach(b => {
        const m = getCellValueOrNull(b, y, "money");
        if (m !== null) sum += m;
      });
      return sum;
    }
  });

  // доли по ресурсам
  return blocks.map((b) => {
    const name = b.resourceName || "—";
    const series = years.map((y, i) => {
      const total = totals[i];

      if (mode === "tut") {
        const nat = getCellValueOrNull(b, y, "natural");
        const k = getK(b);
        const val = (nat !== null && k > 0) ? (nat * k) : null;
        if (!total || total <= 0 || val === null) return null;
        return (val / total) * 100;
      } else {
        const val = getCellValueOrNull(b, y, "money");
        if (!total || total <= 0 || val === null) return null;
        return (val / total) * 100;
      }
    });

    return { name, series };
  });
}

function buildStructureDeltaAoa(years) {
  const labels = years.map(String);
  const aoa = [];
  aoa.push(["Δ СТРУКТУРЫ (доли, %) по годам"]);
  aoa.push([]);

  const tutShares = buildShareSeries(years, "tut");
  const moneyShares = buildShareSeries(years, "money");

  // По т.у.т (доли)
  aoa.push(["ДОЛИ ПО т.у.т (%, от годового итого)"]);
  aoa.push([]);
  tutShares.forEach(({ name, series }) => {
    aoa.push(...makeDeltaAoa(name, "%", labels, series));
  });

  aoa.push([]);
  aoa.push(["ДОЛИ ПО тг. (%, от годового итого)"]);
  aoa.push([]);
  moneyShares.forEach(({ name, series }) => {
    aoa.push(...makeDeltaAoa(name, "%", labels, series));
  });

  return aoa;
}

async function downloadXlsx() {
  if (!window.XLSX) {
    alert("XLSX-библиотека не загрузилась. Проверь подключение xlsx.full.min.js в HTML.");
    return;
  }

  const years = getYears();
  if (!years.length) return alert("Проверь годы.");

  if (downloadXlsxBtn) downloadXlsxBtn.disabled = true;

  try {
    const wb = window.XLSX.utils.book_new();

    // 1) Основная таблица
    const mainAoa = buildMainTableAoa(years);
    const wsMain = window.XLSX.utils.aoa_to_sheet(mainAoa);

    // ширины колонок
    wsMain["!cols"] = [
      { wch: 5 },   // №
      { wch: 28 },  // Наименование ТЭР
      { wch: 28 },  // Потребление
      { wch: 14 },  // Ед.
      ...years.map(() => ({ wch: 14 })),
    ];

    window.XLSX.utils.book_append_sheet(wb, wsMain, "Таблица");

    // 2) Δ-таблицы по каждому ТЭР (нат / деньги / себест)
    const labels = years.map(String);

    blocks.forEach((b, bi) => {
      const name = b.resourceName || `ТЭР_${bi + 1}`;
      const unit = getUnit(b) || "ед.";

      const nat = years.map(y => getCellValueOrNull(b, y, "natural"));
      const mon = years.map(y => getCellValueOrNull(b, y, "money"));
      const cost = years.map((_, i) => {
        const n = nat[i], m = mon[i];
        return (n !== null && n !== 0 && m !== null) ? (m / n) : null;
      });

      const aoa = [];
      aoa.push(...makeDeltaAoa("В натуральном выражении", unit, labels, nat));
      aoa.push(...makeDeltaAoa("В денежном выражении", "тг.", labels, mon));
      aoa.push(...makeDeltaAoa("Себестоимость", `тг/${unit}`, labels, cost));

      const ws = window.XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
      window.XLSX.utils.book_append_sheet(wb, ws, safeSheetName(name));
    });

    // 3) Δ-таблицы ИТОГО
    const totalTut = years.map(y => {
      let sum = 0, has = false;
      blocks.forEach(b => {
        const nat = getCellValueOrNull(b, y, "natural");
        const k = getK(b);
        if (nat !== null && k > 0) { sum += nat * k; has = true; }
      });
      return has ? sum : null;
    });

    const totalMoney = years.map(y => {
      let sum = 0, has = false;
      blocks.forEach(b => {
        const m = getCellValueOrNull(b, y, "money");
        if (m !== null) { sum += m; has = true; }
      });
      return has ? sum : null;
    });

    const totalCost = years.map((_, i) => {
      const t = totalTut[i], m = totalMoney[i];
      return (t !== null && t !== 0 && m !== null) ? (m / t) : null;
    });

    const aoaTot = [];
    aoaTot.push(...makeDeltaAoa("ИТОГО: В условном топливе", "т.у.т", labels, totalTut));
    aoaTot.push(...makeDeltaAoa("ИТОГО: В денежном выражении", "тг.", labels, totalMoney));
    aoaTot.push(...makeDeltaAoa("ИТОГО: Себестоимость", "тг/т.у.т", labels, totalCost));

    const wsTot = window.XLSX.utils.aoa_to_sheet(aoaTot);
    wsTot["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
    window.XLSX.utils.book_append_sheet(wb, wsTot, "ИТОГО_Δ");

    // [ВСТАВЛЯЕШЬ СЮДА БЛОК "Структура" и "Структура_Δ"]
    const aoaStruct = buildYearlyStructureAoa(years);
    const wsStruct = window.XLSX.utils.aoa_to_sheet(aoaStruct);
    wsStruct["!cols"] = [
      { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 16 },
    ];
    window.XLSX.utils.book_append_sheet(wb, wsStruct, "Структура");

    const aoaStructDelta = buildStructureDeltaAoa(years);
    const wsStructDelta = window.XLSX.utils.aoa_to_sheet(aoaStructDelta);
    wsStructDelta["!cols"] = [
      { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    ];
    window.XLSX.utils.book_append_sheet(wb, wsStructDelta, "Структура_Δ");

    const s = Number(startYearEl.value);
    const e = Number(endYearEl.value);
    window.XLSX.writeFile(wb, `Потребление_ТЭР_${s}-${e}.xlsx`);

  } finally {
    if (downloadXlsxBtn) downloadXlsxBtn.disabled = false;
  }
}

// =====================
// PNG: скачать все графики (включая pie)
// =====================
function safeFileName(name) {
  return String(name || "chart")
    .replace(/[\\/?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

function canvasToPngWithWhiteBg(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const ctx = tmp.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(canvas, 0, 0);
  return tmp.toDataURL("image/png");
}

function chartFileLabelByCanvasId(id) {
  // b{bi}_nat | b{bi}_money | b{bi}_cost
  let m = id.match(/^b(\d+)_(nat|money|cost)$/);
  if (m) {
    const bi = Number(m[1]);
    const kind = m[2];
    const terName = blocks?.[bi]?.resourceName || `ТЭР_${bi + 1}`;
    const kindRu = kind === "nat" ? "натуральное" : kind === "money" ? "деньги" : "себестоимость";
    return `${terName}_${kindRu}`;
  }
  // tot_tut | tot_money | tot_cost
  m = id.match(/^tot_(tut|money|cost)$/);
  if (m) {
    const kind = m[1];
    return kind === "tut" ? "ИТОГО_тут" : kind === "money" ? "ИТОГО_деньги" : "ИТОГО_себестоимость";
  }
  // y{year}_tut | y{year}_money
  m = id.match(/^y(\d+)_(tut|money)$/);
  if (m) {
    const year = m[1];
    const kind = m[2] === "tut" ? "структура_тут" : "структура_деньги";
    return `${year}_${kind}`;
  }
  return id || "chart";
}

function downloadBlobUrl(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadChartsPng() {
  const canvases = document.querySelectorAll("#chartsWrap canvas, #yearlyWrap canvas");
  if (!canvases.length) return alert("Графиков не найдено.");

  const s = Number(startYearEl.value);
  const e = Number(endYearEl.value);
  const prefix = `Потребление_ТЭР_${s}-${e}_`;

  canvases.forEach((canvas) => {
    if (!canvas.width || !canvas.height) return;
    const base = chartFileLabelByCanvasId(canvas.id);
    const name = safeFileName(prefix + base) + ".png";
    const dataUrl = canvasToPngWithWhiteBg(canvas);
    downloadBlobUrl(dataUrl, name);
  });
}

// =====================
// bind handlers (один раз)
// =====================
applyYearsBtn?.addEventListener("click", applyYears);
saveBtn?.addEventListener("click", save);
loadBtn?.addEventListener("click", load);
clearBtn?.addEventListener("click", clearAll);
addTerBtn?.addEventListener("click", () => addBlock(""));

downloadPdfBtn?.addEventListener("click", downloadPdf);
downloadXlsxBtn?.addEventListener("click", downloadXlsx);
downloadChartsPngBtn?.addEventListener("click", downloadChartsPng);

// =====================
// init
// =====================
(() => {
  const years = getYears();
  blocks.forEach(b => ensureBlockYears(b, years));
  buildHead(years);
  buildBody(years);
})();
