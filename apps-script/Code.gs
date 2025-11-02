/**
 * Google Apps Script Web App backend for 4Q Playlab landing.
 * Features:
 * - Append to Google Sheet tab (first empty row after header)
 * - Round-robin assignment to 6 advocates with concurrency-safe LockService
 * - Send WhatsApp (preferred) and/or SMS via Twilio
 * - Lightweight CORS and JSON responses for browser fetch
 *
 * How to deploy:
 * 1) In your target Google Sheet: Extensions -> Apps Script. Paste this file into Code.gs
 * 2) Fill in CONFIG below (sheet name, secret, Twilio credentials, advocate roster)
 * 3) Deploy -> New deployment -> Type: Web app
 *    Execute as: Me; Who has access: Anyone (or Anyone with link)
 * 4) Copy the deployment URL and put it in GAS_ENDPOINT on index.html
 */

const CONFIG = {
  sheetNameFallback: "Website", // default sheet/tab if not provided by form
  sharedSecret: "qwe@fxcvcx!@#@@#@@@1235343sdfsdf", // must match ENDPOINT_SECRET in frontend
  // Twilio configuration
  twilio: {
    accountSid: "ACd2aa21dbcff51861209056e0c06c9472", // TODO: update
    authToken: "7dbb088b9902ec77ed3572a89d2fddaf", // TODO: update (consider using PropertiesService)
    fromWhatsapp: "whatsapp:+60142991187", // Twilio sandbox or number
    fromSms: "+1xxxxxxxxxx", // Your Twilio SMS number (optional)
    // Use Twilio Content API for WhatsApp templates in production (HX...)
    contentSid: "HX397de0a6392dbf01a3d39f49e45f20b7",
    enableWhatsapp: true,
    enableSmsFallback: true,
  },
  // Telegram configuration (preferred over WhatsApp when enabled)
  telegram: {
    enable: true, // set to true to send via Telegram instead of WhatsApp
    // Bot token from @BotFather (store in Script Properties for security in production)
    botToken: "7651316954:AAGAYVzAuXbHAEe9lew8_vs5pH6V4cFoW54", // e.g. "123456789:AA..."
    // Default template; can be overridden per-advocate via advocate.template
    template: `你好啊！我是来自 Parents First 的 {{1}} ☺️ 我已经学了 <科艺育儿> {{2}}年了！\n现在也是 4Q Mirror Playlab 的提倡者 \n我来通知你，你的 说明会 报名我们收到咯！\n\n📌姓名：{{3}}\n📌电话号码   {{4}}\n📌孩子岁数：{{5}}\n📌选择时间：{{6}}\n\n请问你为什么会对这个说明会有兴趣的？\n你比较想提升哪一方面呢？\n1️⃣ 和孩子沟通  \n2️⃣ 情绪管理 \n3️⃣ 自我成长`,
  },
  // How to insert new submissions into the sheet:
  //  - "append": add at bottom (default Apps Script behavior)
  //  - "firstEmpty": find the first empty row after the header and fill it
  //  - "top": always insert under header (newest on top)
  sheetInsertMode: "firstempty",
  // Define the 6 advocates in order. Use E.164 phones for WhatsApp/SMS
  advocates: [
    {
      name: "Windy",
      phone: "+60169706530",
      whatsapp: true,
      years: 3,
      contentSid: "HX983975112772649c402f0cdf696f95bb",
      telegramChatId: "312365951",
      template: `你好啊！我是来自 Parents First 的 {{1}} ☺️ 我已经学了 <科艺育儿> {{2}}年了！\n现在也是 4Q Mirror Playlab 的提倡者 \n我来通知你，你的 说明会 报名我们收到咯！\n\n📌姓名：{{3}}\n📌电话号码   {{4}}\n📌孩子岁数：{{5}}\n📌选择时间：{{6}}\n\n请问你为什么会对这个说明会有兴趣的？\n你比较想提升哪一方面呢？\n1️⃣ 和孩子沟通  \n2️⃣ 情绪管理 \n3️⃣ 自我成长`,
      variableMap: [
        "advocateName",
        "advocateYears",
        "name",
        "phone",
        "childAge",
        "session",
      ],
    },
    {
      name: "Jovinm",
      phone: "+60169706530",
      whatsapp: true,
      years: 3,
      contentSid: "HX983975112772649c402f0cdf696f95bb",
      telegramChatId: "312365951",
      template: `你好啊！我是来自 Parents First 的 {{1}} ☺️ 我已经学了 <科艺育儿> {{2}}年了！\n现在也是 4Q Mirror Playlab 的提倡者 \n我来通知你，你的 说明会 报名我们收到咯！\n\n📌姓名：{{3}}\n📌电话号码   {{4}}\n📌孩子岁数：{{5}}\n📌选择时间：{{6}}\n\n请问你为什么会对这个说明会有兴趣的？\n你比较想提升哪一方面呢？\n1️⃣ 和孩子沟通  \n2️⃣ 情绪管理 \n3️⃣ 自我成长`,
      variableMap: [
        "advocateName",
        "advocateYears",
        "name",
        "phone",
        "childAge",
        "session",
      ],
    },
    {
      name: "Ru Yi",
      phone: "+60169706530",
      whatsapp: true,
      years: 2,
      contentSid: "HX983975112772649c402f0cdf696f95bb",
      telegramChatId: "312365951",
      template: `你好啊！我是来自 Parents First 的 {{1}} ☺️ 我已经学了 <科艺育儿> {{2}}年了！\n现在也是 4Q Mirror Playlab 的提倡者 \n我来通知你，你的 说明会 报名我们收到咯！\n\n📌姓名：{{3}}\n📌电话号码   {{4}}\n📌孩子岁数：{{5}}\n📌选择时间：{{6}}\n\n请问你为什么会对这个说明会有兴趣的？\n你比较想提升哪一方面呢？\n1️⃣ 和孩子沟通  \n2️⃣ 情绪管理 \n3️⃣ 自我成长`,
      variableMap: [
        "advocateName",
        "advocateYears",
        "name",
        "phone",
        "childAge",
        "session",
      ],
    },
    {
      name: "Grace",
      phone: "+60169706530",
      whatsapp: true,
      years: 3,
      contentSid: "HX983975112772649c402f0cdf696f95bb",
      telegramChatId: "312365951",
      template: `你好啊！我是来自 Parents First 的 {{1}} ☺️ 我已经学了 <科艺育儿> {{2}}年了！\n现在也是 4Q Mirror Playlab 的提倡者 \n我来通知你，你的 说明会 报名我们收到咯！\n\n📌姓名：{{3}}\n📌电话号码   {{4}}\n📌孩子岁数：{{5}}\n📌选择时间：{{6}}\n\n请问你为什么会对这个说明会有兴趣的？\n你比较想提升哪一方面呢？\n1️⃣ 和孩子沟通  \n2️⃣ 情绪管理 \n3️⃣ 自我成长`,
      variableMap: [
        "advocateName",
        "advocateYears",
        "name",
        "phone",
        "childAge",
        "session",
      ],
    },
    {
      name: "Lee Ting",
      phone: "+60169706530",
      whatsapp: true,
      years: 3,
      contentSid: "HX983975112772649c402f0cdf696f95bb",
      telegramChatId: "312365951",
      template: `你好啊！我是来自 Parents First 的 {{1}} ☺️ 我已经学了 <科艺育儿> {{2}}年了！\n现在也是 4Q Mirror Playlab 的提倡者 \n我来通知你，你的 说明会 报名我们收到咯！\n\n📌姓名：{{3}}\n📌电话号码   {{4}}\n📌孩子岁数：{{5}}\n📌选择时间：{{6}}\n\n请问你为什么会对这个说明会有兴趣的？\n你比较想提升哪一方面呢？\n1️⃣ 和孩子沟通  \n2️⃣ 情绪管理 \n3️⃣ 自我成长`,
      variableMap: [
        "advocateName",
        "advocateYears",
        "name",
        "phone",
        "childAge",
        "session",
      ],
    },
    {
      name: "Irene",
      phone: "+60169706530",
      whatsapp: true,
      years: 3,
      contentSid: "HX983975112772649c402f0cdf696f95bb",
      telegramChatId: "312365951",
      template: `你好啊！我是来自 Parents First 的 {{1}} ☺️ 我已经学了 <科艺育儿> {{2}}年了！\n现在也是 4Q Mirror Playlab 的提倡者 \n我来通知你，你的 说明会 报名我们收到咯！\n\n📌姓名：{{3}}\n📌电话号码   {{4}}\n📌孩子岁数：{{5}}\n📌选择时间：{{6}}\n\n请问你为什么会对这个说明会有兴趣的？\n你比较想提升哪一方面呢？\n1️⃣ 和孩子沟通  \n2️⃣ 情绪管理 \n3️⃣ 自我成长`,
      variableMap: [
        "advocateName",
        "advocateYears",
        "name",
        "phone",
        "childAge",
        "session",
      ],
    },
    {
      name: "Li Hee",
      phone: "+60169706530",
      whatsapp: true,
      years: 5,
      contentSid: "HX983975112772649c402f0cdf696f95bb",
      telegramChatId: "312365951",
      template: `你好啊！我是来自 Parents First 的 {{1}} ☺️ 我已经学了 <科艺育儿> {{2}}年了！\n现在也是 4Q Mirror Playlab 的提倡者 \n我来通知你，你的 说明会 报名我们收到咯！\n\n📌姓名：{{3}}\n📌电话号码   {{4}}\n📌孩子岁数：{{5}}\n📌选择时间：{{6}}\n\n请问你为什么会对这个说明会有兴趣的？\n你比较想提升哪一方面呢？\n1️⃣ 和孩子沟通  \n2️⃣ 情绪管理 \n3️⃣ 自我成长`,
      variableMap: [
        "advocateName",
        "advocateYears",
        "name",
        "phone",
        "childAge",
        "session",
      ],
    },
  ],
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

    // Detect duplicate on same phone+session to avoid double-insert
    const phone = (params.phone || "").trim();
    const session = (params.session || "").trim();
    if (phone && session) {
      const range = sheet.getDataRange();
      const values = range.getValues();
      // Assume header row at 1; try to locate column indices by header names where possible
      const header = values[0] || [];
      const colIdx = (name) =>
        header.findIndex((h) => (h + "").toLowerCase() === name.toLowerCase());
      const phoneIdx = colIdx("Phone");
      const sessionIdx = colIdx("Session");
      if (phoneIdx >= 0 && sessionIdx >= 0) {
        for (let r = 1; r < values.length; r++) {
          if (
            (values[r][phoneIdx] + "").trim() === phone &&
            (values[r][sessionIdx] + "").trim() === session
          ) {
            return ContentService.createTextOutput(
              JSON.stringify({
                success: false,
                duplicate: true,
                message: "Already submitted",
              })
            ).setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
    }

    // Acquire a public lock for round-robin assignment + append
    const lock = LockService.getPublicLock();
    lock.waitLock(5000);

    // Get current pointer from PropertiesService
    const props = PropertiesService.getScriptProperties();
    const idxRaw =
      parseInt(props.getProperty("advocate_index") || "0", 10) || 0;
    const advocates = CONFIG.advocates;
    // Conditional override: if referralSource is 'Deemcee', always route to Jovinm
    const isDeemcee =
      (params.referralSource || "").trim().toLowerCase() === "deemcee";
    let assigned = advocates[idxRaw % advocates.length];
    if (isDeemcee) {
      const target = advocates.find(
        (a) => (a.name || "").toLowerCase() === "jovinm"
      );
      if (target) {
        assigned = target;
      }
    }

    // Build row. If sheet is empty, write header first
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Name",
        "Phone",
        "ChildAge",
        "Email",
        "Session",
        "Source",
        "Status",
        "UserAgent",
        "Preview Turn Up",
        "4Q Sign Up",
        "fromState",
        "referralSource",
        "referralOther",
        "referralFriend",
        "referralDeemcee",
        "Assigned Advocate",
      ]);
    }

    var now = new Date();
    var statusChk = "";
    var previewTurnUp = "";
    var fourqSignUp = "";

    const row = [
      new Date(),
      params.name || "",
      phone,
      params.childAge || "",
      params.email || "",
      session,
      params.source || "",
      statusChk,
      params.userAgent || "",
      previewTurnUp,
      fourqSignUp,
      params.fromState || "",
      params.referralSource || "",
      params.referralOther || "",
      params.referralFriend || "",
      params.referralDeemcee || "",
      assigned.name,
    ];

    insertRowRespectingMode(sheet, row);

    // Advance the round-robin pointer only if we did NOT force assign to Jovinm
    if (!isDeemcee) {
      props.setProperty(
        "advocate_index",
        String((idxRaw + 1) % advocates.length)
      );
    }

    // Release lock ASAP before external calls
    lock.releaseLock();

    // Send notifications (fire-and-forget style; errors are logged but not fatal)
    try {
      notifyAdvocate(assigned, params);
    } catch (err) {
      console.error("notifyAdvocateTwilio failed:", err);
    }

    const resp = { success: true, advocate: assigned.name };
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
 * Notify advocate: Telegram (preferred) -> WhatsApp (Twilio) fallback -> SMS fallback
 */
function notifyAdvocate(advocate, lead) {
  const tg = CONFIG.telegram || {};
  if (tg.enable) {
    try {
      const chatId = advocate.telegramChatId || advocate.telegram_chat_id;
      const template = advocate.template || tg.template;
      if (!tg.botToken) {
        console.warn("Telegram enabled but botToken missing");
      } else if (!chatId) {
        console.warn(
          "Telegram enabled but advocate.telegramChatId missing for",
          advocate.name
        );
      } else if (template) {
        const vars = buildTemplateVariables(
          lead,
          advocate,
          advocate.variableMap || [
            "advocateName",
            "advocateYears",
            "name",
            "phone",
            "childAge",
            "session",
          ]
        );
        const text = renderTemplate(template, vars);
        try {
          console.log("Telegram template vars:", JSON.stringify(vars));
          console.log("Telegram rendered text:", text);
        } catch (e) {}
        sendTelegramMessage(tg.botToken, chatId, text);
        return; // success path
      }
    } catch (err) {
      console.warn("Telegram send failed, will try WhatsApp fallback:", err);
    }
  }
  // Fallback to existing Twilio flow
  //notifyAdvocateTwilio(advocate, lead);
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
 * Send WhatsApp (preferred) or SMS via Twilio to the assigned advocate
 */
function notifyAdvocateTwilio(advocate, lead) {
  const tw = CONFIG.twilio;
  if (!tw.accountSid || !tw.authToken) {
    console.warn("Twilio not configured");
    return;
  }

  const leadName = (lead.name || "").trim();
  const leadPhone = (lead.phone || "").trim();
  const session = (lead.session || "").trim();
  const src = (lead.referralSource || "").trim();
  const state = (lead.fromState || "").trim();
  const childAge = (lead.childAge || "").trim();

  const text =
    "New 4Q Playlab lead assigned to you:\n" +
    "Name: " +
    leadName +
    "\n" +
    "Phone: " +
    leadPhone +
    "\n" +
    (lead.email ? "Email: " + lead.email + "\n" : "") +
    (childAge ? "Child Age: " + childAge + "\n" : "") +
    (state ? "State: " + state + "\n" : "") +
    (session ? "Session: " + session + "\n" : "") +
    "— Please contact the parent";

  // Prefer WhatsApp if flagged and enabled
  if (tw.enableWhatsapp && advocate.whatsapp) {
    try {
      const toWa = "whatsapp:" + cleanPhone(advocate.phone);
      const contentSidToUse = advocate.contentSid || tw.contentSid;
      if (contentSidToUse) {
        // Send via template using Twilio Content API with numbered string variables
        const vars = buildTemplateVariables(
          lead,
          advocate,
          advocate.variableMap
        );
        twilioSendContentMessage(toWa, tw.fromWhatsapp, contentSidToUse, vars);
      } else {
        // Fallback plain text (useful for sandbox / 24h session)
        twilioSendMessage(toWa, text, true);
      }
      return;
    } catch (err) {
      console.warn("WhatsApp send failed, will try SMS if enabled:", err);
    }
  }
  if (tw.enableSmsFallback) {
    twilioSendMessage(cleanPhone(advocate.phone), text, false);
  }
}

/**
 * Render a template by replacing {{1}}..{{N}} with vars["1"]..vars["N"].
 */
function renderTemplate(template, vars) {
  let text = String(template || "");
  // Normalize full-width braces and spaced placeholders like {{ 1 }} -> {{1}}
  text = text.replace(/\uFF5B/g, "{").replace(/\uFF5D/g, "}");
  text = text.replace(/\{\{\s*(\d+)\s*\}\}/g, "{{$1}}");
  // Replace up to 15 placeholders using split/join to avoid regex escaping issues
  for (let i = 1; i <= 15; i++) {
    const key = String(i);
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      const val = vars[key] == null ? "" : String(vars[key]);
      const placeholder = "{{" + i + "}}";
      if (text.indexOf(placeholder) !== -1) {
        text = text.split(placeholder).join(val);
      }
    }
  }
  // As a final safeguard, strip any unreplaced numeric placeholders {{N}}
  text = text.replace(/\{\{\d+\}\}/g, "");
  return text;
}

/**
 * Send a Telegram message via Bot API
 */
function sendTelegramMessage(botToken, chatId, text) {
  const url =
    "https://api.telegram.org/bot" +
    encodeURIComponent(botToken) +
    "/sendMessage";
  const payload = {
    chat_id: String(chatId),
    text: String(text || ""),
    disable_web_page_preview: true,
    // parse_mode: "MarkdownV2", // optional: comment out to avoid escaping headaches
  };
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("Telegram error " + code + ": " + res.getContentText());
  }
}

/**
 * Build ContentVariables for Twilio Content API.
 * Supports optional advocate-specific variable order via variableMap.
 * Default order maps to: name, phone, email, fromState, session.
 * variableMap example: ["name","phone","email","fromState","session"]
 */
function buildTemplateVariables(lead, advocate, variableMap) {
  const safe = (v) => (v == null ? "" : ("" + v).trim());
  const defaultMap = ["name", "phone", "email", "fromState", "session"];
  const fields =
    Array.isArray(variableMap) && variableMap.length > 0
      ? variableMap
      : defaultMap;

  const values = fields.map((key) => {
    switch (key) {
      case "advocateName":
      case "advName":
        return safe(advocate && advocate.name);
      case "advocateYears":
      case "advYears":
      case "years":
        return safe(advocate && (advocate.years || advocate.experienceYears));
      case "name":
        return safe(lead.name);
      case "phone":
        return safe(lead.phone);
      case "email":
        return safe(lead.email);
      case "fromState":
      case "state":
        return safe(lead.fromState || lead.state);
      case "session":
        return safe(lead.session);
      case "childAge":
        return safe(lead.childAge);
      case "source":
        return safe(lead.source);
      default:
        return safe(lead[key]);
    }
  });

  // Convert array to {"1":v1, "2":v2, ...}
  const vars = {};
  for (let i = 0; i < values.length; i++) {
    vars[String(i + 1)] = values[i] || "";
  }
  return vars;
}

/**
 * Twilio send helper using UrlFetchApp
 * @param {string} to - e.g. 'whatsapp:+6012...' or '+6012...'
 * @param {string} body
 * @param {boolean} isWhatsapp
 */
function twilioSendMessage(to, body, isWhatsapp) {
  const tw = CONFIG.twilio;
  const url =
    "https://api.twilio.com/2010-04-01/Accounts/" +
    tw.accountSid +
    "/Messages.json";
  const payload = {
    To: to,
    Body: body,
  };
  if (isWhatsapp) {
    payload.From = tw.fromWhatsapp;
  } else {
    payload.From = tw.fromSms;
  }
  const options = {
    method: "post",
    payload: payload,
    muteHttpExceptions: true,
    headers: {
      Authorization:
        "Basic " + Utilities.base64Encode(tw.accountSid + ":" + tw.authToken),
    },
  };
  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("Twilio error " + code + ": " + res.getContentText());
  }
}

/**
 * Send WhatsApp using Twilio Content API (template-based, production-ready)
 * @param {string} to - e.g. 'whatsapp:+60...'
 * @param {string} from - your WhatsApp-enabled sender e.g. 'whatsapp:+60...'
 * @param {string} contentSid - HX... Content SID
 * @param {Object} variables - key/value map matching template placeholders
 */
function twilioSendContentMessage(to, from, contentSid, variables) {
  const tw = CONFIG.twilio;
  const url =
    "https://api.twilio.com/2010-04-01/Accounts/" +
    tw.accountSid +
    "/Messages.json";
  const payload = {
    To: to,
    From: from,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(variables || {}),
  };
  const options = {
    method: "post",
    payload: payload,
    muteHttpExceptions: true,
    headers: {
      Authorization:
        "Basic " + Utilities.base64Encode(tw.accountSid + ":" + tw.authToken),
    },
  };
  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("Twilio error " + code + ": " + res.getContentText());
  }
}

function cleanPhone(s) {
  s = (s || "").trim();
  if (!s) return s;
  // Normalize leading 00 to +, strip spaces
  s = s.replace(/^00+/, "+").replace(/\s+/g, "");
  if (s.startsWith("+")) return s;
  // If local format like 012..., assume Malaysia +60
  if (/^0\d{8,10}$/.test(s)) return "+60" + s.replace(/^0+/, "");
  return s;
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
