export const MAX_INPUT_BYTES = 512 * 1024;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

function inputBytes(value) {
  return new TextEncoder().encode(value).byteLength;
}

function finishRow(rows, values, sourceRow) {
  rows.push({ sourceRow, values });
}

export function parseCsv(input) {
  if (typeof input !== "string") throw new TypeError("CSV input must be text.");
  if (inputBytes(input) > MAX_INPUT_BYTES) {
    throw new Error("CSV exceeds the 512 KiB local-processing limit. Split it into a smaller file and try again.");
  }

  const source = input.replace(/^\uFEFF/, "");
  const parsedRows = [];
  let values = [];
  let field = "";
  let inQuotes = false;
  let quoteStartRow = 0;
  let sourceRow = 1;
  let currentLine = 1;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else if (character === "\r" || character === "\n") {
        if (character === "\r" && source[index + 1] === "\n") index += 1;
        field += "\n";
        currentLine += 1;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      inQuotes = true;
      quoteStartRow = currentLine;
    } else if (character === ",") {
      values.push(field);
      field = "";
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      values.push(field);
      finishRow(parsedRows, values, sourceRow);
      field = "";
      values = [];
      currentLine += 1;
      sourceRow = currentLine;
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error(`Unclosed quoted field starting on row ${quoteStartRow}.`);
  if (field.length > 0 || values.length > 0 || parsedRows.length === 0) {
    values.push(field);
    finishRow(parsedRows, values, sourceRow);
  }

  while (
    parsedRows.length > 1 &&
    parsedRows.at(-1).values.length === 1 &&
    parsedRows.at(-1).values[0] === ""
  ) {
    parsedRows.pop();
  }

  const headerRow = parsedRows.shift();
  const headers = headerRow?.values.map((header) => header.trim()) ?? [];
  if (!headers.length || headers.every((header) => header === "") || headers.some((header) => header === "")) {
    throw new Error("CSV needs a non-empty header row before any data rows.");
  }
  if (new Set(headers).size !== headers.length) throw new Error("CSV header names must be unique.");

  for (const row of parsedRows) {
    if (row.values.length !== headers.length) {
      throw new Error(
        `Row ${row.sourceRow} has ${row.values.length} columns; expected ${headers.length}.`,
      );
    }
  }

  return {
    headers,
    rows: parsedRows.map((row) => ({ rowNumber: row.sourceRow, values: row.values })),
  };
}

function isDateColumn(header) {
  return /(^|_)date$|_date_|date_/i.test(header);
}

function isEmailColumn(header) {
  return /(^|_)email$/i.test(header);
}

function validIsoParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function issue(severity, code, row, column, message) {
  return { severity, code, row, column, message };
}

export function serializeCsv(headers, rows) {
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}

export function cleanCsv(input, { requiredHeaders = [] } = {}) {
  const parsed = parseCsv(input);
  const headersByLowercase = new Map(parsed.headers.map((header) => [header.toLowerCase(), header]));

  for (const required of requiredHeaders) {
    if (!headersByLowercase.has(required.toLowerCase())) {
      throw new Error(`Missing required header: ${required}. Add it to the first row and try again.`);
    }
  }

  const requiredSet = new Set(
    requiredHeaders.map((required) => headersByLowercase.get(required.toLowerCase())),
  );
  const issues = [];
  const rows = [];
  const seen = new Set();
  let duplicatesRemoved = 0;

  for (const parsedRow of parsed.rows) {
    const row = {};

    parsed.headers.forEach((header, columnIndex) => {
      const raw = parsedRow.values[columnIndex];
      let value = raw.trim();

      if (value !== raw) {
        issues.push(
          issue("fix", "trimmed-whitespace", parsedRow.rowNumber, header, "Removed outer whitespace."),
        );
      }

      if (isEmailColumn(header) && value) {
        const normalizedEmail = value.toLowerCase();
        if (normalizedEmail !== value) {
          value = normalizedEmail;
          issues.push(
            issue("fix", "email-case", parsedRow.rowNumber, header, "Lowercased the email address."),
          );
        }
        if (!EMAIL_PATTERN.test(value)) {
          issues.push(
            issue(
              "warning",
              "malformed-email",
              parsedRow.rowNumber,
              header,
              "Email format looks incomplete. Review it before import.",
            ),
          );
        }
      }

      if (isDateColumn(header) && value) {
        const iso = value.match(ISO_DATE_PATTERN);
        if (iso) {
          const [, yearText, monthText, dayText] = iso;
          const year = Number(yearText);
          const month = Number(monthText);
          const day = Number(dayText);
          if (validIsoParts(year, month, day)) {
            const normalizedDate = `${yearText}-${monthText.padStart(2, "0")}-${dayText.padStart(2, "0")}`;
            if (normalizedDate !== value) {
              value = normalizedDate;
              issues.push(
                issue("fix", "date-padding", parsedRow.rowNumber, header, "Zero-padded the ISO date."),
              );
            }
          } else {
            issues.push(
              issue("warning", "invalid-date", parsedRow.rowNumber, header, "Date is not a real calendar date."),
            );
          }
        } else if (/\d[/-]\d/.test(value)) {
          issues.push(
            issue(
              "warning",
              "ambiguous-date",
              parsedRow.rowNumber,
              header,
              "Date order is ambiguous. Keep the value and review it manually.",
            ),
          );
        }
      }

      if (requiredSet.has(header) && value === "") {
        issues.push(
          issue(
            "warning",
            "blank-required",
            parsedRow.rowNumber,
            header,
            "Required value is blank. Add it before import.",
          ),
        );
      }

      row[header] = value;
    });

    const fingerprint = JSON.stringify(parsed.headers.map((header) => row[header]));
    if (seen.has(fingerprint)) {
      duplicatesRemoved += 1;
      issues.push(
        issue(
          "fix",
          "exact-duplicate",
          parsedRow.rowNumber,
          "",
          "Removed an exact duplicate after safe normalization.",
        ),
      );
    } else {
      seen.add(fingerprint);
      rows.push(row);
    }
  }

  const fixesApplied = issues.filter((item) => item.severity === "fix").length;
  const warnings = issues.filter((item) => item.severity === "warning").length;

  return {
    headers: parsed.headers,
    rows,
    issues,
    metrics: {
      rowsIn: parsed.rows.length,
      rowsOut: rows.length,
      duplicatesRemoved,
      fixesApplied,
      warnings,
    },
    csv: serializeCsv(parsed.headers, rows),
  };
}

const SAMPLE_CSV = `name,email,date,plan
 Ada Lovelace ,ADA@EXAMPLE.COM,2026-7-2,Growth
Ada Lovelace,ada@example.com,2026-07-02,Growth
Grace Hopper,grace.example.com,07/08/2026,Starter
,linus@example.com,2026-07-05,Starter`;

function renderTable(target, headers, rows) {
  target.replaceChildren();
  const table = target.ownerDocument.createElement("table");
  const head = table.createTHead().insertRow();
  for (const header of headers) {
    const cell = target.ownerDocument.createElement("th");
    cell.scope = "col";
    cell.textContent = header;
    head.append(cell);
  }

  const body = table.createTBody();
  for (const row of rows.slice(0, 8)) {
    const tableRow = body.insertRow();
    for (const header of headers) {
      const cell = tableRow.insertCell();
      cell.dataset.label = header;
      cell.textContent = row[header] ?? "";
    }
  }
  target.append(table);
}

function announce(status, message, tone = "neutral") {
  status.textContent = message;
  status.dataset.tone = tone;
}

export function initCsvRescue(root = document) {
  const app = root.querySelector("[data-csv-rescue]");
  if (!app) return null;

  const input = app.querySelector("[data-csv-input]");
  const fileInput = app.querySelector("[data-csv-file]");
  const loadSample = app.querySelector('[data-action="load-sample"]');
  const repair = app.querySelector('[data-action="repair"]');
  const download = app.querySelector("[data-download]");
  const status = app.querySelector("[data-status]");
  const results = app.querySelector("[data-results]");
  const output = app.querySelector("[data-clean-output]");
  const issueList = app.querySelector("[data-issues]");
  const beforeTable = app.querySelector("[data-before-table]");
  const afterTable = app.querySelector("[data-after-table]");
  const metrics = Object.fromEntries(
    [...app.querySelectorAll("[data-metric]")].map((element) => [element.dataset.metric, element]),
  );
  let objectUrl = "";

  const clearDownload = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = "";
    download.removeAttribute("href");
    download.setAttribute("aria-disabled", "true");
  };

  const runRepair = () => {
    clearDownload();
    results.hidden = true;
    try {
      const parsed = parseCsv(input.value);
      const cleaned = cleanCsv(input.value, { requiredHeaders: ["name", "email"] });
      const beforeRows = parsed.rows.map((row) =>
        Object.fromEntries(parsed.headers.map((header, index) => [header, row.values[index]])),
      );

      renderTable(beforeTable, parsed.headers, beforeRows);
      renderTable(afterTable, cleaned.headers, cleaned.rows);
      output.value = cleaned.csv;
      metrics.rowsIn.textContent = String(cleaned.metrics.rowsIn);
      metrics.rowsOut.textContent = String(cleaned.metrics.rowsOut);
      metrics.fixesApplied.textContent = String(cleaned.metrics.fixesApplied);
      metrics.warnings.textContent = String(cleaned.metrics.warnings);

      issueList.replaceChildren();
      for (const item of cleaned.issues) {
        const listItem = root.createElement("li");
        listItem.dataset.severity = item.severity;
        const location = item.column
          ? `Row ${item.row}, ${item.column}`
          : `Row ${item.row}`;
        const label = item.severity === "warning" ? "Review" : "Fixed";
        listItem.innerHTML = `<strong>${label}</strong><span></span>`;
        listItem.querySelector("span").textContent = `${location}: ${item.message}`;
        issueList.append(listItem);
      }

      if (!cleaned.issues.length) {
        const listItem = root.createElement("li");
        listItem.textContent = "No safe fixes or review warnings detected.";
        issueList.append(listItem);
      }

      results.hidden = false;
      try {
        objectUrl = URL.createObjectURL(new Blob([cleaned.csv], { type: "text/csv;charset=utf-8" }));
        download.href = objectUrl;
        download.setAttribute("aria-disabled", "false");
        announce(
          status,
          `Repair complete. ${cleaned.metrics.rowsOut} cleaned rows are ready to review.`,
          cleaned.metrics.warnings ? "warning" : "success",
        );
      } catch {
        announce(
          status,
          "The cleaned CSV is ready below, but this browser could not create a download. Copy the output instead.",
          "warning",
        );
      }
    } catch (error) {
      announce(status, error.message, "error");
      input.focus();
    }
  };

  loadSample.addEventListener("click", () => {
    input.value = SAMPLE_CSV;
    announce(status, "Synthetic sample loaded. Repair it to see the issue trail.");
    input.focus();
  });
  repair.addEventListener("click", runRepair);
  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files;
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) {
      announce(
        status,
        "That file exceeds the 512 KiB local-processing limit. Split it into a smaller file and try again.",
        "error",
      );
      return;
    }
    input.value = await file.text();
    announce(status, `${file.name} loaded locally. Nothing has been uploaded.`);
  });
  download.addEventListener("click", (event) => {
    if (!objectUrl) event.preventDefault();
  });

  return { runRepair };
}

if (typeof document !== "undefined") initCsvRescue(document);
