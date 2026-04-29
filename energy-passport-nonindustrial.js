// energy-passport-nonindustrial.js
// ВАЖНО: этот файл рассчитан на то, что climate_kz.json лежит в ./data/climate_kz.json

(() => {
  "use strict";

  console.log("[energy-passport-nonindustrial] loaded");

  const GCAL_TO_KWH = 1162.222; // 1 Гкал ≈ 1162.222 кВт·ч
  const CLIMATE_URL = "./data/climate_kz.json";

  // Режим расчёта компактности:
  // "A" => Kкомп = Aнсум / Vот
  // "B" => Kкомп = Aнсум / (Vот)^(2/3)
  const KCOMP_MODE = "A";

  // ============================================================================
  // СН РК 2.04-07-2022 "Тепловая защита зданий", Таблица 4
  // Нормируемые (требуемые) значения R0тр по ГСОП для 3 групп зданий.
  // ============================================================================
  const TABLE4 = {
    g1: {
      walls: {
        points: { 2000: 2.1, 3000: 2.45, 4000: 2.8, 5000: 3.15, 6000: 3.5, 7000: 3.85 },
        a: 0.00035, b: 1.4
      },
      roof_drive: {
        points: { 2000: 3.2, 3000: 3.7, 4000: 4.2, 5000: 4.7, 6000: 5.2, 7000: 5.7 },
        a: 0.0005, b: 2.2
      },
      attic_basement: {
        points: { 2000: 2.8, 3000: 3.25, 4000: 3.7, 5000: 4.15, 6000: 4.6, 7000: 5.05 },
        a: 0.00045, b: 1.9
      },
      windows: {
        points: { 2000: 0.49, 3000: 0.56, 4000: 0.63, 5000: 0.68, 6000: 0.73, 7000: 0.74 }
      },
      lantern: {
        points: { 2000: 0.3, 3000: 0.325, 4000: 0.35, 5000: 0.375, 6000: 0.4, 7000: 0.425 },
        a: 0.000025, b: 0.25
      }
    },

    g2: {
      walls: {
        points: { 2000: 1.8, 3000: 2.1, 4000: 2.4, 5000: 2.7, 6000: 3.0, 8000: 3.3 },
        a: 0.0003, b: 1.4
      },
      roof_drive: {
        points: { 2000: 2.4, 3000: 2.8, 4000: 3.2, 5000: 3.6, 6000: 4.0, 8000: 4.4 },
        a: 0.0004, b: 2.2
      },
      attic_basement: {
        points: { 2000: 2.0, 3000: 2.35, 4000: 2.7, 5000: 3.05, 6000: 3.4, 8000: 3.75 },
        a: 0.00035, b: 1.9
      },
      windows: {
        points: { 2000: 0.35, 3000: 0.38, 4000: 0.45, 5000: 0.53, 6000: 0.6, 8000: 0.65 }
      },
      lantern: {
        points: { 2000: 0.3, 3000: 0.325, 4000: 0.35, 5000: 0.375, 6000: 0.4, 8000: 0.425 },
        a: 0.000025, b: 0.25
      }
    },

    g3: {
      walls: {
        points: { 2000: 1.4, 4000: 1.8, 6000: 2.2, 8000: 2.6 },
        a: 0.0002, b: 1.0
      },
      roof_drive: {
        points: { 2000: 2.0, 4000: 2.5, 6000: 3.0, 8000: 3.5 },
        a: 0.00025, b: 1.5
      },
      attic_basement: {
        points: { 2000: 1.4, 4000: 1.8, 6000: 2.2, 8000: 2.6 },
        a: 0.0002, b: 1.0
      },
      windows: {
        points: { 2000: 0.25, 4000: 0.3, 6000: 0.35, 8000: 0.4 },
        a: 0.000025, b: 0.2
      },
      lantern: {
        points: { 2000: 0.2, 4000: 0.25, 6000: 0.3, 8000: 0.35 },
        a: 0.000025, b: 0.15
      }
    }
  };

  // ============================================================================
  // СН РК 2.04-07-2022, Таблица 9: qот,тр (Вт/(м³·°C))
  // Qnorm,kWh = qот,тр * Vот * ГСОП * 24 / 1000
  // Qnorm,Gcal = Qnorm,kWh / 1162.222
  // ============================================================================
  const TABLE9 = {
    residential:      { f1: 0.455, f2: 0.414, f3: 0.372, f4_5: 0.359, f6_7: 0.336, f8_9: 0.319, f10_11: 0.301, f12p: 0.290 },
    other_public:     { f1: 0.487, f2: 0.440, f3: 0.417, f4_5: 0.371, f6_7: 0.359, f8_9: 0.342, f10_11: 0.324, f12p: null },
    medical:          { f1: 0.455, f2: 0.427, f3: 0.399, f4_5: 0.364, f6_7: 0.339, f8_9: 0.319, f10_11: 0.296, f12p: 0.280 },
    preschool:        { f1: 0.476, f2: 0.454, f3: 0.428, f4_5: null,  f6_7: null,  f8_9: null,  f10_11: null, f12p: null },
    service_warehouse:{ f1: 0.537, f2: 0.477, f3: 0.439, f4_5: 0.398, f6_7: 0.373, f8_9: 0.339, f10_11: 0.310, f12p: 0.285 },
    admin:            { f1: 0.521, f2: 0.467, f3: 0.432, f4_5: 0.392, f6_7: 0.374, f8_9: 0.354, f10_11: 0.332, f12p: 0.319 }
  };

  // ============================================================================
  // DOM helpers
  // ============================================================================
  const $ = (id) => document.getElementById(id);

  function getElFirstExisting(ids) {
    for (const id of ids) {
      const el = $(id);
      if (el) return el;
    }
    return null;
  }

  function toNumber(v) {
    const s = String(v ?? "").trim();
    if (s === "") return NaN;
    const n = Number(s.replace(/,/g, "."));
    return Number.isFinite(n) ? n : NaN;
  }

  function num(id) {
    const el = $(id);
    return el ? toNumber(el.value) : NaN;
  }

  function numFirstExisting(ids) {
    const el = getElFirstExisting(ids);
    if (!el) return NaN;
    const n = toNumber(el.value);
    return Number.isFinite(n) ? n : NaN;
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function fmt(x, d = 2) {
    return Number.isFinite(x) ? x.toFixed(d) : "—";
  }

  function clamp(x, min, max) {
    return Math.max(min, Math.min(max, x));
  }

  function forceVal(id, value, d = 1) {
    const el = $(id);
    if (!el) return;

    if (!Number.isFinite(value)) {
      el.value = "";
      return;
    }
    const next = value.toFixed(d);
    if (String(el.value ?? "") !== next) el.value = next;
  }

  function forceValFirstExisting(ids, value, d = 3) {
    for (const id of ids) {
      const el = $(id);
      if (el) {
        forceVal(id, value, d);
        return true;
      }
    }
    return false;
  }

  function safeOn(id, eventName, handler, opts) {
    const el = $(id);
    if (!el) return false;
    el.addEventListener(eventName, handler, opts);
    return true;
  }

  // ============================================================================
  // FIX: убиваем datalist/подсказки (чёрные выпадающие списки)
  // ============================================================================
  function killDatalists() {
    // 1) убираем привязку list у инпутов
    document.querySelectorAll("input[list]").forEach((el) => {
      el.removeAttribute("list");
    });

    // 2) удаляем сами datalist (если есть)
    document.querySelectorAll("datalist").forEach((dl) => dl.remove());
  }

  // ============================================================================
  // FIX: ввод дробных чисел с запятой + отключение "чёрных подсказок" Chrome
  // ============================================================================
  function upgradeNumericInputs() {
    // Берём number-поля, которые пользователь вводит руками (не readonly)
    const inputs = Array.from(document.querySelectorAll('input[type="number"]:not([readonly])'));

    inputs.forEach((el) => {
      // ✅ делаем вводимое поле текстовым, чтобы запятая работала всегда
      try { el.type = "text"; } catch (_) {}

      el.setAttribute("inputmode", "decimal");
      el.setAttribute("autocomplete", "new-password");
      el.setAttribute("autocorrect", "off");
      el.setAttribute("autocapitalize", "off");
      el.setAttribute("spellcheck", "false");

      // (опционально) подсказка валидного ввода
      el.setAttribute("pattern", "^-?\\d*([\\.,]\\d*)?$");

      // Санитария: только цифры, точка, запятая, минус
      const sanitize = () => {
        let v = String(el.value ?? "");
        v = v.replace(/[^\d.,\-]/g, "");

        // один минус — только в начале
        v = v.replace(/(?!^)-/g, "");

        // только один десятичный разделитель (первый)
        const firstSep = v.search(/[.,]/);
        if (firstSep !== -1) {
          const head = v.slice(0, firstSep + 1);
          const tail = v.slice(firstSep + 1).replace(/[.,]/g, "");
          v = head + tail;
        }

        if (v !== el.value) el.value = v;
      };

      el.addEventListener("input", sanitize);
      el.addEventListener("paste", () => setTimeout(sanitize, 0));
    });
  }

  function disableAutocompleteEverywhere() {
    const all = document.querySelectorAll("input, select, textarea");
    all.forEach((el) => {
      if (el.hasAttribute("readonly")) return;
      el.setAttribute("autocomplete", "new-password");
      el.setAttribute("autocorrect", "off");
      el.setAttribute("autocapitalize", "off");
      el.setAttribute("spellcheck", "false");
    });
  }

  // ============================================================================
  // ✅ Фикс ввода запятой в type="number"
  // (Chrome не принимает "0,3" — превращаем в "0.3" прямо на keydown/paste/input)
  // ============================================================================
  function enableCommaAsDecimalForNumberInputs(root = document) {
    const inputs = root.querySelectorAll('input[type="number"]');

    inputs.forEach((el) => {
      // keydown: запятая превращается в точку в позиции курсора
      el.addEventListener("keydown", (e) => {
        if (e.key !== ",") return;
        e.preventDefault();

        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const v = String(el.value ?? "");

        el.value = v.slice(0, start) + "." + v.slice(end);

        const pos = start + 1;
        try { el.setSelectionRange(pos, pos); } catch (_) {}

        el.dispatchEvent(new Event("input", { bubbles: true }));
      });

      // input: если каким-то образом попала запятая — заменим
      el.addEventListener("input", () => {
        if (typeof el.value === "string" && el.value.includes(",")) {
          el.value = el.value.replace(/,/g, ".");
        }
      });

      // paste/drop: если вставка с запятой — после вставки почистим
      el.addEventListener("paste", () => {
        queueMicrotask(() => {
          if (typeof el.value === "string" && el.value.includes(",")) {
            el.value = el.value.replace(/,/g, ".");
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        });
      });

      el.addEventListener("drop", () => {
        setTimeout(() => {
          if (typeof el.value === "string" && el.value.includes(",")) {
            el.value = el.value.replace(/,/g, ".");
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }, 0);
      });
    });
  }

  // ============================================================================
  // НОРМАЛИЗАЦИЯ типа чердака (cold/warm + задел на none)
  // ============================================================================
  function normalizeAtticType(raw) {
    const s = String(raw ?? "").trim().toLowerCase();

    const isNone =
      s === "none" ||
      s === "no_attic" ||
      s.includes("нет") ||
      s.includes("совмещ") ||
      s.includes("покрыт") ||
      s.includes("no attic");

    if (isNone) return "none";

    const isWarm =
      s === "warm" ||
      s === "warm_attic" ||
      s === "heated" ||
      s.includes("тепл") ||
      s.includes("warm") ||
      s.includes("heated");

    return isWarm ? "warm" : "cold";
  }

  // ============================================================================
  // Vот, Aот (на случай разных id в HTML)
  // ============================================================================
  function getVot() {
    return numFirstExisting(["s2_vot_fact", "s2_vot", "vot_fact", "vot"]);
  }
  function getAot() {
    return numFirstExisting(["s2_aot_fact", "s2_aot", "aot_fact", "aot"]);
  }

  // ============================================================================
  // ✅ УМНЫЙ LOCK (строго как ты дал)
  // ============================================================================
  function lockElement(el) {
    if (!el) return;

    el.readOnly = true;
    el.setAttribute("readonly", "readonly");

    if (el.dataset.locked === "1") return;
    el.dataset.locked = "1";

    const stop = (e) => {
      // Блокируем ввод ТОЛЬКО когда поле реально нельзя редактировать
      if (el.readOnly || el.disabled) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      return true;
    };

    el.addEventListener("keydown", stop);
    el.addEventListener("paste", stop);
    el.addEventListener("drop", stop);
    el.addEventListener("beforeinput", stop);
  }

  function lockField(id) { lockElement($(id)); }

  function disableElement(el) {
    if (!el) return;
    el.disabled = true;
    el.setAttribute("disabled", "disabled");
    lockElement(el);
  }

  function disableField(id) { disableElement($(id)); }

  // Мягкое включение/выключение (для Aж/Aр) + защита от залипания readonly
  function setDisabled(id, disabled, { clear = false } = {}) {
    const el = $(id);
    if (!el) return;

    el.disabled = !!disabled;
    if (disabled) el.setAttribute("disabled", "disabled");
    else el.removeAttribute("disabled");

    if (!disabled) {
      // важно: если когда-то было залочено/disabled — снимаем readonly
      el.readOnly = false;
      el.removeAttribute("readonly");
    }

    if (disabled && clear) el.value = "";
  }

  // ============================================================================
  // Тип здания: нормализация
  // Возвращаем: "" | residential | public | education | medical | industrial
  // ============================================================================
  function getSelectedValueAndText(selectId) {
    const sel = $(selectId);
    if (!sel) return { value: "", text: "" };
    const value = String(sel.value ?? "").trim();
    const opt = sel.options?.[sel.selectedIndex];
    const text = String(opt?.textContent ?? "").trim();
    return { value, text };
  }

  function normalizeBuildingType() {
    const { value, text } = getSelectedValueAndText("buildingTypeSelect");
    const raw = `${value} ${text}`.trim().toLowerCase();
    if (!raw) return "";

    const looksEmpty =
      raw.includes("выберите") ||
      raw.includes("select") ||
      raw.includes("choose") ||
      raw === "-" ||
      raw === "—" ||
      raw.includes("не выбра");

    if (looksEmpty) return "";

    const has = (...keys) => keys.some(k => raw.includes(k));

    if (has("resid", "жил", "квартир", "многокварт", "коттедж", "общежит", "house", "apartment")) {
      return "residential";
    }
    if (has("med", "мед", "больниц", "поликлин", "стационар", "hospital", "clinic")) {
      return "medical";
    }
    if (has("educ", "учеб", "школ", "лицей", "гимназ", "колледж", "универ", "детск", "сад", "доу", "preschool", "kindergarten", "school")) {
      return "education";
    }
    if (has("ind", "пром", "производ", "цех", "завод", "factory", "plant", "workshop")) {
      return "industrial";
    }

    // всё остальное общественное
    return "public";
  }

function getMainBuildingType() {
  return getBuildingChoice().main || normalizeBuildingType();
}
function getBuildingChoice() {
  const raw = String($("buildingTypeSelect")?.value ?? "").trim();

  const map = {
    residential: {
      main: "residential",
      table9: "residential",
      group: "g1",
      publicKind: null,
      educationKind: null,
      industrialKind: null
    },

    public_admin: {
      main: "public",
      table9: "admin",
      group: "g2",
      publicKind: "admin",
      educationKind: null,
      industrialKind: null
    },

    public_other: {
      main: "public",
      table9: "other_public",
      group: "g2",
      publicKind: "other_public",
      educationKind: null,
      industrialKind: null
    },

    public_service_warehouse: {
      main: "public",
      table9: "service_warehouse",
      group: "g2",
      publicKind: "service_warehouse",
      educationKind: null,
      industrialKind: null
    },

    education_school: {
      main: "education",
      table9: "other_public",
      group: "g1",
      publicKind: null,
      educationKind: "school",
      industrialKind: null
    },

    education_preschool: {
      main: "education",
      table9: "preschool",
      group: "g1",
      publicKind: null,
      educationKind: "preschool",
      industrialKind: null
    },

    medical: {
      main: "medical",
      table9: "medical",
      group: "g1",
      publicKind: null,
      educationKind: null,
      industrialKind: null
    },

    industrial_production: {
      main: "industrial",
      table9: "service_warehouse",
      group: "g3",
      publicKind: null,
      educationKind: null,
      industrialKind: "production"
    },

    industrial_warehouse: {
      main: "industrial",
      table9: "service_warehouse",
      group: "g3",
      publicKind: null,
      educationKind: null,
      industrialKind: "warehouse"
    }
  };

  return map[raw] || {
    main: normalizeBuildingType(),
    table9: null,
    group: null,
    publicKind: null,
    educationKind: null,
    industrialKind: null
  };
}

function setSelectValueIfExists(id, value) {
  const el = $(id);
  if (!el || value == null) return;

  const hasOption = Array.from(el.options || []).some(opt => opt.value === value);
  if (hasOption) el.value = value;
}

function syncSubtypeFromBuildingType() {
  const choice = getBuildingChoice();

  setSelectValueIfExists("s1_public_kind", choice.publicKind);
  setSelectValueIfExists("s1_edu_kind", choice.educationKind);
  setSelectValueIfExists("s1_industrial_kind", choice.industrialKind);
}
  // ============================================================================
  // Показ/скрытие подтипов
  // ============================================================================
  function setWrapVisible(wrapId, visible) {
    const wrap = $(wrapId);
    if (!wrap) return;
    wrap.style.display = visible ? "" : "none";
  }

function updateSubtypeVisibility() {
  const t = getMainBuildingType();

  // Подтипы уже зашиты в buildingTypeSelect,
  // поэтому отдельные уточняющие списки пользователю не показываем.
  setWrapVisible("wrap_edu_kind", false);
  setWrapVisible("wrap_public_kind", false);
  setWrapVisible("wrap_industrial_kind", false);

  // Режим влажности для промышленного можно оставить отдельно.
  setWrapVisible("wrap_industrial_regime", t === "industrial");

  // Проектный расход вентиляции нужен для нежилых зданий.
  setWrapVisible("wrap_Lvent_proj", t !== "residential");
}

  // ============================================================================
  // tв: авто, но можно руками
  // ============================================================================
  const TV_ID = "s1_tv";

  function isTvManual() {
    const el = $(TV_ID);
    return !!el && el.dataset.tvMode === "manual";
  }

  function setTvMode(mode) {
    const el = $(TV_ID);
    if (!el) return;
    el.dataset.tvMode = (mode === "manual") ? "manual" : "auto";
  }

  function getAutoTvValue() {
    const type = getMainBuildingType();

    const eduRaw = String(
      $("educationSubtypeSelect")?.value ??
      $("s1_edu_kind")?.value ??
      "school"
    ).trim();

    const pubRaw = String(
      $("publicSubtypeSelect")?.value ??
      $("s1_public_kind")?.value ??
      "other_public"
    ).trim();

    const indUseRaw = String(
      $("industrialUseSelect")?.value ??
      $("s1_industrial_kind")?.value ??
      "production"
    ).trim();

    if (type === "medical") return 21;

    if (type === "education") {
      const isPreschool = (eduRaw === "preschool" || eduRaw === "kindergarten");
      return isPreschool ? 22 : 20;
    }

    if (type === "public") {
      const isServiceWarehouse = (pubRaw === "service_warehouse");
      return isServiceWarehouse ? 18 : 20;
    }

    if (type === "industrial") {
      const isWarehouse = (indUseRaw === "warehouse_service" || indUseRaw === "warehouse");
      return isWarehouse ? 18 : 16;
    }

    if (type === "residential") return 20;
    return 20;
  }

  function applyTvAutoIfAllowed() {
    const el = $(TV_ID);
    if (!el) return;

    const cur = String(el.value ?? "").trim();
    const autoVal = getAutoTvValue();

    // если пусто — заполним авто
    if (cur === "") {
      setTvMode("auto");
      if (Number.isFinite(autoVal)) el.value = Number(autoVal).toFixed(1);
      return;
    }

    // если вручную — не трогаем
    if (isTvManual()) return;

    const next = Number(autoVal).toFixed(1);
    if (String(el.value ?? "") !== next) el.value = next;
  }

  function bindTvAutoManualBehavior() {
    const el = $(TV_ID);
    if (!el) return;

    if (String(el.value ?? "").trim() === "") {
      setTvMode("auto");
      applyTvAutoIfAllowed();
    } else {
      setTvMode("auto");
    }

    el.addEventListener("input", () => {
      const cur = String(el.value ?? "").trim();
      if (cur === "") {
        setTvMode("auto");
        applyTvAutoIfAllowed();
      } else {
        setTvMode("manual");
      }
    });

    el.addEventListener("change", () => {
      const cur = String(el.value ?? "").trim();
      if (cur === "") {
        setTvMode("auto");
        applyTvAutoIfAllowed();
      }
    });
  }

  // ============================================================================
  // Таблица 2: отключение колонок "Нормативное" и "Проектное"
  // ============================================================================
  function disableS2NormProjByIdPattern() {
    const sel =
      'input[id^="s2_"][id$="_norm"], input[id^="s2_"][id$="_proj"], ' +
      'select[id^="s2_"][id$="_norm"], select[id^="s2_"][id$="_proj"], ' +
      'textarea[id^="s2_"][id$="_norm"], textarea[id^="s2_"][id$="_proj"]';

    document.querySelectorAll(sel).forEach(disableElement);
  }

  function findGeomTable2() {
    const tables = Array.from(document.querySelectorAll("table"));
    for (const t of tables) {
      const hasS2Inputs = !!t.querySelector('input[id^="s2_"], select[id^="s2_"], textarea[id^="s2_"]');
      if (!hasS2Inputs) continue;

      const head = Array.from(t.querySelectorAll("th"))
        .map(x => (x.textContent || "").trim().toLowerCase());

      const hasNorm = head.some(s => s.includes("норматив"));
      const hasProj = head.some(s => s.includes("проект"));
      const hasFact = head.some(s => s.includes("фактич"));

      if (hasNorm && hasProj && hasFact) return t;
    }
    return null;
  }

  function disableTableColumns(table, colIdxs) {
    if (!table) return;
    const rows = Array.from(table.querySelectorAll("tr"));
    rows.forEach((tr) => {
      const cells = Array.from(tr.children);
      colIdxs.forEach((col) => {
        const cell = cells[col];
        if (!cell) return;
        cell.querySelectorAll("input, select, textarea, button").forEach(disableElement);
      });
    });
  }

  function hardDisableTable2() {
    disableS2NormProjByIdPattern();
    const t2 = findGeomTable2();
    // обычно: 0..5; 3="Нормативное", 4="Проектное"
    disableTableColumns(t2, [3, 4]);
  }
  // ============================================================================
  // ✅ Раздел 4 (Показатели вспомогательные)
  // Требование: колонка "Нормируемое значение" должна быть ВСЕГДА ПУСТОЙ и НЕАКТИВНОЙ
  // ============================================================================
  function disableS4NormByIdPattern() {
  const sel =
    'input[id^="s4_"][id$="_norm"], select[id^="s4_"][id$="_norm"], textarea[id^="s4_"][id$="_norm"]';

  document.querySelectorAll(sel).forEach((el) => {
    el.value = "";
    disableElement(el);
  });
}

  function findAuxTable4() {
    const tables = Array.from(document.querySelectorAll("table"));

    for (const t of tables) {
      const head = Array.from(t.querySelectorAll("th"))
        .map(x => (x.textContent || "").trim().toLowerCase());

      const hasNorm = head.some(s => s.includes("нормируем"));
      const hasAux = (t.textContent || "").toLowerCase().includes("показатели вспомогательные");

      // чаще всего в этой таблице сидят s4_* поля
      const hasS4 = !!t.querySelector('input[id^="s4_"], select[id^="s4_"], textarea[id^="s4_"]');

      if ((hasNorm && hasS4) || (hasAux && hasNorm)) return t;
    }
    return null;
  }

  function clearAndDisableColumn(table, colIdx) {
    if (!table) return;
    const rows = Array.from(table.querySelectorAll("tr"));
    rows.forEach((tr) => {
      const cells = Array.from(tr.children);
      const cell = cells[colIdx];
      if (!cell) return;

      cell.querySelectorAll("input, select, textarea, button").forEach((el) => {
        if ("value" in el) el.value = "";
        disableElement(el);
      });
    });
  }

  function hardDisableTable4Norm() {
    // 1) по id-шаблону (на всякий)
    disableS4NormByIdPattern();

    // 2) по колонке таблицы: обычно индекс 3 = "Нормируемое значение"
    const t4 = findAuxTable4();
    clearAndDisableColumn(t4, 3);
  }

  // ============================================================================
  // ✅ Таблица 2: "релевантность" fact-полей по типу здания/чердака/подполья
  // (именно то, что ты просил)
  // ============================================================================
  function setUserEditable(id, enabled, { clear = false } = {}) {
    const el = $(id);
    if (!el) return;

    el.disabled = !enabled;
    if (!enabled) el.setAttribute("disabled", "disabled");
    else el.removeAttribute("disabled");

    if (enabled) {
      // важно: если раньше где-то залочили — снимаем readonly
      el.readOnly = false;
      el.removeAttribute("readonly");
    } else if (clear) {
      el.value = "";
    }
  }

  function applyGeomFieldRelevance() {
    // 1) Жилое/нежилое: Aж vs Aр
    const type = getMainBuildingType();
    const isResidential = (type === "residential");

    if (type !== "") {
      setUserEditable("s2_aj_fact", isResidential, { clear: !isResidential });
      setUserEditable("s2_ar_fact", !isResidential, { clear: isResidential });
    } else {
      // тип не выбран — пусть оба доступны
      setUserEditable("s2_aj_fact", true);
      setUserEditable("s2_ar_fact", true);
    }

    // 2) Верх: из тройки {Aпокр, Aчерд, Aчерд.т} оставляем только релевантное
    const atticType = normalizeAtticType($("s1_attic_type")?.value ?? "cold");

    if (atticType === "warm") {
      setUserEditable("s2_acherdt_fact", true);
      setUserEditable("s2_acherd_fact", false, { clear: true });
      setUserEditable("s2_apokr_fact", false, { clear: true });
    } else if (atticType === "none") {
      setUserEditable("s2_apokr_fact", true);
      setUserEditable("s2_acherd_fact", false, { clear: true });
      setUserEditable("s2_acherdt_fact", false, { clear: true });
    } else {
      // cold
      setUserEditable("s2_acherd_fact", true);
      setUserEditable("s2_acherdt_fact", false, { clear: true });
      setUserEditable("s2_apokr_fact", false, { clear: true });
    }

    // 3) Техподполье: если подполье в зоне tв (heated) — Aцок1 не ограждение => блокируем
    const subType = String($("s1_subfloor_type")?.value ?? "unheated");
    const isSubfloorHeated = (subType === "heated");
    setUserEditable("s2_acok1_fact", !isSubfloorHeated, { clear: isSubfloorHeated });
  }

  // ============================================================================
  // Режим ввода площадей: Aж только для жилых, Aр только для нежилых
  // (сохранено, но теперь не конфликтует с applyGeomFieldRelevance)
  // ============================================================================
  function applyAreaInputsMode() {
    const type = getMainBuildingType();

    if (type === "") {
      setDisabled("s2_aj_fact", false);
      setDisabled("s2_ar_fact", false);
      return;
    }

    const isResidential = (type === "residential");

    if (isResidential) {
      setDisabled("s2_aj_fact", false);
      setDisabled("s2_ar_fact", true, { clear: true });
    } else {
      setDisabled("s2_aj_fact", true, { clear: true });
      setDisabled("s2_ar_fact", false);
    }
  }

  // ============================================================================
  // Класс по отклонению
  // ============================================================================
  function classByDelta(deltaPct) {
    if (!Number.isFinite(deltaPct)) return "—";
    if (deltaPct < -60) return "A++";
    if (deltaPct < -50) return "A+";
    if (deltaPct < -40) return "A";
    if (deltaPct < -30) return "B+";
    if (deltaPct < -15) return "B";
    if (deltaPct < -5) return "C+";
    if (deltaPct <= 5) return "C";
    if (deltaPct <= 15) return "C-";
    if (deltaPct <= 50) return "D";
    return "E";
  }

  // ============================================================================
  // Climate DB
  // ============================================================================
  let climateDB = null;

  async function loadClimateDB() {
    const res = await fetch(CLIMATE_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`climate_kz.json не загрузился: ${res.status}`);
    const json = await res.json();
    climateDB = (json && typeof json === "object") ? json : {};

    const sel = $("citySelect");
    if (!sel) return;

    [...sel.querySelectorAll('option[data-city="1"]')].forEach((opt) => opt.remove());

    const cities = Object.keys(climateDB).sort((a, b) => a.localeCompare(b, "ru"));
    for (const c of cities) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      opt.setAttribute("data-city", "1");
      sel.appendChild(opt);
    }
  }

  function applyCityClimate(city) {
    if (!climateDB || !city || !climateDB[city]) return;

    const derived = (climateDB[city]?.derived) ? climateDB[city].derived : {};
    const t_n = toNumber(derived.t_n);
    const t_ot = toNumber(derived.t_ot);
    const z_ot = toNumber(derived.z_ot);

    forceVal("s1_tn", t_n, 1);
    forceVal("s1_tot", t_ot, 1);
    forceVal("s1_zot", z_ot, 0);

    applyTvAutoIfAllowed();
    recalcAll();
  }

  // ============================================================================
  // Авто-расчёт tчерд и tподп
  // ============================================================================
  function calcAtticAndSubfloor() {
    const tn = num("s1_tn");
    const tv = num("s1_tv");

    const atticType = normalizeAtticType($("s1_attic_type")?.value ?? "cold");
    const subType = String($("s1_subfloor_type")?.value ?? "unheated");

    if (!Number.isFinite(tn) || !Number.isFinite(tv)) {
      forceVal("s1_tcherd", NaN, 1);
      forceVal("s1_tpodp", NaN, 1);
      return;
    }

    // warm => tчерд = tв
    // cold => tн + 0.30*(tв - tн)
    // none => нет смысла (оставляем пусто)
    const tcherd =
      (atticType === "warm") ? tv :
      (atticType === "none") ? NaN :
      clamp(tn + 0.30 * (tv - tn), tn, tv);

    let tpodp;
    if (subType === "heated") tpodp = tv;
    else if (subType === "basement_warm") tpodp = clamp(tn + 0.70 * (tv - tn), tn, tv);
    else tpodp = clamp(tn + 0.50 * (tv - tn), tn, tv);

    forceVal("s1_tcherd", tcherd, 1);
    forceVal("s1_tpodp", tpodp, 1);
  }

  // ============================================================================
  // Таблица 4: вычисления R0тр
  // ============================================================================
function getBuildingGroup() {
  const choice = getBuildingChoice();
  if (choice.group) return choice.group;

  const v = getMainBuildingType();
  if (v === "industrial") return "g3";
  if (v === "public") return "g2";
  if (v === "residential" || v === "education" || v === "medical") return "g1";
  return null;
}

  function sortedKeysNum(obj) {
    return Object.keys(obj).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  }

  function interpolateByPoints(points, gsop) {
    const keys = sortedKeysNum(points);
    if (keys.length === 0 || !Number.isFinite(gsop)) return NaN;

    if (gsop <= keys[0]) return points[keys[0]];
    if (gsop >= keys[keys.length - 1]) return points[keys[keys.length - 1]];

    for (let i = 0; i < keys.length - 1; i++) {
      const x1 = keys[i];
      const x2 = keys[i + 1];
      if (gsop >= x1 && gsop <= x2) {
        const y1 = points[x1];
        const y2 = points[x2];
        const t = (gsop - x1) / (x2 - x1);
        return y1 + (y2 - y1) * t;
      }
    }
    return points[keys[keys.length - 1]];
  }

  function calcR0tr(groupKey, elementKey, gsop) {
    if (!groupKey || !TABLE4[groupKey] || !TABLE4[groupKey][elementKey]) return NaN;
    const entry = TABLE4[groupKey][elementKey];
    if (!Number.isFinite(gsop)) return NaN;

    const points = entry.points || {};
    const keys = sortedKeysNum(points);

    // ✅ 1) приоритет — формула по a,b (если заданы)
    if (Number.isFinite(entry.a) && Number.isFinite(entry.b)) {
      // Если в норме хочешь ограничивать диапазон ГСОП рамками табличных значений — оставляем clamp
      const minG = keys.length ? keys[0] : gsop;
      const maxG = keys.length ? keys[keys.length - 1] : gsop;
      const gsopClamped = keys.length ? clamp(gsop, minG, maxG) : gsop;
      return entry.a * gsopClamped + entry.b;
    }

    // ✅ 2) если формулы нет — табличное значение/интерполяция как fallback
    if (keys.length > 0) {
      if (Object.prototype.hasOwnProperty.call(points, gsop)) return points[gsop];
      const byPts = interpolateByPoints(points, gsop);
      if (Number.isFinite(byPts)) return byPts;
    }

    return NaN;
  }

  const S3_NORM_FIELDS = [
    { id: "s3_wall_norm", d: 2 },
    { id: "s3_win_norm", d: 2 },
    { id: "s3_vitr_norm", d: 2 },
    { id: "s3_lantern_norm", d: 3 },

    // ✅ ДОБАВЛЕНО: нормы для строк 5/6/7/13
    { id: "s3_stairwin_norm", d: 2 },
    { id: "s3_baldoor_norm", d: 2 },
    { id: "s3_doorgate_norm", d: 2 },
    { id: "s3_ground_norm", d: 2 },

    { id: "s3_roof_norm", d: 2 },
    { id: "s3_attic_norm", d: 2 },
    { id: "s3_warmattic_norm", d: 2 },
    { id: "s3_basement_norm", d: 2 },
    { id: "s3_drive_norm", d: 2 }
  ];

  function clearTable4Norms() {
    S3_NORM_FIELDS.forEach(({ id, d }) => forceVal(id, NaN, d));
  }

  function applyTable4Norms() {
    const groupKey = getBuildingGroup();
    const gsop = num("s1_gsop");

    function setNormIfFactEnabled(normId, factId, value, d) {
      const factEl = $(factId);
      const enabled = !!factEl && !factEl.disabled;
      if (!enabled) {
        forceVal(normId, NaN, d);
        return;
      }
      forceVal(normId, value, d);
    }

    if (!groupKey || !Number.isFinite(gsop)) {
      clearTable4Norms();
      return;
    }

    const rWall = calcR0tr(groupKey, "walls", gsop);
    const rRoofDrive = calcR0tr(groupKey, "roof_drive", gsop);
    const rAtticBas = calcR0tr(groupKey, "attic_basement", gsop);
    const rWin = calcR0tr(groupKey, "windows", gsop);
    const rLantern = calcR0tr(groupKey, "lantern", gsop);

    setNormIfFactEnabled("s3_wall_norm", "s3_wall_fact", rWall, 2);
    setNormIfFactEnabled("s3_win_norm", "s3_win_fact", rWin, 2);
    setNormIfFactEnabled("s3_vitr_norm", "s3_vitr_fact", rWin, 2);
    setNormIfFactEnabled("s3_lantern_norm", "s3_lantern_fact", rLantern, 3);

    // ✅ ДОБАВЛЕНО: отдельные строки в таблице 3 (нормативы)
    // ЛЛУ / балконные двери наружных переходов / входные двери и ворота — в TABLE4 нет отдельной колонки,
    // поэтому приравниваем к норме "окон" (как минимально корректное сопоставление).
    setNormIfFactEnabled("s3_stairwin_norm", "s3_stairwin_fact", rWin, 2);
    setNormIfFactEnabled("s3_baldoor_norm",  "s3_baldoor_fact",  rWin, 2);
    setNormIfFactEnabled("s3_doorgate_norm", "s3_doorgate_fact", rWin, 2);

    // Стены в земле / пол по грунту: отдельной нормы в TABLE4 нет,
    // используем ближайшую группу "attic_basement" (подвал/перекрытия).
    setNormIfFactEnabled("s3_ground_norm",   "s3_ground_fact",   rAtticBas, 2);

    setNormIfFactEnabled("s3_roof_norm", "s3_roof_fact", rRoofDrive, 2);
    setNormIfFactEnabled("s3_drive_norm", "s3_drive_fact", rRoofDrive, 2);

    setNormIfFactEnabled("s3_attic_norm", "s3_attic_fact", rAtticBas, 2);
    setNormIfFactEnabled("s3_warmattic_norm", "s3_warmattic_fact", rAtticBas, 2);
    setNormIfFactEnabled("s3_basement_norm", "s3_basement_fact", rAtticBas, 2);
  }

  // ============================================================================
  // Таблица 9: qот,тр и Qnorm
  // ============================================================================
  function floorsToBandKey(floors) {
    if (!Number.isFinite(floors) || floors <= 0) return null;
    const f = Math.floor(floors);

    if (f === 1) return "f1";
    if (f === 2) return "f2";
    if (f === 3) return "f3";
    if (f === 4 || f === 5) return "f4_5";
    if (f === 6 || f === 7) return "f6_7";
    if (f === 8 || f === 9) return "f8_9";
    if (f === 10 || f === 11) return "f10_11";
    if (f >= 12) return "f12p";
    return null;
  }

function pickTable9RowKey() {
    const choice = getBuildingChoice();
    if (choice.table9) return choice.table9;

    const type = getMainBuildingType();

    const bt = getSelectedValueAndText("buildingTypeSelect");
    const btRaw = `${bt.value} ${bt.text}`.trim().toLowerCase();

    const eduRaw = String(
      $("educationSubtypeSelect")?.value ??
      $("s1_edu_kind")?.value ??
      "school"
    ).trim();

    const pubSel = getSelectedValueAndText("publicSubtypeSelect");
    const pubRaw = String(
      pubSel.value ??
      $("s1_public_kind")?.value ??
      "other_public"
    ).trim();

    const pubText = String(pubSel.text ?? "").trim().toLowerCase();
    const pubJoined = `${pubRaw} ${pubText}`.trim().toLowerCase();

    const indUseRaw = String(
      $("industrialUseSelect")?.value ??
      $("s1_industrial_kind")?.value ??
      "production"
    ).trim();

    const indHumEl = getElFirstExisting(["industrialHumiditySelect", "s1_industrial_regime"]);
    const indHumRaw = String(indHumEl?.value ?? "dry_normal").trim();

    if (!type) return null;

    if (type === "residential") return "residential";
    if (type === "medical") return "medical";

    if (type === "education") {
      const isPreschool = (eduRaw === "preschool" || eduRaw === "kindergarten");
      return isPreschool ? "preschool" : "other_public";
    }

    if (type === "public") {
      const looksAdmin =
        btRaw.includes("админ") ||
        btRaw.includes("административ") ||
        btRaw.includes("офис") ||
        btRaw.includes("office") ||
        btRaw.includes("admin") ||
        pubJoined.includes("админ") ||
        pubJoined.includes("административ") ||
        pubJoined.includes("офис") ||
        pubJoined.includes("office") ||
        pubJoined.includes("admin");

      const looksWarehouse =
        btRaw.includes("склад") ||
        btRaw.includes("warehouse") ||
        btRaw.includes("service") ||
        pubJoined.includes("склад") ||
        pubJoined.includes("warehouse") ||
        pubJoined.includes("service");

      const isAdmin = (pubRaw === "admin" || pubRaw === "office") || looksAdmin;
      const isServiceWarehouse = (pubRaw === "service_warehouse") || looksWarehouse;

      if (isAdmin) return "admin";
      if (isServiceWarehouse) return "service_warehouse";
      return "other_public";
    }

    if (type === "industrial") {
      const isWarehouse = (indUseRaw === "warehouse_service" || indUseRaw === "warehouse");
      if (isWarehouse) return "service_warehouse";

      // Не ломаем твою логику: режим влияет на выбор строки
      return (indHumRaw === "wet_moist" || indHumRaw === "wet") ? "other_public" : "service_warehouse";
    }

    return null;
  }

  function getQotTr() {
    let floors = num("s1_floors");
    if (!Number.isFinite(floors)) floors = num("buildingFloors");

    const bandKey = floorsToBandKey(floors);
    const rowKey = pickTable9RowKey();
    if (!rowKey || !bandKey) return NaN;

    const row = TABLE9[rowKey];
    if (!row) return NaN;

    const val = row[bandKey];
    return Number.isFinite(val) ? val : NaN;
  }

  function applyQnormFromTable9() {
    const qotTr = getQotTr();       // Вт/(м³·°C)
    const vot = getVot();           // м³
    const gsop = num("s1_gsop");    // °C·сут/год

    forceVal("s7_qnorm", qotTr, 3);

    if (!Number.isFinite(qotTr) || !Number.isFinite(vot) || vot <= 0 || !Number.isFinite(gsop) || gsop <= 0) {
      forceVal("qNormGcal", NaN, 3);
      return;
    }

    const qNormKwh = (qotTr * vot * gsop * 24) / 1000;
    const qNormGcal = qNormKwh / GCAL_TO_KWH;

    forceVal("qNormGcal", qNormGcal, 3);
  }

  function applyQcalcFromFact() {
    const qFactGcal = num("qFactGcal");
    const vot = getVot();
    const gsop = num("s1_gsop");

    if (!Number.isFinite(qFactGcal) || qFactGcal < 0 || !Number.isFinite(vot) || vot <= 0 || !Number.isFinite(gsop) || gsop <= 0) {
      forceVal("s7_qcalc", NaN, 3);
      return;
    }

    const qFactKwh = qFactGcal * GCAL_TO_KWH;
    const qcalc = (qFactKwh * 1000) / (vot * gsop * 24);

    forceVal("s7_qcalc", qcalc, 3);
  }

  // ============================================================================
  // Геометрия — Aфас и Aнсум автосуммирование
  // ============================================================================
  function sumSafe(...vals) {
    return vals.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  }

  function calcAfasFact() {
    const vals = [
      num("s2_ast_fact"),
      num("s2_aok1_fact"),
      num("s2_aok2_fact"),
      num("s2_aok3_fact"),
      num("s2_aok4_fact"),
      num("s2_adv7_fact"),
      num("s2_adv8_fact"),
    ];

    const finite = vals.filter(Number.isFinite);
    if (finite.length === 0) return NaN;      // <-- ключевой фикс
    return finite.reduce((s, x) => s + x, 0);
  }

  function updateAfasWarning() {
    const warnEl = $("warn_afas");
    if (!warnEl) return;

    const Ast  = num("s2_ast_fact");
    const Aok1 = num("s2_aok1_fact");
    const Aok2 = num("s2_aok2_fact");
    const Aok3 = num("s2_aok3_fact");
    const Aok4 = num("s2_aok4_fact");
    const Adv7 = num("s2_adv7_fact");
    const Adv8 = num("s2_adv8_fact");
    const Afas = num("s2_afas_fact");

    const openings = [Aok1, Aok2, Aok3, Aok4, Adv7, Adv8]
      .filter(Number.isFinite)
      .reduce((s, x) => s + x, 0);

    // если проёмы не введены — предупреждение не показываем
    if (!(openings > 0)) {
      warnEl.style.display = "none";
      warnEl.textContent = "";
      return;
    }

    let msg =
      "Важно: Aст вводится как НЕТТО (глухая часть стен, без окон/дверей). " +
      "Если Aст введена как БРУТТО (с проёмами), Aфас будет завышен (двойной учёт окон/дверей).";

    let color = "#a35a00";

    if (Number.isFinite(Afas) && Afas > 0) {
      const fOpen = openings / Afas;
      if (fOpen > 0.70) {
        color = "#b00020";
        msg =
          `Проверка: очень высокая доля проёмов f=${fOpen.toFixed(3)}. ` +
          "Проверь, что Aст задана НЕТТО, иначе будет двойной учёт.";
      }
    }

    warnEl.textContent = msg;
    warnEl.style.color = color;
    warnEl.style.display = "block";
  }

  function pickTopEnvelopeArea({ Apokr, Acherd, Acherdt }) {
    const atticType = normalizeAtticType($("s1_attic_type")?.value ?? "cold");

    if (atticType === "warm") {
      if (Number.isFinite(Acherdt) && Acherdt > 0) return { topArea: Acherdt, picked: "acherdt" };
      return { topArea: (Number.isFinite(Apokr) ? Apokr : 0), picked: "apokr" };
    }

    if (atticType === "none") {
      return { topArea: (Number.isFinite(Apokr) ? Apokr : 0), picked: "apokr" };
    }

    // cold
    if (Number.isFinite(Acherd) && Acherd > 0) return { topArea: Acherd, picked: "acherd" };
    return { topArea: (Number.isFinite(Apokr) ? Apokr : 0), picked: "apokr" };
  }

  function calcAnsumFact() {
    const Ast     = num("s2_ast_fact");
    const Aok1    = num("s2_aok1_fact");
    const Aok2    = num("s2_aok2_fact");
    const Aok3    = num("s2_aok3_fact");
    const Aok4    = num("s2_aok4_fact");
    const Adv7    = num("s2_adv7_fact");
    const Adv8    = num("s2_adv8_fact");

    const Apokr   = num("s2_apokr_fact");
    const Acherd  = num("s2_acherd_fact");
    const Acherdt = num("s2_acherdt_fact");

    const Acok1   = num("s2_acok1_fact");
    const Acok2   = num("s2_acok2_fact");
    const Acok3   = num("s2_acok3_fact");

    const { topArea } = pickTopEnvelopeArea({ Apokr, Acherd, Acherdt });

    const parts = [
      Ast, Aok1, Aok2, Aok3, Aok4, Adv7, Adv8,
      topArea,
      Acok1, Acok2, Acok3
    ];

    const finite = parts.filter(Number.isFinite);
    if (finite.length === 0) return NaN; // <-- ключ: не рисуем "0.00" из воздуха

    return finite.reduce((s, x) => s + x, 0);
  }

  // ============================================================================
  // Таблица 3: ГЕЙТ + релевантность по площадям
  // ============================================================================
  const S3_FACT_IDS = [
    "s3_wall_fact",
    "s3_win_fact", "s3_vitr_fact", "s3_lantern_fact", "s3_stairwin_fact",
    "s3_baldoor_fact", "s3_doorgate_fact",
    "s3_roof_fact", "s3_attic_fact", "s3_warmattic_fact",
    "s3_basement_fact", "s3_drive_fact", "s3_ground_fact",
  ];

  function setS3Enabled(enabled) {
    for (const id of S3_FACT_IDS) {
      const el = $(id);
      if (!el) continue;

      el.disabled = !enabled;
      if (!enabled) {
        el.setAttribute("disabled", "disabled");
        el.value = "";
      } else {
        el.removeAttribute("disabled");
        // чтобы не было "не могу печатать"
        el.readOnly = false;
        el.removeAttribute("readonly");
      }
    }
  }

  function enableOnlyRelevantS3Facts() {
    const anyEnabled = S3_FACT_IDS.some((id) => {
      const el = $(id);
      return el && !el.disabled;
    });
    if (!anyEnabled) return;

    const Ast  = num("s2_ast_fact");
    const Aok1 = num("s2_aok1_fact");
    const Aok2 = num("s2_aok2_fact");
    const Aok3 = num("s2_aok3_fact");
    const Aok4 = num("s2_aok4_fact");
    const Adv7 = num("s2_adv7_fact");
    const Adv8 = num("s2_adv8_fact");

    const Apokr   = num("s2_apokr_fact");
    const Acherd  = num("s2_acherd_fact");
    const Acherdt = num("s2_acherdt_fact");

    const Acok1 = num("s2_acok1_fact");
    const Acok2 = num("s2_acok2_fact");
    const Acok3 = num("s2_acok3_fact");

    function toggleByArea(id, A) {
      const el = $(id);
      if (!el) return;

      if (!Number.isFinite(A) || A <= 0) {
        el.disabled = true;
        el.setAttribute("disabled", "disabled");
        el.value = "";
      } else {
        el.disabled = false;
        el.removeAttribute("disabled");

        // важно: снимаем readonly (если где-то залипло)
        el.readOnly = false;
        el.removeAttribute("readonly");
      }
    }

    toggleByArea("s3_wall_fact", Ast);

    toggleByArea("s3_win_fact", Aok1);
    toggleByArea("s3_vitr_fact", Aok2);
    toggleByArea("s3_lantern_fact", Aok3);
    toggleByArea("s3_stairwin_fact", Aok4);

    toggleByArea("s3_baldoor_fact", Adv7);
    toggleByArea("s3_doorgate_fact", Adv8);

    const atticType = normalizeAtticType($("s1_attic_type")?.value ?? "cold");

    // Верхнее ограждение: включаем строго релевантное поле (без "фолбэков")
    if (atticType === "warm") {
      // тёплый чердак => R0т.черд
      toggleByArea("s3_warmattic_fact", Acherdt);

      // остальные выключаем
      toggleByArea("s3_attic_fact", NaN);
      toggleByArea("s3_roof_fact", NaN);

    } else if (atticType === "none") {
      // совмещённое покрытие => R0покр
      toggleByArea("s3_roof_fact", Apokr);

      toggleByArea("s3_attic_fact", NaN);
      toggleByArea("s3_warmattic_fact", NaN);

    } else {
      // cold => чердачное перекрытие => R0черд (ТВОЯ СТРОКА 9)
      toggleByArea("s3_attic_fact", Acherd);

      toggleByArea("s3_warmattic_fact", NaN);
      toggleByArea("s3_roof_fact", NaN);
    }

    toggleByArea("s3_basement_fact", Acok1);
    toggleByArea("s3_drive_fact", Acok2);
    toggleByArea("s3_ground_fact", Acok3);
  }

  function geomReadyForS3() {
    const Aot = getAot();
    const Vot = getVot();
    const Ast = num("s2_ast_fact");

    if (!Number.isFinite(Aot) || Aot <= 0) return { ok: false, reason: "Не задана Aот (сумма площадей этажей)." };
    if (!Number.isFinite(Vot) || Vot <= 0) return { ok: false, reason: "Не задан Vот (отапливаемый объём)." };
    if (!Number.isFinite(Ast) || Ast <= 0) return { ok: false, reason: "Не задана площадь стен Aст." };

    const Apokr   = num("s2_apokr_fact");
    const Acherd  = num("s2_acherd_fact");
    const Acherdt = num("s2_acherdt_fact");

    const atticType = normalizeAtticType($("s1_attic_type")?.value ?? "cold");

    if (atticType === "warm") {
      if (!(Number.isFinite(Acherdt) && Acherdt > 0)) {
        return { ok: false, reason: "Выбран тёплый чердак — задай Aчерд.т > 0." };
      }
    } else if (atticType === "none") {
      if (!(Number.isFinite(Apokr) && Apokr > 0)) {
        return { ok: false, reason: "Выбрано совмещённое покрытие — задай Aпокр > 0." };
      }
    } else {
      if (!(Number.isFinite(Acherd) && Acherd > 0)) {
        return { ok: false, reason: "Чердак холодный — задай Aчерд > 0." };
      }
    }

    return { ok: true, reason: "" };
  }

  function applyS3Gate() {
    const ready = geomReadyForS3();

    setS3Enabled(ready.ok);

    if (ready.ok) enableOnlyRelevantS3Facts();
    else clearTable4Norms();

    setText("s3_gate_hint", ready.ok ? "Таблица 3 активна." : (ready.reason || "Сначала заполните Таблицу 2."));
  }

  // ============================================================================
  // Kобщ = Σ(Ai/Ri) / Aнсум
  // ============================================================================
  function calcKobsh({ AnsumUsed }) {
    const Ast  = num("s2_ast_fact");
    const Aok1 = num("s2_aok1_fact");
    const Aok2 = num("s2_aok2_fact");
    const Aok3 = num("s2_aok3_fact");
    const Aok4 = num("s2_aok4_fact");
    const Adv7 = num("s2_adv7_fact");
    const Adv8 = num("s2_adv8_fact");

    const Apokr   = num("s2_apokr_fact");
    const Acherd  = num("s2_acherd_fact");
    const Acherdt = num("s2_acherdt_fact");

    const Acok1 = num("s2_acok1_fact");
    const Acok2 = num("s2_acok2_fact");
    const Acok3 = num("s2_acok3_fact");

    const { topArea, picked } = pickTopEnvelopeArea({ Apokr, Acherd, Acherdt });

    const Rst      = num("s3_wall_fact");
    const Rwin     = num("s3_win_fact");
    const Rvitr    = num("s3_vitr_fact");
    const Rlantern = num("s3_lantern_fact");
    const Rstair   = num("s3_stairwin_fact");

    const Rbaldoor = num("s3_baldoor_fact");
    const Rgate    = num("s3_doorgate_fact");

    const Rroof    = num("s3_roof_fact");
    const Rattic   = num("s3_attic_fact");
    const RwarmAtt = num("s3_warmattic_fact");

    const Rbas     = num("s3_basement_fact");
    const Rdrive   = num("s3_drive_fact");
    const Rground  = num("s3_ground_fact");

    const Aref = (Number.isFinite(AnsumUsed) && AnsumUsed > 0) ? AnsumUsed : NaN;
    if (!Number.isFinite(Aref) || Aref <= 0) return NaN;

    function requireR(A, R) {
      if (!Number.isFinite(A) || A <= 0) return true;
      return (Number.isFinite(R) && R > 0);
    }

    const checks = [];
    checks.push({ A: Ast,  R: Rst });
    checks.push({ A: Aok1, R: Rwin });
    checks.push({ A: Aok2, R: Rvitr });
    checks.push({ A: Aok3, R: Rlantern });
    checks.push({ A: Aok4, R: Rstair });
    checks.push({ A: Adv7, R: Rbaldoor });
    checks.push({ A: Adv8, R: Rgate });

    if (picked === "acherdt") checks.push({ A: topArea, R: RwarmAtt });
    else if (picked === "acherd") checks.push({ A: topArea, R: Rattic });
    else checks.push({ A: topArea, R: Rroof });

    checks.push({ A: Acok1, R: Rbas });
    checks.push({ A: Acok2, R: Rdrive });
    checks.push({ A: Acok3, R: Rground });

    if (checks.some(x => !requireR(x.A, x.R))) return NaN;

    function addTerm(A, R) {
      if (!Number.isFinite(A) || A <= 0) return 0;
      return A / R;
    }

    let sumA_div_R = 0;
    sumA_div_R += addTerm(Ast, Rst);

    sumA_div_R += addTerm(Aok1, Rwin);
    sumA_div_R += addTerm(Aok2, Rvitr);
    sumA_div_R += addTerm(Aok3, Rlantern);
    sumA_div_R += addTerm(Aok4, Rstair);

    sumA_div_R += addTerm(Adv7, Rbaldoor);
    sumA_div_R += addTerm(Adv8, Rgate);

    if (picked === "acherdt") sumA_div_R += addTerm(topArea, RwarmAtt);
    else if (picked === "acherd") sumA_div_R += addTerm(topArea, Rattic);
    else sumA_div_R += addTerm(topArea, Rroof);

    sumA_div_R += addTerm(Acok1, Rbas);
    sumA_div_R += addTerm(Acok2, Rdrive);
    sumA_div_R += addTerm(Acok3, Rground);

    const kobsh = sumA_div_R / Aref; // Вт/(м²·°C)
    return Number.isFinite(kobsh) ? kobsh : NaN;
  }

  function writeKobshValue(kobsh) {
    forceValFirstExisting(
      ["s4_kobsh_proj", "kobsh_proj", "s4_kobsh_fact", "kobsh_fact", "s4_kobsh", "kobsh"],
      kobsh,
      3
    );
  }

  // ==========================================================================
  // Параметры для пв по СП РК 2.04-107-2022 (прил. Б)
  // ==========================================================================
  function getAokTotal() {
    const aok1 = num("s2_aok1_fact");
    const aok2 = num("s2_aok2_fact");
    const aok3 = num("s2_aok3_fact");
    const aok4 = num("s2_aok4_fact");
    const adv7 = num("s2_adv7_fact"); // балконные двери наружных переходов

    const sum =
      (Number.isFinite(aok1) ? aok1 : 0) +
      (Number.isFinite(aok2) ? aok2 : 0) +
      (Number.isFinite(aok3) ? aok3 : 0) +
      (Number.isFinite(aok4) ? aok4 : 0) +
      (Number.isFinite(adv7) ? adv7 : 0);

    return sum;
  }

  function getAdvInletDoors() {
    const adv8 = num("s2_adv8_fact"); // входные двери и ворота
    return Number.isFinite(adv8) ? adv8 : 0;
  }

  function calcGamma(tC) {
    // γ = 353 / (273 + t), кг/м³ (СП, формула 9.4)
    if (!Number.isFinite(tC)) return NaN;
    return 353 / (273 + tC);
  }

  function calcDeltaP(H, gammaN, gammaV, v, coefStack) {
    // Δp = coefStack*H*(γн − γв) + 0.03*γн*v^2, Па
    if (!Number.isFinite(H) || H <= 0) return NaN;
    if (!Number.isFinite(gammaN) || !Number.isFinite(gammaV)) return NaN;
    const vv = Number.isFinite(v) ? Math.max(0, v) : 0;
    const dp = (coefStack * H * (gammaN - gammaV)) + (0.03 * gammaN * vv * vv);
    return Math.max(0, dp);
  }

  function calcGinf() {
    // Gинф = 0.216 * [ (Aок/Rи,ок)*sqrt(Δpок) + (Aдв/Rи,дв)*sqrt(Δpдв) ]  (Б.5)
    // где Δpок: в (9.2) заменяем 0.55 на 0.28 для окон.

    const Aok = getAokTotal();
    const Adv = getAdvInletDoors();

    const RiOk = num("s1_Ri_ok");
    const RiDv = num("s1_Ri_dv");

    if (!Number.isFinite(RiOk) || RiOk <= 0) return NaN;
    if (!Number.isFinite(RiDv) || RiDv <= 0) return NaN;

    const floors = num("s1_floors");
    const hfloor = num("s1_hfloor");
    if (!Number.isFinite(floors) || floors <= 0) return NaN;
    if (!Number.isFinite(hfloor) || hfloor <= 0) return NaN;
    const H = floors * hfloor;

    const tn = num("s1_tn");
    const tv = num("s1_tv");
    const v = num("s1_wind_v");

    const gammaN = calcGamma(tn);
    const gammaV = calcGamma(tv);

    const dpOk = calcDeltaP(H, gammaN, gammaV, v, 0.28);
    const dpDv = calcDeltaP(H, gammaN, gammaV, v, 0.55);

    const termOk = (Aok > 0) ? (Aok / RiOk) * Math.sqrt(dpOk) : 0;
    const termDv = (Adv > 0) ? (Adv / RiDv) * Math.sqrt(dpDv) : 0;

    const Ginf = 0.216 * (termOk + termDv);
    return Number.isFinite(Ginf) ? Ginf : NaN;
  }

  function calcLzheld() {
    const type = getMainBuildingType();

    // Для жилых — строго по Б.3
    if (type === "residential") {
      const m = num("s1_people");
      const Aot = getAot();           // используем Aот как Aжалпы (общая площадь)
      const Aj  = num("s2_aj_fact"); // используем Aж как Aт (площадь жилых помещений)
      const hfloor = num("s1_hfloor");

      if (!Number.isFinite(m) || m <= 0) return NaN;
      if (!Number.isFinite(Aot) || Aot <= 0) return NaN;
      if (!Number.isFinite(Aj) || Aj <= 0) return NaN;
      if (!Number.isFinite(hfloor) || hfloor <= 0) return NaN;

      const occupancy = Aot / m; // м²/чел

      if (occupancy < 20) {
        return 3 * Aj;
      }

      const byAirChange = 0.35 * hfloor * Aot;
      const byPeople = 30 * m;
      return Math.max(byAirChange, byPeople);
    }

    // Для общественных/производственных — по людям и по площади (берём более строгое = max),
    // если нормы не заданы — fallback на проект ОВиК.
    const m = num("s1_people");
    const Aot = getAot();

    const Lpp = numFirstExisting(["s1_Lpp", "s1_lpp", "s1_L_by_person"]); // м³/ч·чел
    const Lpa = numFirstExisting(["s1_Lpa", "s1_lpa", "s1_L_by_area"]);   // м³/ч·м²
    const Lproj = num("s1_Lvent_proj"); // м³/ч

    const candidates = [];

    if (Number.isFinite(Lpp) && Lpp > 0 && Number.isFinite(m) && m > 0) candidates.push(Lpp * m);
    if (Number.isFinite(Lpa) && Lpa > 0 && Number.isFinite(Aot) && Aot > 0) candidates.push(Lpa * Aot);

    if (candidates.length) return Math.max(...candidates);

    // fallback — если “по людям/площади” не задано
    return Number.isFinite(Lproj) ? Math.max(0, Lproj) : NaN;
  }

  // ============================================================================
  // ✅ СТРОГИЙ ВАРИАНТ НОРМЫ ДЛЯ НЕЖИЛЫХ: БЕЗ fallback НА ПРОЕКТ
  // (нужен именно для pв,норм, чтобы pв,норм не становился равным pв,пр)
  // ============================================================================
  function calcLzheldStrict() {
    const type = getMainBuildingType();

    // Для жилых — оставляем как есть (Б.3)
    if (type === "residential") return calcLzheld();

    const m = num("s1_people");
    const Aot = getAot();

    const Lpp = numFirstExisting(["s1_Lpp", "s1_lpp", "s1_L_by_person"]); // м³/ч·чел
    const Lpa = numFirstExisting(["s1_Lpa", "s1_lpa", "s1_L_by_area"]);   // м³/ч·м²

    const candidates = [];
    if (Number.isFinite(Lpp) && Lpp > 0 && Number.isFinite(m) && m > 0) candidates.push(Lpp * m);
    if (Number.isFinite(Lpa) && Lpa > 0 && Number.isFinite(Aot) && Aot > 0) candidates.push(Lpa * Aot);

    // ВАЖНО: никакого fallback на проект!
    if (!candidates.length) return NaN;

    return Math.max(...candidates);
  }

  // ============================================================================
  // ✅ пв (средняя кратность воздухообмена за отопительный период)
  // ДЕЛАЕМ РАЗДЕЛЬНО:
  //   pв,норм — по Lжелд (по людям/площади; для жилых по Б.3) + инфильтрация
  //   pв,пр   — по Lпрд (проектный расход ОВиК s1_Lvent_proj) + инфильтрация
  //
  // СП РК 2.04-107-2022, прил. Б:
  // p_v = [ (L * n_vent) + (L_inf * n_inf) ] / (V_от * 168)
  // где n_vent — часы работы вентиляции в неделю (ч/нед), n_inf — часы инфильтрации в неделю.
  // ============================================================================
  function calcPvCommon(Lvent) {
    const Vot = getVot(); // V_от
    if (!Number.isFinite(Vot) || Vot <= 0) return NaN;

    // n_vent: часов в неделю
    const hpd = num("s1_vent_hpd");
    const nVent = (Number.isFinite(hpd) ? clamp(hpd, 0, 24) : 0) * 7;

    // n_inf по Б.2: при подпоре инфильтрация учитывается только вне работы вентсистемы
    const scheme = String($("s1_vent_scheme")?.value ?? "balanced");
    const nInf = (scheme === "overpressure") ? Math.max(0, 168 - nVent) : 168;

    // Lvent (м³/ч)
    if (!Number.isFinite(Lvent) || Lvent < 0) return NaN;

    // G_инф (кг/ч)
    const Ginf = calcGinf();
    if (!Number.isFinite(Ginf) || Ginf < 0) return NaN;

    // G_инф -> L_инф через плотность наружного воздуха
    const tOut = num("s1_tot"); // средняя t наружного воздуха за отопительный период
    const tOutUse = Number.isFinite(tOut) ? tOut : num("s1_tn");
    const rhoOut = calcGamma(tOutUse); // кг/м³
    if (!Number.isFinite(rhoOut) || rhoOut <= 0) return NaN;

    const Linf = Ginf / rhoOut; // м³/ч

    // p_v = (Lvent*nVent + Linf*nInf)/(Vot*168)
    const pv = (Lvent * nVent + Linf * nInf) / (Vot * 168);
    return Number.isFinite(pv) ? pv : NaN;
  }

  // pв,норм: используем СТРОГО Lжелд без fallback на проект (для нежилых)
  function calcPvNorm() {
    const Lzheld = calcLzheldStrict(); // м³/ч
    return calcPvCommon(Lzheld);
  }

  // pв,пр: используем ТОЛЬКО проектный расход ОВиК (никаких fallback, иначе опять совпадёт)
 function calcPvProj() {
  const type = getMainBuildingType();

  // ✅ Для жилых: проектный pв считаем по Б.3 (иначе поле всегда пустое)
  if (type === "residential") {
    const L = calcLzheld(); // м³/ч по прил. Б (Б.3)
    return calcPvCommon(L);
  }

  // ✅ Для нежилых: только проектный расход ОВиК
  const Lproj = num("s1_Lvent_proj"); // м³/ч
  if (!Number.isFinite(Lproj) || Lproj < 0) return NaN;
  return calcPvCommon(Lproj);
}

function writePvValues(_pvNorm, pvProj) {
  // Нормируемое в Разделе 4 по требованию всегда пустое
  forceVal("s4_pv_norm", NaN, 3);
  forceVal("s4_pv_proj", pvProj, 3);
}

  // ============================================================================
  // Основной расчёт
  // ============================================================================
  function calc() {
    syncSubtypeFromBuildingType();
    updateSubtypeVisibility();

    // релевантность табл.2 по выбору типов
    applyGeomFieldRelevance();

    // режим Aж/Aр + авто tв
    applyAreaInputsMode();
    applyTvAutoIfAllowed();

    calcAtticAndSubfloor();

    const tv  = num("s1_tv");
    const tot = num("s1_tot");
    const zot = num("s1_zot");

    const gsop =
      (Number.isFinite(tv) && Number.isFinite(tot) && Number.isFinite(zot) && zot > 0)
        ? (tv - tot) * zot
        : NaN;

    forceVal("s1_gsop", gsop, 0);

    applyQnormFromTable9();
    applyQcalcFromFact();

    // авто Aфас и Aнсум
    const AfasAuto = calcAfasFact();
    forceVal("s2_afas_fact", AfasAuto, 2);

    const AnsAuto = calcAnsumFact();
    forceVal("s2_ansum_fact", AnsAuto, 2);

    // f = Aостекл / Aфас
    // По смыслу коэффициента остеклённости учитываем площадь светопрозрачных заполнений фасада:
    // окна/витражи/фонари/окна ЛЛУ + балконные двери наружных переходов (если есть).
    const Aok1 = num("s2_aok1_fact");
    const Aok2 = num("s2_aok2_fact");
    const Aok3 = num("s2_aok3_fact");
    const Aok4 = num("s2_aok4_fact");
    const Adv7 = num("s2_adv7_fact"); // балконные двери наружных переходов

    const Aglazing = [Aok1, Aok2, Aok3, Aok4, Adv7]
      .filter(Number.isFinite)
      .reduce((s, x) => s + x, 0);

    const f =
      (Number.isFinite(AfasAuto) && AfasAuto > 0)
        ? (Aglazing / AfasAuto)
        : NaN;

    forceVal("s2_f_fact", f, 3);
    updateAfasWarning();

    // Kкомп
    const VotG = getVot();
    let kkomp = NaN;
    if (Number.isFinite(AnsAuto) && AnsAuto > 0 && Number.isFinite(VotG) && VotG > 0) {
      kkomp = (KCOMP_MODE === "B")
        ? (AnsAuto / Math.pow(VotG, 2 / 3))
        : (AnsAuto / VotG);
    }
    forceVal("s2_kkomp_fact", kkomp, 4);

    // Энергетические нагрузки (на базе qFactGcal)
    const qNormGcal = num("qNormGcal");
    const qFactGcal = num("qFactGcal");
    const aot = getAot();
    const vot = getVot();

    const qYearKwh = Number.isFinite(qFactGcal) ? (qFactGcal * GCAL_TO_KWH) : NaN;
    setText("qYearKwh", Number.isFinite(qYearKwh) ? fmt(qYearKwh, 0) : "—");

    const qSpecM2 = (Number.isFinite(qYearKwh) && Number.isFinite(aot) && aot > 0) ? (qYearKwh / aot) : NaN;
    const qSpecM3 = (Number.isFinite(qYearKwh) && Number.isFinite(vot) && vot > 0) ? (qYearKwh / vot) : NaN;

    setText("qSpecM2", fmt(qSpecM2, 2));
    setText("qSpecM3", fmt(qSpecM3, 3));
    setText("qLossKwh", Number.isFinite(qYearKwh) ? fmt(qYearKwh, 0) : "—");

    // Таблица 3 gate + Таблица 4 нормы
    applyS3Gate();
    applyTable4Norms();

    // Kобщ
    const s3Ready = geomReadyForS3().ok;
    const kobsh = s3Ready ? calcKobsh({ AnsumUsed: AnsAuto }) : NaN;
    writeKobshValue(kobsh);

    // пв (вентиляция + инфильтрация) — раздельно norm/proj
const pvProj = calcPvProj();
writePvValues(NaN, pvProj);

    // Раздел 4: нормируемые значения всегда пустые и неактивные
    hardDisableTable4Norm();

    // Класс + соответствие
    const deltaPct =
      (Number.isFinite(qNormGcal) && qNormGcal > 0 && Number.isFinite(qFactGcal))
        ? ((qFactGcal - qNormGcal) / qNormGcal) * 100
        : NaN;

    const cls = classByDelta(deltaPct);
    setText("assignedClass", cls);
    setText("assignedClassBadge", cls);
    setText("s7_class", cls);

    const compliance =
      (Number.isFinite(qNormGcal) && qNormGcal > 0 && Number.isFinite(qFactGcal) && qFactGcal >= 0)
        ? (qFactGcal <= qNormGcal ? "Да" : "Нет")
        : "—";

    setText("s7_compliance", compliance);
  }

  // ============================================================================
  // Автопересчёт
  // ============================================================================
  let rafScheduled = false;

  function recalcAll() {
    if (rafScheduled) return;
    rafScheduled = true;

    requestAnimationFrame(() => {
      rafScheduled = false;
      try {
        calc();
      } catch (e) {
        console.error("Ошибка расчёта:", e);
      }
    });
  }

  function bindRecalc(id) {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", recalcAll);
    el.addEventListener("change", recalcAll);
  }

  // ============================================================================
  // Init
  // ============================================================================
  document.addEventListener("DOMContentLoaded", async () => {

    // 1) Таблица 2: отключаем колонки "Нормативное" + "Проектное"
    hardDisableTable2();
    killDatalists();
    upgradeNumericInputs();
    disableAutocompleteEverywhere();
hardDisableTable4Norm();
requestAnimationFrame(hardDisableTable4Norm);
window.addEventListener("load", hardDisableTable4Norm);


    // ✅ запятая как десятичный разделитель для полей, которые остались type="number"
    enableCommaAsDecimalForNumberInputs(document);
    setTimeout(() => enableCommaAsDecimalForNumberInputs(document), 0);
    window.addEventListener("load", () => enableCommaAsDecimalForNumberInputs(document));

    enableCommaAsDecimalForNumberInputs();
    queueMicrotask(hardDisableTable2);
    setTimeout(hardDisableTable2, 0);
    setTimeout(hardDisableTable2, 250);
    window.addEventListener("load", () => {
      hardDisableTable2();
      setTimeout(hardDisableTable2, 250);
    });

    // 2) Грузим справочник городов
    try {
      await loadClimateDB();
    } catch (e) {
      console.error(e);
    }

    // 3) tв: авто-режим, но редактируемый вручную
    bindTvAutoManualBehavior();

    // 3.1) Вентиляция/инфильтрация: задаём безопасные дефолты, если пусто
    const hpdEl = $("s1_vent_hpd");
    if (hpdEl && String(hpdEl.value ?? "").trim() === "") hpdEl.value = "24";

    const hfloorEl = $("s1_hfloor");
    if (hfloorEl && String(hfloorEl.value ?? "").trim() === "") hfloorEl.value = "3.0";

    // 4) Лочим поля климата/вычисляемые (tв НЕ лочим!)
    ["s1_tn", "s1_tot", "s1_zot", "s1_gsop", "s1_tcherd", "s1_tpodp"].forEach(lockField);

    // 5) Геометрия авто
    ["s2_f_fact", "s2_kkomp_fact", "s2_afas_fact", "s2_ansum_fact"].forEach(lockField);

// 5.1) Таблица 4 (пв):
// norm — всегда пустое и disabled
disableField("s4_pv_norm");
// proj — авто, но показываем
lockField("s4_pv_proj");

    // 6) Нормативы Таблица 4 — авто
    [
      "s3_wall_norm", "s3_win_norm", "s3_vitr_norm", "s3_lantern_norm",

      // ✅ добавляем эти 4
      "s3_stairwin_norm", "s3_baldoor_norm", "s3_doorgate_norm", "s3_ground_norm",

      "s3_roof_norm", "s3_attic_norm", "s3_warmattic_norm",
      "s3_basement_norm", "s3_drive_norm"
    ].forEach(lockField);

    // 7) Раздел 7 — авто
    ["s7_qnorm", "s7_qcalc", "qNormGcal"].forEach(lockField);

    // 8) Раздел 3 — проектные поля НЕ используются
    [
      "s3_wall_proj", "s3_win_proj", "s3_vitr_proj", "s3_lantern_proj",
      "s3_stairwin_proj", "s3_baldoor_proj", "s3_doorgate_proj",
      "s3_roof_proj", "s3_attic_proj", "s3_warmattic_proj",
      "s3_basement_proj", "s3_drive_proj", "s3_ground_proj"
    ].forEach(disableField);

// 9) Синхронизация скрытых подтипов и видимость при старте
syncSubtypeFromBuildingType();
updateSubtypeVisibility();

    // 10) Режим Aж/Aр сразу + релевантность табл.2
    applyAreaInputsMode();
    applyGeomFieldRelevance();
    queueMicrotask(() => {
      applyAreaInputsMode();
      applyGeomFieldRelevance();
    });

    // 11) События: город
    safeOn("citySelect", "change", (e) => applyCityClimate(e.target.value));
    const citySel = $("citySelect");
    if (citySel && String(citySel.value ?? "").trim() !== "") applyCityClimate(citySel.value);

    // 12) События: тип здания (и подтипы)
safeOn("buildingTypeSelect", "change", () => {
  syncSubtypeFromBuildingType();
  updateSubtypeVisibility();
  applyAreaInputsMode();
  applyGeomFieldRelevance();
  applyTvAutoIfAllowed();
  recalcAll();
});

    ["educationSubtypeSelect", "s1_edu_kind", "publicSubtypeSelect", "s1_public_kind", "industrialUseSelect", "s1_industrial_kind"]
      .forEach((id) => safeOn(id, "change", () => { applyTvAutoIfAllowed(); applyGeomFieldRelevance(); recalcAll(); }));

    ["industrialHumiditySelect", "s1_industrial_regime"]
      .forEach((id) => safeOn(id, "change", () => { recalcAll(); }));

    // 13) Триггеры пересчёта
    [
      "s1_tv", "s1_attic_type", "s1_subfloor_type",
      // вентиляция / инфильтрация (для пв)
      "s1_people", "s1_hfloor", "s1_beta_v", "s1_vent_hpd", "s1_vent_scheme", "s1_Lvent_proj", "s1_wind_v", "s1_Ri_ok", "s1_Ri_dv", "s1_Lpp", "s1_Lpa",
      "buildingTypeSelect",
      "s1_floors", "buildingFloors",
      "s1_edu_kind", "educationSubtypeSelect",
      "s1_public_kind", "publicSubtypeSelect",
      "s1_industrial_kind", "industrialUseSelect",
      "industrialHumiditySelect", "s1_industrial_regime",
      "qFactGcal",
      "s2_aot_fact", "s2_vot_fact",
      "s2_aj_fact", "s2_ar_fact",

      "s2_ast_fact",
      "s2_aok1_fact", "s2_aok2_fact", "s2_aok3_fact", "s2_aok4_fact",
      "s2_adv7_fact", "s2_adv8_fact",
      "s2_apokr_fact",
      "s2_acherd_fact", "s2_acherdt_fact",
      "s2_acok1_fact", "s2_acok2_fact", "s2_acok3_fact",

      "s3_wall_fact",
      "s3_win_fact", "s3_vitr_fact", "s3_lantern_fact", "s3_stairwin_fact",
      "s3_baldoor_fact", "s3_doorgate_fact",
      "s3_roof_fact", "s3_attic_fact", "s3_warmattic_fact",
      "s3_basement_fact", "s3_drive_fact", "s3_ground_fact"
    ].forEach(bindRecalc);

    // 14) Таблица 3 по умолчанию закрыта до ввода геометрии
    setS3Enabled(false);
    clearTable4Norms();

    // 15) Первый расчёт
    recalcAll();
  });
})();
