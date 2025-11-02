## Connect the landing page form to Google Sheets (no Google Form)

This site posts directly to a Google Apps Script (Web App) that writes into a specific worksheet tab.

What you get out of the box:

- Client-side phone normalization (+60), duplicate guard, and 60s cooldown after submit
- CORS-first fetch with no-cors fallback for Apps Script
- Meta Pixel PageView + Lead on successful submit
- Tab routing: all leads go to a fixed tab “4Q Playlab 2.5hr Preview Leads”

---

### 1) Create the Apps Script (Code.gs)

1. Open your target Google Sheet
2. Extensions → Apps Script
3. Replace Code.gs with the code below and set the placeholders

```gs
function doPost(e) {
  try {
    // REQUIRED: the Google Sheet ID (string between /d/ and /edit in the URL)
    var SHEET_ID = "<YOUR_SHEET_ID>";
    // OPTIONAL: shared secret; must match ENDPOINT_SECRET in index.html
    var SHARED_SECRET = "<YOUR_SHARED_SECRET>";
    // Target worksheet tab name (fixed)
    var DEFAULT_TAB = "4Q Playlab 2.5hr Preview Leads";

    // Parse body
    var contentType = e.postData ? e.postData.type : "";
    var data = {};
    if (contentType === "application/json") {
      data = JSON.parse(e.postData.contents || "{}");
    } else {
      data = e.parameter || {};
    }

    // Basic auth
    if (SHARED_SECRET && (!data.secret || data.secret !== SHARED_SECRET)) {
      return json({ ok: false, error: "unauthorized" });
    }

    // Choose tab (default to fixed). Whitelist for safety.
    var tab = (data.sheet || DEFAULT_TAB).toString().trim();
    var allowed = [DEFAULT_TAB];
    if (allowed.indexOf(tab) === -1) {
      return json({ ok: false, error: "invalid_tab" });
    }

    // Open Sheet & target tab
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName(tab);
    if (!sh) {
      // Optional: create the tab and headers if missing
      sh = ss.insertSheet(tab);
      sh.appendRow([
        "Timestamp",
        "Session",
        "Name",
        "Phone",
        "Email",
        "ChildAge",
        "Source",
        "Status",
        "UserAgent",
      ]);
    }

    var now = new Date();
    var statusChk = "";

    // Columns: Timestamp | Session | Name | Phone | Email | ChildAge | Source | Status | UserAgent
    var row = [
      now,
      data.session || "",
      data.name || "",
      data.phone || "",
      data.email || data.contact || "",
      data.childAge || "",
      data.source || "",
      statusChk,
      data.userAgent || "",
    ];

    // Default behavior: append to bottom
    sh.appendRow(row);

    // Alternative: write newest at top (under header)
    // sh.insertRowAfter(1);
    // sh.getRange(2, 1, 1, row.length).setValues([row]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
```

Notes

- SHEET_ID: copy it from your Sheet URL.
- DEFAULT_TAB: this repository expects the tab name “4Q Playlab 2.5hr Preview Leads”. You can change it, but also update the client constant accordingly.
- If using the “newest at top” method, comment out appendRow and uncomment the insertRowAfter block.

---

### 2) Deploy as Web App

1. Apps Script → Deploy → New deployment → Type: Web app
2. Execute as: Me
3. Who has access: Anyone
4. Copy the Web App URL

---

### 3) Configure the client (index.html)

Open `index.html` and set:

- `GAS_ENDPOINT` = your Web App URL
- `ENDPOINT_SECRET` = your shared secret (must match SHARED_SECRET)
- `SHEET_TAB` = '4Q Playlab 2.5hr Preview Leads' (already set in this repo)

The form posts these fields:

- name, phone, email, childAge, session, submittedAt, source, userAgent, secret, sheet

Behavior:

- Duplicate guard (phone+session) via localStorage
- 60s cooldown timer with button countdown
- CORS-first fetch with JSON; fallback to no-cors if blocked
- fbq('track','Lead') on success

---

### 4) Test

1. Open the landing page and submit the form
2. Verify a new row appears in the tab “4Q Playlab 2.5hr Preview Leads”
3. If using “newest at top”, confirm it inserts under the header row

---

### Troubleshooting

- New rows are at the bottom: appendRow() writes to the last row; this is expected. Use the “newest at top” snippet if preferred.
- Blank rows in the middle are not auto-filled: appendRow() does not search for gaps; rows with formulas/spaces are considered filled.
- No rows appear: redeploy the Web App after Apps Script changes; ensure your `GAS_ENDPOINT` points to the latest deployment.
- Unauthorized: SHARED_SECRET must match ENDPOINT_SECRET.
- CORS/opaque response: client falls back to no-cors; you’ll still get the row but no JSON body.
- Multiple tabs: keep a whitelist in Apps Script (allowed array).

---

# 4Q Playlab Landing – Lead Routing and Advocate Notifications

This page explains how to enable round‑robin assignment of new leads to your six advocates and automatically send them a WhatsApp/SMS notification after each form submission.

## Overview

- Frontend (`index.html`) already posts the form to a Google Apps Script (GAS) Web App.
- Backend (Apps Script) writes the lead to your Google Sheet tab (default: `Website`), assigns an advocate in a round‑robin sequence, then notifies the assigned advocate via Twilio (WhatsApp preferred, SMS fallback).
- The round‑robin pointer is concurrency-safe using `LockService` and persisted in `PropertiesService` to survive redeploys.

## Setup Steps

1. Open your target Google Sheet

- Extensions → Apps Script → paste the file from `apps-script/Code.gs` into `Code.gs`.

2. Configure the backend

- In `Code.gs`, fill out:
  - `CONFIG.sharedSecret` to match `ENDPOINT_SECRET` in `index.html`.
  - `CONFIG.advocates`: set the six advocates with E.164 phone numbers (+60...)
  - `CONFIG.twilio`: set your Twilio `accountSid`, `authToken`, `fromWhatsapp` (e.g., `whatsapp:+14155238886` for sandbox), and optionally `fromSms` for SMS fallback. You can store secrets in Apps Script: Extensions → Apps Script → Project Settings → Script properties, and read via `PropertiesService` if desired.

3. Deploy the web app

- Apps Script: Deploy → New deployment → Type: Web app
- Execute as: Me; Who has access: Anyone (or Anyone with the link)
- Copy the deployment URL

4. Point the frontend to your GAS endpoint

- In `index.html`, update `GAS_ENDPOINT` to your deployment URL.
- Ensure `ENDPOINT_SECRET` matches the server’s `CONFIG.sharedSecret`.

5. Test end‑to‑end

- Submit the form once. The sheet gets a new row, and the assigned advocate (1) receives a WhatsApp (or SMS) message.
- Submit again with a different phone/session; the next advocate (2) gets it, and so on, cycling 1 → 2 → 3 → 4 → 5 → 6 → 1…

## How Round‑Robin Works

- `advocate_index` is stored in `ScriptProperties` and incremented atomically under `LockService`.
- On each POST:
  - lock → read current index → assign `advocates[index % advocates.length]` → append row → increment index → unlock.

## Message Template to Advocate

```
New 4Q Playlab lead assigned to you:
Name: <name>
Phone: <phone>
Email: <email>
Child Age: <childAge>
State: <state>
Session: <session>
Heard from: <source>
Deemcee: <branch>
Other: <other>
Referral: <friend>
Source: <landing url>
— Please contact parent in 10 minutes.
```

## Optional: Hide secrets in PropertiesService

Instead of hardcoding Twilio credentials in code, set them under Project Settings → Script properties and read them:

```js
function getTwilio() {
  const p = PropertiesService.getScriptProperties();
  return {
    accountSid: p.getProperty("TWILIO_SID"),
    authToken: p.getProperty("TWILIO_TOKEN"),
    fromWhatsapp: p.getProperty("TWILIO_FROM_WA"),
    fromSms: p.getProperty("TWILIO_FROM_SMS"),
    enableWhatsapp: true,
    enableSmsFallback: true,
  };
}
```

Then replace `CONFIG.twilio` uses with `getTwilio()`.

## Notes

- Duplicate prevention: Frontend blocks same phone+session via `localStorage`. Server also checks duplicates if your sheet has `Phone` and `Session` headers.
- CORS: Server returns JSON with permissive CORS. Frontend falls back to `no-cors` fire‑and‑forget if CORS fails.
- Sheet columns: If the sheet is empty, the server writes a header row automatically with expected column names.
- WhatsApp sandbox: If you’re using Twilio sandbox, make sure all advocate numbers have joined the sandbox or you have a WhatsApp-approved sender.

## Troubleshooting

- 401 Unauthorized from GAS → Make sure `ENDPOINT_SECRET` equals `CONFIG.sharedSecret`.
- No WhatsApp arrives → Check Twilio credentials, sender numbers, and that the recipient joined sandbox. Inspect Apps Script logs (Executions) for errors.
- Not assigning sequentially → Confirm the web app is a single script and `advocate_index` is not being reset; Apps Script deployments preserve script properties across runs.

---

# parentfirst-4q-playlab-landing

Landing page for 4Q Playlab preview. Includes a direct-to-Sheets submission flow and basic analytics.
