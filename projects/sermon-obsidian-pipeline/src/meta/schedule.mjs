import fs from "node:fs";
import xlsx from "xlsx";
import { SCHEDULE_XLSX } from "../config.mjs";

/**
 * Loads schedule spreadsheet rows from Fall, WinterSpring, and Summer sheets.
 * 
 * @param {string} [filePath=SCHEDULE_XLSX]
 * @returns {Array<object>}
 */
export function loadSchedule(filePath = SCHEDULE_XLSX) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const workbook = xlsx.readFile(filePath);
    const rows = [];

    for (const sheetName of ["Fall", "WinterSpring", "Summer"]) {
      if (!workbook.SheetNames.includes(sheetName)) continue;
      const ws = workbook.Sheets[sheetName];
      const rawArr = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null });

      let headerIdx = -1;
      let headers = null;
      for (let i = 0; i < rawArr.length; i++) {
        const r = (rawArr[i] || []).map((c) => String(c ?? "").trim());
        if (r.includes("Date") && (r.includes("Preacher") || r.includes("Speaker"))) {
          headerIdx = i;
          headers = r;
          break;
        }
      }
      if (!headers) continue;

      const col = (name) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
      const iDate = col("Date");
      const iPreacher = headers.findIndex((h) => /preacher|speaker/i.test(h));
      const iText = col("Text");
      const iTitle = col("Title");
      const iBigIdea = headers.findIndex((h) => /big\s*idea/i.test(h));
      const iSpecial = headers.findIndex((h) => /^special/i.test(h));
      const iNotes = headers.findIndex((h) => /notes/i.test(h));

      for (let r = headerIdx + 1; r < rawArr.length; r++) {
        const row = rawArr[r];
        const dateVal = row[iDate];
        if (!dateVal) continue;

        let dateISO = "";
        if (typeof dateVal === "number") {
          const d = xlsx.SSF.parse_date_code(dateVal);
          dateISO = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
        } else {
          const parsed = new Date(String(dateVal));
          if (!isNaN(parsed.getTime())) {
            dateISO = parsed.toISOString().slice(0, 10);
          }
        }
        if (!dateISO) continue;

        rows.push({
          date: dateISO,
          preacher: String(row[iPreacher] ?? "").trim(),
          text: String(row[iText] ?? "").trim(),
          title: String(row[iTitle] ?? "").trim(),
          bigIdea: String(row[iBigIdea] ?? "").trim(),
          special: String(row[iSpecial] ?? "").trim(),
          sundayNotes: String(row[iNotes] ?? "").trim(),
          _sheet: sheetName,
        });
      }
    }

    return rows;
  } catch (err) {
    console.warn(`[Schedule] Failed to load schedule from ${filePath}: ${err.message}`);
    return [];
  }
}

/**
 * Matches schedule rows strictly by exact ISO date.
 * 
 * @param {string} dateISO - Date string YYYY-MM-DD
 * @param {Array<object>} scheduleRows
 * @returns {object|null}
 */
export function matchScheduleByDate(dateISO, scheduleRows) {
  if (!dateISO || !Array.isArray(scheduleRows)) return null;
  return scheduleRows.find((r) => r.date === dateISO) || null;
}
