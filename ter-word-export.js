(function () {
  function safeFileName(name) {
    return String(name || "Объект")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 80);
  }

  function text(value) {
    if (value === null || value === undefined) return "";

    if (typeof value === "number") {
      return value.toLocaleString("ru-RU", {
        maximumFractionDigits: 2,
      });
    }

    return String(value);
  }

  function prepareMainTableForWord(aoa) {
  if (!Array.isArray(aoa)) return [];

  // buildMainTableAoa() возвращает:
  // 0 строка — название таблицы
  // 1 строка — пустая строка
  // 2 строка — заголовки таблицы
  // далее — строки по ТЭР и ИТОГО
  const rows = aoa.slice(2);

  if (!rows.length) return [];

  const header = rows[0];
  const body = rows.slice(1);

  const result = [header];

  let currentBlock = [];

  function rowHasYearData(row) {
    if (!Array.isArray(row)) return false;

    // Первые 4 колонки: №, Наименование ТЭР, Потребление, Ед. измерения.
    // Всё после них — годы.
    return row.slice(4).some(cell => {
      if (cell === "" || cell === null || cell === undefined) return false;
      const n = Number(cell);
      return Number.isFinite(n) && n !== 0;
    });
  }

  function isTotalRow(row) {
    if (!Array.isArray(row)) return false;
    return String(row[1] || "").trim().toUpperCase() === "ИТОГО";
  }

  function isContinuationTotalRow(row) {
    if (!Array.isArray(row)) return false;
    return String(row[0] || "").trim() === "" && String(row[1] || "").trim() === "";
  }

  function flushBlock() {
    if (!currentBlock.length) return;

    const blockHasData = currentBlock.some(rowHasYearData);

    if (blockHasData) {
      result.push(...currentBlock);
    }

    currentBlock = [];
  }

  body.forEach(row => {
    if (!Array.isArray(row)) return;

    // Строка ИТОГО начинается отдельным блоком.
    // Перед ней сбрасываем обычный ТЭР-блок.
    if (isTotalRow(row)) {
      flushBlock();
      result.push(row);
      return;
    }

    // Продолжение строк ИТОГО: денежное выражение, себестоимость.
    // Их оставляем, если они идут после строки ИТОГО.
    if (isContinuationTotalRow(row) && result.some(r => isTotalRow(r))) {
      result.push(row);
      return;
    }

    // Новая строка ТЭР начинается, когда заполнены № или название ресурса.
    const startsNewBlock =
      String(row[0] || "").trim() !== "" ||
      String(row[1] || "").trim() !== "";

    if (startsNewBlock) {
      flushBlock();
      currentBlock.push(row);
    } else {
      currentBlock.push(row);
    }
  });

  flushBlock();

  return result;
}
function splitMainTableToReportTables(aoa) {
  const table = prepareMainTableForWord(aoa);

  if (!Array.isArray(table) || table.length < 2) {
    return [];
  }

  const header = table[0];
  const body = table.slice(1);

  const yearColumns = header.slice(4);

  const result = [];
  let currentResource = null;
  let currentRows = [];

  function isTotalRow(row) {
    return String(row?.[1] || "").trim().toUpperCase() === "ИТОГО";
  }

  function isTotalContinuation(row) {
    return String(row?.[0] || "").trim() === "" && String(row?.[1] || "").trim() === "";
  }

  function flushResource() {
    if (!currentResource || !currentRows.length) return;

    const miniHeader = ["Показатель", "Ед. изм.", ...yearColumns];

    const miniRows = currentRows.map((row) => [
      row[2] || "",
      row[3] || "",
      ...row.slice(4),
    ]);

    result.push({
      type: "resource",
      title: currentResource,
      rows: [miniHeader, ...miniRows],
    });

    currentResource = null;
    currentRows = [];
  }

  const totalRows = [];

  body.forEach((row) => {
    if (!Array.isArray(row)) return;

    if (isTotalRow(row)) {
      flushResource();

      totalRows.push([
        row[2] || "",
        row[3] || "",
        ...row.slice(4),
      ]);

      return;
    }

    if (isTotalContinuation(row)) {
      if (totalRows.length) {
        totalRows.push([
          row[2] || "",
          row[3] || "",
          ...row.slice(4),
        ]);
      } else if (currentResource) {
        currentRows.push(row);
      }

      return;
    }

    const resourceName = String(row[1] || "").trim();

    if (resourceName) {
      flushResource();
      currentResource = resourceName;
      currentRows.push(row);
      return;
    }

    if (currentResource) {
      currentRows.push(row);
    }
  });

  flushResource();

  if (totalRows.length) {
    const miniHeader = ["Показатель", "Ед. изм.", ...yearColumns];

    result.push({
      type: "total",
      title: "ИТОГО по потреблению ТЭР",
      rows: [miniHeader, ...totalRows],
    });
  }

  return result;
}
function splitYearlyStructureToReportTables(aoa) {
  if (!Array.isArray(aoa) || !aoa.length) return [];

  const rows = aoa.filter(row => Array.isArray(row));

  const result = [];
  let currentYear = "";
  let currentRows = [];

  function flushYear() {
    if (!currentYear || !currentRows.length) return;

    const filteredRows = currentRows.filter(row => {
      if (!Array.isArray(row)) return false;

      const firstCell = String(row[0] || "").trim();

      // Оставляем шапку, ИТОГО и строки с данными
      if (firstCell === "Энергоресурс") return true;
      if (firstCell.toUpperCase() === "ИТОГО") return true;

      return row.some((cell, index) => {
        if (index === 0) return false;
        if (cell === "" || cell === null || cell === undefined) return false;
        const n = Number(cell);
        return Number.isFinite(n) && n !== 0;
      });
    });

    if (filteredRows.length > 1) {
      result.push({
        year: currentYear,
        title: `Структура потребления ТЭР за ${currentYear} год`,
        rows: filteredRows,
      });
    }

    currentYear = "";
    currentRows = [];
  }

  rows.forEach(row => {
    const firstCell = String(row[0] || "").trim();

    if (firstCell.startsWith("Год:")) {
      flushYear();
      currentYear = firstCell.replace("Год:", "").trim();
      currentRows = [];
      return;
    }

    if (!currentYear) return;

    if (row.some(cell => cell !== "" && cell !== null && cell !== undefined)) {
      currentRows.push(row);
    }
  });

  flushYear();

  return result;
}
  function normalizeAoa(aoa) {
    const rows = Array.isArray(aoa) ? aoa : [];

    const maxCols = rows.reduce((max, row) => {
      const arr = Array.isArray(row) ? row : [row];
      return Math.max(max, arr.length);
    }, 1);

    return rows.map((row) => {
      const arr = Array.isArray(row) ? row : [row];
      const normalized = [...arr];

      while (normalized.length < maxCols) {
        normalized.push("");
      }

      return normalized;
    });
  }

  function makeParagraph(value, options = {}) {
  const { Paragraph, TextRun, AlignmentType } = window.docx;

  return new Paragraph({
    children: [
      new TextRun({
        text: text(value),
        bold: !!options.bold,
        size: options.size || 24,
        font: "Times New Roman",
      }),
    ],
    alignment: options.center ? AlignmentType.CENTER : undefined,
    spacing: options.spacing || { after: 120 },
  });
}
  function aoaToWordTable(aoa) {
  const {
    Table,
    TableRow,
    TableCell,
    Paragraph,
    TextRun,
    WidthType,
    BorderStyle,
    ShadingType,
    AlignmentType,
    VerticalAlign,
  } = window.docx;

  const normalizedAoa = normalizeAoa(aoa);
  const colCount = normalizedAoa[0]?.length || 1;

  const isMainWideTable = colCount >= 8;

  const tableFontSize = isMainWideTable ? 13 : 18;
  const headerFontSize = isMainWideTable ? 13 : 18;
  const cellMargin = isMainWideTable ? 45 : 80;

  function getColumnWidth(index) {
    // Основная таблица:
    // 0 — №
    // 1 — Наименование ТЭР
    // 2 — Потребление
    // 3 — Ед. измерения
    // 4+ — годы
    if (isMainWideTable) {
      if (index === 0) return 500;
      if (index === 1) return 1800;
      if (index === 2) return 2300;
      if (index === 3) return 1200;
      return 950;
    }

    // Таблица коэффициентов
    if (colCount === 4) {
      if (index === 0) return 600;
      if (index === 1) return 2800;
      if (index === 2) return 1800;
      if (index === 3) return 3200;
    }

    return 1800;
  }

  function getCellAlignment(index, rowIndex) {
    if (rowIndex === 0) return AlignmentType.CENTER;

    if (isMainWideTable) {
      if (index === 0) return AlignmentType.CENTER;
      if (index === 1 || index === 2 || index === 3) return AlignmentType.LEFT;
      return AlignmentType.CENTER;
    }

    if (colCount === 4) {
      if (index === 0) return AlignmentType.CENTER;
      if (index === 1 || index === 2) return AlignmentType.LEFT;
      if (index === 3) return AlignmentType.CENTER;
    }

    return AlignmentType.LEFT;
  }

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    columnWidths: Array.from({ length: colCount }, (_, index) => getColumnWidth(index)),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    },
    rows: normalizedAoa.map((row, rowIndex) =>
      new TableRow({
        tableHeader: rowIndex === 0,
        cantSplit: true,
        children: row.map((cell, colIndex) =>
          new TableCell({
            width: {
              size: getColumnWidth(colIndex),
              type: WidthType.DXA,
            },
            verticalAlign: VerticalAlign.CENTER,
            shading:
              rowIndex === 0
                ? {
                    type: ShadingType.CLEAR,
                    fill: "EDEDED",
                    color: "auto",
                  }
                : undefined,
            margins: {
              top: cellMargin,
              bottom: cellMargin,
              left: cellMargin,
              right: cellMargin,
            },
            children: [
              new Paragraph({
                alignment: getCellAlignment(colIndex, rowIndex),
                spacing: {
                  before: 0,
                  after: 0,
                },
                children: [
                  new TextRun({
                    text: text(cell),
                    bold: rowIndex === 0,
                    size: rowIndex === 0 ? headerFontSize : tableFontSize,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          })
        ),
      })
    ),
  });
}
function buildTerCoefficientAoa(terInfo) {
  const rows = [
    ["№", "Энергоресурс", "Ед. изм.", "Коэффициент перевода в т.у.т."],
  ];

  if (!Array.isArray(terInfo) || !terInfo.length) {
    rows.push(["", "Данные по энергоресурсам отсутствуют", "", ""]);
    return rows;
  }

 terInfo.forEach((item, index) => {
  const coefficient =
    typeof item.k === "number"
      ? item.k.toLocaleString("ru-RU", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 8,
        })
      : "";

  rows.push([
    index + 1,
    item.name || "",
    item.unit || "",
    coefficient,
  ]);
});

  return rows;
}
function dataUrlToUint8Array(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1];

  if (!base64) {
    return new Uint8Array();
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function buildChartBlocks(totalChartImages) {
  const { Paragraph, TextRun, ImageRun, AlignmentType } = window.docx;

  if (!Array.isArray(totalChartImages) || !totalChartImages.length) {
    return [
      makeParagraph("Графики ИТОГО не сформированы. Проверьте заполнение данных и наличие графиков на странице.", {
        size: 22,
        spacing: { after: 120 },
      }),
    ];
  }

  const blocks = [];

  totalChartImages.forEach((chart) => {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 },
        children: [
          new ImageRun({
            data: dataUrlToUint8Array(chart.dataUrl),
            transformation: {
              width: 560,
              height: 280,
            },
          }),
        ],
      })
    );

    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: chart.caption || chart.title || "График",
            bold: true,
            size: 20,
            font: "Times New Roman",
          }),
        ],
      })
    );
  });

  return blocks;
}
function pushSingleChartBlock(children, chart, options = {}) {
  const { Paragraph, TextRun, ImageRun, AlignmentType } = window.docx;

  const width = options.width || 540;
  const height = options.height || 270;

  if (!chart || !chart.dataUrl) {
    children.push(
      makeParagraph("График не сформирован. Проверьте наличие данных на странице.", {
        size: 21,
        spacing: { after: 120 },
      })
    );
    return;
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 80 },
      children: [
        new ImageRun({
          data: dataUrlToUint8Array(chart.dataUrl),
          transformation: {
            width,
            height,
          },
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: chart.caption || chart.title || "График",
          bold: true,
          size: 20,
          font: "Times New Roman",
        }),
      ],
    })
  );
}
function buildTableExplanationParagraphs(terInfo) {
  const resourcesText =
    Array.isArray(terInfo) && terInfo.length
      ? terInfo.map((item) => item.name).join(", ")
      : "не указаны";

  return [
    makeParagraph(
      "Пояснение к таблице",
      {
        bold: true,
        size: 22,
        spacing: { before: 220, after: 100 },
      }
    ),

    makeParagraph(
      `В таблице приведены сведения о потреблении топливно-энергетических ресурсов за рассматриваемый период. По каждому энергоресурсу отражаются значения в натуральном выражении, в условном топливе, в денежном выражении, а также расчётная себестоимость единицы потребления.`,
      {
        size: 22,
        spacing: { after: 120 },
      }
    ),

    makeParagraph(
      `В таблице учтены следующие энергоресурсы: ${resourcesText}.`,
      {
        size: 22,
        spacing: { after: 120 },
      }
    ),

    makeParagraph(
      `Пересчет потребления в условное топливо выполняется по формуле: потребление в т.у.т. = потребление в натуральном выражении × коэффициент перевода в т.у.т.`,
      {
        size: 22,
        spacing: { after: 120 },
      }
    ),

    makeParagraph(
      `Себестоимость по каждому энергоресурсу определяется как отношение потребления в денежном выражении к потреблению в натуральном выражении: себестоимость = стоимость / натуральное потребление. Итоговая себестоимость по всем ТЭР определяется как отношение суммарного потребления в денежном выражении к суммарному потреблению в условном топливе.`,
      {
        size: 22,
        spacing: { after: 120 },
      }
    ),

    makeParagraph(
      "Коэффициенты перевода, примененные при расчёте:",
      {
        bold: true,
        size: 22,
        spacing: { before: 120, after: 80 },
      }
    ),
  ];
}
async function downloadTerWord({
  years,
  project,
  mainTableAoa,
  yearlyStructureAoa,
  terInfo,
  totalDeltaSections,
  totalChartImages,
  yearlyStructureSections,
  resourceSections,
}) {
    if (!window.docx) {
      alert("Библиотека docx не загружена. Обновите страницу.");
      return;
    }

    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      AlignmentType,
      PageOrientation,
    } = window.docx;

    const projectName = project?.name || "Объект энергоаудита";

    const periodText =
      Array.isArray(years) && years.length
        ? `${years[0]}–${years[years.length - 1]} гг.`
        : "не указан";

const wordTableAoa = prepareMainTableForWord(mainTableAoa);

const children = [];

children.push(
  new Paragraph({
    children: [
      new TextRun({
        text: "Потребление топливно-энергетических ресурсов",
        bold: true,
        size: 28,
        font: "Times New Roman",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  })
);

children.push(
  makeParagraph(`Объект: ${projectName}`, {
    bold: true,
    size: 22,
  })
);

children.push(
  makeParagraph(`Период анализа: ${periodText}`, {
    size: 24,
  })
);

children.push(
  makeParagraph("Таблица 1 — Потребление топливно-энергетических ресурсов", {
    bold: true,
    size: 22,
    spacing: { before: 220, after: 100 },
  })
);

if (!wordTableAoa.length) {
  children.push(
    makeParagraph("Данные по потреблению ТЭР не заполнены.", {
      size: 22,
      spacing: { after: 120 },
    })
  );
} else {
  children.push(aoaToWordTable(wordTableAoa));
}

buildTableExplanationParagraphs(terInfo).forEach((p) => {
  children.push(p);
});

children.push(aoaToWordTable(buildTerCoefficientAoa(terInfo)));
children.push(
  makeParagraph("Графики ИТОГО и отклонения по итоговым показателям", {
    bold: true,
    size: 22,
    spacing: { before: 260, after: 100 },
  })
);

if (!Array.isArray(totalDeltaSections) || !totalDeltaSections.length) {
  children.push(
    makeParagraph("Данные для расчета отклонений по итоговым показателям отсутствуют.", {
      size: 22,
      spacing: { after: 120 },
    })
  );
} else {
  totalDeltaSections.forEach((section, index) => {
    const chart = Array.isArray(totalChartImages) ? totalChartImages[index] : null;

    children.push(
      makeParagraph(section.title, {
        bold: true,
        size: 20,
        spacing: { before: index === 0 ? 100 : 240, after: 80 },
      })
    );

    pushSingleChartBlock(children, chart, {
      width: 540,
      height: 270,
    });

    children.push(
      makeParagraph(`Таблица 2.${index + 1} — Отклонения по показателю «${section.title}»`, {
        bold: true,
        size: 20,
        spacing: { before: 80, after: 80 },
      })
    );

    children.push(aoaToWordTable(section.aoa));

    children.push(
      makeParagraph(section.description || "", {
        size: 21,
        spacing: { before: 80, after: 120 },
      })
    );
  });
}
children.push(
  makeParagraph("Круговые диаграммы структуры потребления ТЭР", {
    bold: true,
    size: 22,
    spacing: { before: 280, after: 100 },
  })
);

if (!Array.isArray(yearlyStructureSections) || !yearlyStructureSections.length) {
  children.push(
    makeParagraph("Данные для формирования круговых диаграмм структуры потребления ТЭР отсутствуют.", {
      size: 22,
      spacing: { after: 120 },
    })
  );
} else {
  yearlyStructureSections.forEach((section, index) => {
    children.push(
      makeParagraph(`Структура потребления ТЭР за ${section.year} год`, {
        bold: true,
        size: 20,
        spacing: { before: index === 0 ? 100 : 240, after: 80 },
      })
    );

    if (section.tutChart?.dataUrl) {
      pushSingleChartBlock(children, section.tutChart, {
        width: 360,
        height: 360,
      });
    }

    if (section.moneyChart?.dataUrl) {
      pushSingleChartBlock(children, section.moneyChart, {
        width: 360,
        height: 360,
      });
    }

    children.push(
 makeParagraph(`Таблица — Структура потребления ТЭР за ${section.year} год`, {
        bold: true,
        size: 20,
        spacing: { before: 80, after: 80 },
      })
    );

    children.push(aoaToWordTable(section.tableAoa));

    children.push(
      makeParagraph(section.description || "", {
        size: 21,
        spacing: { before: 80, after: 120 },
      })
    );
  });
}
children.push(
  makeParagraph("Потребление по отдельным энергоресурсам", {
    bold: true,
    size: 24,
    spacing: { before: 320, after: 120 },
  })
);

if (!Array.isArray(resourceSections) || !resourceSections.length) {
  children.push(
    makeParagraph("Данные по отдельным энергоресурсам отсутствуют.", {
      size: 22,
      spacing: { after: 120 },
    })
  );
} else {
  resourceSections.forEach((resource, resourceIndex) => {
    children.push(
      makeParagraph(`${resourceIndex + 1}. ${resource.name}`, {
        bold: true,
        size: 24,
        spacing: { before: resourceIndex === 0 ? 120 : 300, after: 120 },
      })
    );

    children.push(
      makeParagraph(`Таблица ${resourceIndex + 3} — Потребление энергоресурса «${resource.name}»`, {
        bold: true,
        size: 20,
        spacing: { before: 80, after: 80 },
      })
    );

    children.push(aoaToWordTable(resource.tableAoa));

    children.push(
      makeParagraph(resource.tableDescription || "", {
        size: 21,
        spacing: { before: 100, after: 160 },
      })
    );

    if (Array.isArray(resource.chartSections)) {
      resource.chartSections.forEach((section, chartIndex) => {
        children.push(
          makeParagraph(section.title, {
            bold: true,
            size: 20,
            spacing: { before: 180, after: 80 },
          })
        );

        pushSingleChartBlock(
          children,
          {
            title: section.title,
            caption: section.caption,
            dataUrl: section.dataUrl,
          },
          {
            width: 540,
            height: 270,
          }
        );

        children.push(
          makeParagraph(
            `Таблица ${resourceIndex + 3}.${chartIndex + 1} — Отклонения по показателю «${section.title}»`,
            {
              bold: true,
              size: 20,
              spacing: { before: 80, after: 80 },
            }
          )
        );

        children.push(aoaToWordTable(section.aoa));

        children.push(
          makeParagraph(section.description || "", {
            size: 21,
            spacing: { before: 80, after: 120 },
          })
        );
      });
    }
  });
}
    const doc = new Document({
      creator: "RG Energy",
      title: "Потребление ТЭР",
      description: "Автоматически сформированный раздел по потреблению топливно-энергетических ресурсов",
      sections: [
        {
          properties: {
           page: {
  size: {
    orientation: PageOrientation.PORTRAIT,
  },
  margin: {
    top: 720,
    right: 360,
    bottom: 720,
    left: 360,
  },
},
          },
          children,
        },
      ],
    });

    try {
      const blob = await Packer.toBlob(doc);

      console.log("DOCX blob size:", blob.size);

      if (!blob || blob.size === 0) {
        alert("Word-файл не сформировался: пустой файл.");
        return;
      }

      const fileName = `Потребление_ТЭР_${safeFileName(projectName)}.docx`;

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 30000);
    } catch (error) {
      console.error("Ошибка формирования Word:", error);
      alert("Ошибка формирования Word. Откройте F12 → Console и посмотрите ошибку.");
    }
  }

  window.downloadTerWord = downloadTerWord;
})();