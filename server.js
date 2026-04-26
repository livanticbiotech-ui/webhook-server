const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

function log(...args) {
  console.log("[WEBHOOK]", ...args);
}

function getPhone(body) {
  try {
    const direct = body?.originalDetectIntentRequest?.payload?.AiSensyMobileNumber;
    if (direct) return direct.replace("+", "").replace(/\s/g, "");

    const msg = body?.originalDetectIntentRequest?.payload?.AiSensyMessage;
    if (msg) {
      const parsed = typeof msg === "string" ? JSON.parse(msg) : msg;
      if (parsed?.phone_number) return parsed.phone_number.replace("+", "");
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function sendListPDF(phone) {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YjkzZGYzOTkyZjA5MTBmMTEwMzYxMyIsIm5hbWUiOiJsaXZhbnRpYyBiaW90ZWNoIDE3NjAiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjhiOTNkZjM5OTJmMDkxMGYxMTAzNjBlIiwiYWN0aXZlUGxhbiI6IkJBU0lDX01PTlRITFkiLCJpYXQiOjE3NzcxMjI0ODJ9.-kJgh0Jdv-I8EsFIuKN7QiRyNHLjpY6V6Z6irsvGHRg",  // ✅ SIRF YAHAN KEY LAGAO
        campaignName: "send_list_pdf",
        destination: phone,
        source: "dialogflow",
        userName: "Bot",
        templateParams: []
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 8000
      }
    );
    log("✅ CAMPAIGN SENT:", response.data);
    return true;
  } catch (err) {
    log("❌ CAMPAIGN FAILED:", err?.response?.data || err.message);
    return false;
  }
}

function reply(res, text) {
  try {
    return res.json({ fulfillmentText: text || "OK" });
  } catch (e) {
    log("⚠️ Reply failed:", e.message);
  }
}

process.on("uncaughtException", (err) => {
  log("🔥 Uncaught Exception (server still running):", err.message);
});

process.on("unhandledRejection", (reason) => {
  log("🔥 Unhandled Rejection (server still running):", reason);
});

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body || {};
    const source = body?.originalDetectIntentRequest?.source;
    const intent = body?.queryResult?.intent?.displayName;

    if (source === "DIALOGFLOW_CONSOLE") {
      return reply(res, "OK");
    }

    try {
      const phone = getPhone(body);
      log("Intent:", intent, "| Phone:", phone);

      if (intent === "send_list") {
        if (phone) {
          log("📤 Sending list to:", phone);
          sendListPDF(phone).catch((e) => log("Background send failed:", e.message));
        }
        return reply(res, "✅ Hamari product list aapko bhej di gayi hai!");
      }

    } catch (innerErr) {
      log("⚠️ Inner error caught:", innerErr.message);
    }

    return reply(res, "OK");

  } catch (outerErr) {
    log("🔥 Outer error caught:", outerErr.message);
    try {
      return res.json({ fulfillmentText: "OK" });
    } catch (e) {}
  }
});

app.get("/", (req, res) => {
  res.send("✅ Livantic Biotech Webhook is Running!");
});

const PORT = process.env.
