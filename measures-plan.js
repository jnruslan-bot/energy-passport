(() => {
  "use strict";

  console.log("[measures-plan] loaded");

  const STORAGE_KEY = "energyAuditMeasuresPlanNorm391";

  const $ = (id) => document.getElementById(id);

  const ZONES = [
    { name: "Электроснабжение и освещение", code: "ЭиОс." },
    { name: "Теплоснабжение и отопление", code: "ТиОт." },
    { name: "Вентиляция, кондиционирование, увлажнение", code: "ВКУ." },
    { name: "Водоснабжение и водоотведение", code: "ВиВ." },
    { name: "Технологическое оборудование", code: "ТО." },
    { name: "Приборы и средства учета и контроля, в том числе автоматизированные системы", code: "ПУ." },
    { name: "Энергоменеджмент", code: "ЭМ." },
    { name: "Переподготовка и повышение квалификации персонала", code: "ППК." }
  ];

let currentTable1ZoneCode = "";

  const RESOURCES = [
    { name: "Электрическая энергия", unit: "кВт·ч" },
    { name: "Тепловая энергия", unit: "Гкал" },
    { name: "Природный газ", unit: "м³" },
    { name: "Дизельное топливо", unit: "л" },
    { name: "Бензин", unit: "л" },
    { name: "Вода", unit: "м³" },
    { name: "Тонна условного топлива", unit: "т.у.т." }
  ];

  function toNumber(value) {
    const s = String(value ?? "").trim().replace(",", ".");
    if (s === "") return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt(value, digits = 3) {
    const n = toNumber(value);
    if (!Number.isFinite(n)) return "";
    return n.toFixed(digits);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function yearLabels() {
    const from = toNumber($("planYearFrom")?.value);
    if (!Number.isFinite(from)) {
      return ["20__", "20__", "20__", "20__", "20__"];
    }

    return [from, from + 1, from + 2, from + 3, from + 4].map(String);
  }

  function updateYearHeaders() {
    const years = yearLabels();

    years.forEach((year, index) => {
      document.querySelectorAll(`.year-y${index + 1}`).forEach((el) => {
        el.textContent = year;
      });
    });

    const toEl = $("planYearTo");
    if (toEl && Number.isFinite(toNumber($("planYearFrom")?.value))) {
      toEl.value = String(toNumber($("planYearFrom").value) + 4);
    }
  }

  function input(value = "", className = "", type = "text") {
    return `<input class="${className}" type="${type}" value="${escapeHtml(value)}">`;
  }

  function textarea(value = "", className = "") {
    return `<textarea class="${className}">${escapeHtml(value)}</textarea>`;
  }

  function selectResource(value = "") {
    const options = RESOURCES.map((r) => {
      const selected = r.name === value ? "selected" : "";
      return `<option value="${escapeHtml(r.name)}" ${selected}>${escapeHtml(r.name)}</option>`;
    }).join("");

    return `<select class="t2-resource">${options}</select>`;
  }

  function unitByResource(resourceName) {
    const found = RESOURCES.find((r) => r.name === resourceName);
    return found ? found.unit : "";
  }
function zoneByCode(code) {
  return ZONES.find((z) => z.code === code) || null;
}
function createZoneRow(zoneName, colCount, zoneCode = "") {
  const tr = document.createElement("tr");
  tr.className = "zone-row";

  if (zoneCode) {
    tr.dataset.zoneHeader = zoneCode;
  }

  tr.innerHTML = `
    <td colspan="${colCount}">
      <div class="zone-title-wrap">
        <span>Зона энергосбережения: ${escapeHtml(zoneName)}</span>

        <div style="display:flex; gap:6px; align-items:center;">
          <button type="button" class="add-zone-row-btn" data-zone-add="${escapeHtml(zoneCode)}">
            + Добавить мероприятие
          </button>

          <button type="button" class="delete-zone-btn" data-zone-delete="${escapeHtml(zoneCode)}">
            Удалить зону
          </button>
        </div>
      </div>
    </td>
  `;

  return tr;
}

  function createTable1Row(zone, index, data = {}) {
    const tr = document.createElement("tr");
    tr.dataset.zone = zone.code;

    const code = data.code || `${zone.code}${String(index).padStart(2, "0")}`;

    tr.innerHTML = `
     <td>
  <div class="code-cell-wrap">
    ${input(code, "t1-code")}
    <button type="button" class="delete-row-btn" title="Удалить мероприятие">×</button>
  </div>
</td>
      <td>${textarea(data.measure, "t1-measure")}</td>
      <td>${input(data.period, "t1-period")}</td>

      <td>${input(data.cost1, "t1-cost")}</td>
      <td>${input(data.cost2, "t1-cost")}</td>
      <td>${input(data.cost3, "t1-cost")}</td>
      <td>${input(data.cost4, "t1-cost")}</td>
      <td>${input(data.cost5, "t1-cost")}</td>

      <td>${input(data.unit, "t1-unit")}</td>

      <td>${input(data.saving1, "t1-saving")}</td>
      <td>${input(data.saving2, "t1-saving")}</td>
      <td>${input(data.saving3, "t1-saving")}</td>
      <td>${input(data.saving4, "t1-saving")}</td>
      <td>${input(data.saving5, "t1-saving")}</td>

      <td>${input(data.payback, "t1-payback")}</td>
      <td>${textarea(data.done, "t1-done")}</td>
    `;

    bindEvents(tr);
    return tr;
  }

  function createTable2Row(index, data = {}) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="t2-num">${index}</td>
      <td>${selectResource(data.resource)}</td>
      <td>${input(data.unit || unitByResource(data.resource), "t2-unit")}</td>

      <td>${input(data.red1, "t2-red")}</td>
      <td>${input(data.red2, "t2-red")}</td>
      <td>${input(data.red3, "t2-red")}</td>
      <td>${input(data.red4, "t2-red")}</td>
      <td>${input(data.red5, "t2-red")}</td>

      <td>${input(data.redTotal, "t2-red-total")}</td>

      <td>${input(data.money1, "t2-money")}</td>
      <td>${input(data.money2, "t2-money")}</td>
      <td>${input(data.money3, "t2-money")}</td>
      <td>${input(data.money4, "t2-money")}</td>
      <td>${input(data.money5, "t2-money")}</td>

      <td>${input(data.moneyTotal, "t2-money-total")}</td>
      <td>${input(data.maxPower, "t2-max-power")}</td>
      <td>${input(data.potential, "t2-potential")}</td>
      <td>${textarea(data.done, "t2-done")}</td>
    `;

    bindEvents(tr);
    return tr;
  }

  function createTable3Row(index, data = {}) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${input(data.code || `УП.${String(index).padStart(2, "0")}`, "t3-code")}</td>
      <td>${textarea(data.name, "t3-name")}</td>
      <td>${input(data.unit, "t3-unit", "text")}</td>
      <td>${input(data.red1, "t3-red")}</td>
      <td>${input(data.red2, "t3-red")}</td>
      <td>${input(data.red3, "t3-red")}</td>
      <td>${input(data.red4, "t3-red")}</td>
      <td>${input(data.red5, "t3-red")}</td>
    `;

    bindEvents(tr);
    return tr;
  }

  function addInitialTable1Rows() {
  const body = $("table1Body");
  if (!body) return;

  body.innerHTML = "";

  const hint = $("table1ZoneHint");
  if (hint) {
    hint.style.display = "block";
    hint.textContent = "Выберите зону энергосбережения, чтобы открыть таблицу для заполнения мероприятий по выбранной зоне.";
  }
}
function removeTable1PlanTotals() {
  document.querySelectorAll("#table1Body tr[data-plan-total-row]").forEach((tr) => {
    tr.remove();
  });
}

function appendTable1PlanTotals() {
  const body = $("table1Body");
  if (!body) return;

  removeTable1PlanTotals();

  const hasAnyZone = Boolean(body.querySelector("tr[data-zone-header]"));
  if (!hasAnyZone) return;

  const planTotal = document.createElement("tr");
  planTotal.className = "total-row";
  planTotal.dataset.planTotalRow = "total";
  planTotal.innerHTML = `
    <td colspan="3" class="left">Итого по плану</td>
    <td colspan="5"></td>
    <td></td>
    <td colspan="5"></td>
    <td></td>
    <td></td>
  `;
  body.appendChild(planTotal);

  const planAll = document.createElement("tr");
  planAll.className = "total-row";
  planAll.dataset.planTotalRow = "all";
  planAll.innerHTML = `
    <td colspan="3" class="left">Всего по плану</td>
    <td colspan="5"></td>
    <td></td>
    <td colspan="5"></td>
    <td></td>
    <td></td>
  `;
  body.appendChild(planAll);
}
function createTable1SummaryRow(label, type, zoneCode = "") {
  const tr = document.createElement("tr");
  tr.className = "total-row";

  if (type === "zoneTotal") {
    tr.dataset.zoneTotal = zoneCode;
  }

  if (type === "zoneAll") {
    tr.dataset.zoneAll = zoneCode;
  }

  tr.innerHTML = `
    <td colspan="3" class="left">${escapeHtml(label)}</td>

    <td class="t1-sum-cost">0.000</td>
    <td class="t1-sum-cost">0.000</td>
    <td class="t1-sum-cost">0.000</td>
    <td class="t1-sum-cost">0.000</td>
    <td class="t1-sum-cost">0.000</td>

    <td></td>

    <td class="t1-sum-saving">0.000</td>
    <td class="t1-sum-saving">0.000</td>
    <td class="t1-sum-saving">0.000</td>
    <td class="t1-sum-saving">0.000</td>
    <td class="t1-sum-saving">0.000</td>

    <td></td>
    <td></td>
  `;

  return tr;
}
function openTable1Zone(zoneCode) {
  const body = $("table1Body");
  if (!body) return;

  const zone = zoneByCode(zoneCode);

  if (!zone) {
    currentTable1ZoneCode = "";

    const hasAnyZone = body.querySelector(".zone-row");

    const hint = $("table1ZoneHint");
    if (hint && !hasAnyZone) {
      hint.style.display = "block";
      hint.textContent = "Выберите зону энергосбережения, чтобы открыть таблицу для заполнения мероприятий по выбранной зоне.";
    }

    return;
  }

  currentTable1ZoneCode = zone.code;

  const hint = $("table1ZoneHint");
  if (hint) {
    hint.style.display = "none";
  }

  // Если такая зона уже добавлена — второй раз её не создаём
  const existingHeader = body.querySelector(`tr[data-zone-header="${zone.code}"]`);
  if (existingHeader) {
    existingHeader.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
removeTable1PlanTotals();
  // Заголовок выбранной зоны
const header = createZoneRow(zone.name, 16, zone.code);
body.appendChild(header);

  // Первые три строки мероприятий по выбранной зоне
  body.appendChild(createTable1Row(zone, 1));
  body.appendChild(createTable1Row(zone, 2));
  body.appendChild(createTable1Row(zone, 3));

   body.appendChild(createTable1SummaryRow("Итого:", "zoneTotal", zone.code));
  body.appendChild(createTable1SummaryRow("Всего:", "zoneAll", zone.code));

appendTable1PlanTotals();

bindEvents(body);
recalc();
savePlan();
}
  function addInitialTable2Rows() {
    const body = $("table2Body");
    if (!body) return;

    body.innerHTML = "";

    RESOURCES.forEach((resource, index) => {
      body.appendChild(createTable2Row(index + 1, {
        resource: resource.name,
        unit: resource.unit
      }));
    });

    const total = document.createElement("tr");
    total.className = "total-row";
    total.innerHTML = `
      <td colspan="3" class="left">Итого:</td>
      <td colspan="5"></td>
      <td></td>
      <td colspan="5"></td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    `;
    body.appendChild(total);
  }

  function addInitialTable3Rows() {
    const body = $("table3Body");
    if (!body) return;

    body.innerHTML = "";

    body.appendChild(createTable3Row(1, {
      code: "УП.01",
      name: "Удельное потребление электрической энергии",
      unit: "кВт·ч/м²"
    }));

    body.appendChild(createTable3Row(2, {
      code: "УП.02",
      name: "Удельное потребление тепловой энергии",
      unit: "Гкал/м²"
    }));

    body.appendChild(createTable3Row(3, {
      code: "УП.03",
      name: "Удельное потребление воды",
      unit: "м³/м²"
    }));
  }

  function bindEvents(root = document) {
    root.querySelectorAll("input, textarea, select").forEach((el) => {
      el.addEventListener("input", () => {
        recalc();
        savePlan();
      });

      el.addEventListener("change", () => {
        if (el.classList.contains("t2-resource")) {
          const tr = el.closest("tr");
          const unitEl = tr?.querySelector(".t2-unit");
          if (unitEl) unitEl.value = unitByResource(el.value);
        }

        recalc();
        savePlan();
      });
    });
  }

  function sumInputs(inputs) {
    return inputs.reduce((sum, el) => {
      const n = toNumber(el.value);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }
function sumTable1Inputs(rows, selector) {
  const totals = [0, 0, 0, 0, 0];

  rows.forEach((tr) => {
    const inputs = Array.from(tr.querySelectorAll(selector));

    inputs.forEach((input, index) => {
      if (index > 4) return;

      const n = toNumber(input.value);
      if (Number.isFinite(n)) {
        totals[index] += n;
      }
    });
  });

  return totals;
}

function writeTable1Summary(row, costTotals, savingTotals) {
  if (!row) return;

  const costCells = Array.from(row.querySelectorAll(".t1-sum-cost"));
  const savingCells = Array.from(row.querySelectorAll(".t1-sum-saving"));

  costCells.forEach((cell, index) => {
    cell.textContent = fmt(costTotals[index] || 0, 3);
  });

  savingCells.forEach((cell, index) => {
    cell.textContent = fmt(savingTotals[index] || 0, 3);
  });
}

function recalcTable1() {
  const body = $("table1Body");
  if (!body) return;

  const zoneCodes = Array.from(
    new Set(
      Array.from(body.querySelectorAll("tr[data-zone]"))
        .map((tr) => tr.dataset.zone)
        .filter(Boolean)
    )
  );

  zoneCodes.forEach((zoneCode) => {
    const rows = Array.from(body.querySelectorAll(`tr[data-zone="${zoneCode}"]`));

    const costTotals = sumTable1Inputs(rows, ".t1-cost");
    const savingTotals = sumTable1Inputs(rows, ".t1-saving");

    const zoneTotalRow = body.querySelector(`tr[data-zone-total="${zoneCode}"]`);
    const zoneAllRow = body.querySelector(`tr[data-zone-all="${zoneCode}"]`);

    writeTable1Summary(zoneTotalRow, costTotals, savingTotals);
    writeTable1Summary(zoneAllRow, costTotals, savingTotals);
  });
}
  function recalcTable2() {
    document.querySelectorAll("#table2Body tr").forEach((tr) => {
      if (tr.classList.contains("total-row")) return;

      const redInputs = Array.from(tr.querySelectorAll(".t2-red"));
      const moneyInputs = Array.from(tr.querySelectorAll(".t2-money"));

      const redTotalEl = tr.querySelector(".t2-red-total");
      const moneyTotalEl = tr.querySelector(".t2-money-total");

      if (redTotalEl) redTotalEl.value = fmt(sumInputs(redInputs), 3);
      if (moneyTotalEl) moneyTotalEl.value = fmt(sumInputs(moneyInputs), 3);
    });
  }

function recalc() {
  updateYearHeaders();
  recalcTable1();
  recalcTable2();
}

  function collectRows(selector, mapper) {
    return Array.from(document.querySelectorAll(selector))
      .filter((tr) => !tr.classList.contains("zone-row") && !tr.classList.contains("total-row"))
      .map(mapper);
  }

  function collectPlan() {
    return {
      orgName: $("orgName")?.value ?? "",
      planYearFrom: $("planYearFrom")?.value ?? "",
      planYearTo: $("planYearTo")?.value ?? "",
      approvalDate: $("approvalDate")?.value ?? "",

      table1: collectRows("#table1Body tr", (tr) => {
        const vals = Array.from(tr.querySelectorAll("input, textarea")).map((el) => el.value);
        return vals;
      }),

      table2: collectRows("#table2Body tr", (tr) => {
        return {
          resource: tr.querySelector(".t2-resource")?.value ?? "",
          values: Array.from(tr.querySelectorAll("input, textarea")).map((el) => el.value)
        };
      }),

      table3: collectRows("#table3Body tr", (tr) => {
        const vals = Array.from(tr.querySelectorAll("input, textarea")).map((el) => el.value);
        return vals;
      })
    };
  }

  function savePlan() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectPlan()));
  }

  function loadPlan() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);

      if ($("orgName")) $("orgName").value = data.orgName ?? "";
      if ($("planYearFrom")) $("planYearFrom").value = data.planYearFrom ?? "";
      if ($("planYearTo")) $("planYearTo").value = data.planYearTo ?? "";
      if ($("approvalDate")) $("approvalDate").value = data.approvalDate ?? "";

      return true;
    } catch (e) {
      console.error("Ошибка загрузки плана:", e);
      return false;
    }
  }

  function clearPlan() {
    const ok = confirm("Очистить план мероприятий?");
    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  function addTable1Row(zoneCodeFromButton = "") {
  const body = $("table1Body");
  if (!body) return;

  const zoneCode = zoneCodeFromButton || $("table1ZoneSelect")?.value || currentTable1ZoneCode;
  const zone = zoneByCode(zoneCode);

  if (!zone) {
    alert("Сначала выберите зону энергосбережения.");
    return;
  }

  currentTable1ZoneCode = zone.code;

  const existingHeader = body.querySelector(`tr[data-zone-header="${zone.code}"]`);

  // Если зона еще не добавлена, сначала создаём её с базовыми строками
  if (!existingHeader) {
    openTable1Zone(zone.code);
  }

  const rows = Array.from(body.querySelectorAll(`tr[data-zone="${zone.code}"]`));
  const index = rows.length + 1;

  const newRow = createTable1Row(zone, index);

  // Новое мероприятие вставляем строго перед строкой "Итого" выбранной зоны
  const totalRow = body.querySelector(`tr[data-zone-total="${zone.code}"]`);

  if (totalRow) {
    body.insertBefore(newRow, totalRow);
  } else {
    const zoneAllRow = body.querySelector(`tr[data-zone-all="${zone.code}"]`);
    if (zoneAllRow) {
      body.insertBefore(newRow, zoneAllRow);
    } else {
      body.appendChild(newRow);
    }
  }

  renumberTable1Zone(zone.code);
  bindEvents(newRow);
  recalc();
  savePlan();

  newRow.scrollIntoView({ behavior: "smooth", block: "center" });
}
function renumberTable1Zone(zoneCode) {
  const zone = zoneByCode(zoneCode);
  if (!zone) return;

  const rows = Array.from(document.querySelectorAll(`#table1Body tr[data-zone="${zone.code}"]`));

  rows.forEach((tr, index) => {
    const codeInput = tr.querySelector(".t1-code");
    if (codeInput) {
      codeInput.value = `${zone.code}${String(index + 1).padStart(2, "0")}`;
    }
  });
}

function updateTable1Hint() {
  const body = $("table1Body");
  const hint = $("table1ZoneHint");
  if (!body || !hint) return;

  const hasAnyZone = Boolean(body.querySelector(".zone-row"));

  hint.style.display = hasAnyZone ? "none" : "block";
  if (!hasAnyZone) {
    hint.textContent = "Выберите зону энергосбережения, чтобы открыть таблицу для заполнения мероприятий по выбранной зоне.";
  }
}

function deleteTable1Zone(zoneCode) {
  const body = $("table1Body");
  const zone = zoneByCode(zoneCode);

  if (!body || !zone) {
    alert("Сначала выберите зону энергосбережения для удаления.");
    return;
  }

  const header = body.querySelector(`tr[data-zone-header="${zone.code}"]`);

  if (!header) {
    alert("Выбранная зона пока не добавлена в план.");
    return;
  }

  const ok = confirm(`Удалить зону "${zone.name}" со всеми мероприятиями?`);
  if (!ok) return;

  let row = header;

  while (row) {
    const next = row.nextElementSibling;

    row.remove();

if (!next || next.dataset.zoneHeader || next.dataset.planTotalRow) {
  break;
}

    row = next;
  }

  if (currentTable1ZoneCode === zone.code) {
    currentTable1ZoneCode = "";
  }

updateTable1Hint();
appendTable1PlanTotals();

recalc();
savePlan();
}

function deleteTable1Row(row) {
  if (!row) return;

  const zoneCode = row.dataset.zone;
  const zone = zoneByCode(zoneCode);

  const ok = confirm("Удалить выбранное мероприятие?");
  if (!ok) return;

  row.remove();

  if (zone) {
    renumberTable1Zone(zone.code);
  }

  recalc();
  savePlan();
}
  function addTable2Row() {
    const body = $("table2Body");
    if (!body) return;

    const count = Array.from(body.querySelectorAll("tr")).filter((tr) => !tr.classList.contains("total-row")).length;
    const totalRow = body.querySelector(".total-row");

    body.insertBefore(createTable2Row(count + 1), totalRow);
    savePlan();
  }

  function addTable3Row() {
    const body = $("table3Body");
    if (!body) return;

    const count = body.querySelectorAll("tr").length;
    body.appendChild(createTable3Row(count + 1));
    savePlan();
  }

  document.addEventListener("DOMContentLoaded", () => {
    addInitialTable1Rows();
    addInitialTable2Rows();
    addInitialTable3Rows();

    loadPlan();
$("showTable1ZoneBtn")?.addEventListener("click", () => {
  const zoneCode = $("table1ZoneSelect")?.value || "";

  if (!zoneCode) {
    alert("Сначала выберите зону энергосбережения.");
    return;
  }

  openTable1Zone(zoneCode);
});
    $("planYearFrom")?.addEventListener("input", () => {
      updateYearHeaders();
      savePlan();
    });

    $("planYearTo")?.addEventListener("input", savePlan);
    $("orgName")?.addEventListener("input", savePlan);
    $("approvalDate")?.addEventListener("input", savePlan);

    $("savePlanBtn")?.addEventListener("click", () => {
      savePlan();
      alert("План мероприятий сохранён в браузере.");
    });

    $("clearPlanBtn")?.addEventListener("click", clearPlan);

    $("addTable2RowBtn")?.addEventListener("click", addTable2Row);
    $("addTable3RowBtn")?.addEventListener("click", addTable3Row);

$("table1Body")?.addEventListener("click", (event) => {
  const addZoneRowBtn = event.target.closest(".add-zone-row-btn");
  if (addZoneRowBtn) {
    const zoneCode = addZoneRowBtn.dataset.zoneAdd || "";
    addTable1Row(zoneCode);
    return;
  }

  const deleteZoneBtn = event.target.closest(".delete-zone-btn");
  if (deleteZoneBtn) {
    const zoneCode = deleteZoneBtn.dataset.zoneDelete || "";
    deleteTable1Zone(zoneCode);
    return;
  }

  const deleteRowBtn = event.target.closest(".delete-row-btn");
  if (deleteRowBtn) {
    const row = deleteRowBtn.closest("tr[data-zone]");
    deleteTable1Row(row);
  }
});
    bindEvents(document);
    recalc();
  });
})();