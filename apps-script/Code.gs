/**
 * Google Apps Script Web App backend for 4Q Playlab landing.
 * Features:
 * - Append form submissions to a Google Sheet
 * - Lightweight CORS and JSON responses for browser fetch
 *
 * How to deploy:
 * 1) In your target Google Sheet: Extensions -> Apps Script. Paste this file into Code.gs
 * 2) Update CONFIG.sharedSecret to a strong random string and choose sheetInsertMode if needed
 * 3) Deploy -> New deployment -> Type: Web app
 *    Execute as: Me; Who has access: Anyone (or Anyone with link)
 * 4) Copy the deployment URL and put it in GAS_ENDPOINT on index.html
 */

const CONFIG = {
  sheetNameFallback: "Website", // default sheet/tab if not provided by form
  // shared secret to prevent unauthorised inserts -- must match frontend ENDPOINT_SECRET
  sharedSecret: "rt#$%2323gghh",
  // How to insert new submissions into the sheet: "append" | "firstempty" | "top"
  sheetInsertMode: "append",
};

/**
 * Handle form POST (application/x-www-form-urlencoded) from frontend
 */
function doPost(e) {
  try {
    const params = e.parameter || {};

    if (
      e.postData &&
      e.postData.type &&
      e.postData.type.indexOf("json") !== -1
    ) {
      // If JSON is sent, merge into params
      const body = JSON.parse(e.postData.contents || "{}");
      Object.assign(params, body);
    }

    // Basic auth with shared secret
    if (CONFIG.sharedSecret && params.secret !== CONFIG.sharedSecret) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: true, message: "Unauthorized" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const sheetName = params.sheet || CONFIG.sheetNameFallback;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    // Build row. If sheet is empty, write header matching the four form fields
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Name", "Phone", "Email", "People"]);
    }

    // Normalize Malaysia phone to E.164 (+60...) and force text in Sheets to preserve '+' and leading zeros
    const phoneRaw = (params.phone || "").trim();
    const phoneE164 = normalizePhoneMY(phoneRaw);
    const phoneForSheet = phoneE164 ? ("'" + phoneE164) : (phoneRaw ? ("'" + phoneRaw) : "");

    const row = [
      new Date(),
      params.name || "",
      phoneForSheet,
      params.email || "",
      params.people || "",
    ];

    insertRowRespectingMode(sheet, row);

    const resp = { success: true };
    return ContentService.createTextOutput(JSON.stringify(resp)).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: true, message: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput("OK");
}

/**
 * Insert a row according to CONFIG.sheetInsertMode
 * - append: sheet.appendRow(row)
 * - firstEmpty: find first empty row after header and place values
 * - top: insert a new row 2 and place values (newest on top)
 */
function insertRowRespectingMode(sheet, row) {
  const mode = (CONFIG.sheetInsertMode || "append").toLowerCase();
  const width = row.length;
  if (mode === "top") {
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1, 1, width).setValues([row]);
    return;
  }
  if (mode === "firstempty") {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      // Only header exists; next is row 2
      sheet.getRange(2, 1, 1, width).setValues([row]);
      return;
    }
    // Scan rows 2..lastRow for a fully empty row across width
    const rng = sheet.getRange(2, 1, lastRow - 1, width);
    const values = rng.getValues();
    for (let i = 0; i < values.length; i++) {
      const isEmpty = values[i].every((c) => c === "" || c === null);
      if (isEmpty) {
        sheet.getRange(2 + i, 1, 1, width).setValues([row]);
        return;
      }
    }
    // No gaps found; append at bottom
    sheet.appendRow(row);
    return;
  }
  // default: append
  sheet.appendRow(row);
}

/**
 * Preflight for CORS
 */
function doOptions() {
  // Apps Script doesn't route OPTIONS like typical servers; this is a no-op placeholder.
  return ContentService.createTextOutput("OK").setMimeType(
    ContentService.MimeType.TEXT
  );
}

/**
 * Normalize Malaysia phone numbers to E.164 format (+60XXXXXXXXX)
 * - If starts with +60 -> keep
 * - If starts with 60 (no +) -> add +
 * - If starts with 0 -> replace leading 0 with +60
 * - If starts with 00 -> convert to +
 * - Strip spaces, dashes, parentheses, dots
 * - If looks like a Malaysian mobile without leading 0 (e.g. 1XXXXXXXXX), prepend +60
 */
function normalizePhoneMY(input) {
  let s = String(input || "").trim();
  if (!s) return "";
  // remove formatting characters
  s = s.replace(/[\s\-().]/g, "");

  // international prefix 00 -> +
  if (s.startsWith("00")) s = "+" + s.slice(2);

  // already has plus
  if (s.startsWith("+")) {
    // normalize +060... to +60...
    if (s.startsWith("+060")) return "+60" + s.slice(4);
    return s;
  }

  // starts with country code without plus
  if (s.startsWith("60")) return "+" + s;

  // domestic leading zero -> replace with +60
  if (s.startsWith("0")) return "+60" + s.slice(1);

  // looks like Malaysian mobile without 0 (1XXXXXXXXX)
  if (/^1\d{8,9}$/.test(s)) return "+60" + s;

  // fallback: return as-is
  return s;
}
