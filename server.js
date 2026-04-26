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
    return null; // Phone extraction failed, still safe
  }
}

async function sendListPDF(phone) {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: "YOUR_API_CAMPAIGN_KEY_HERE",  // ✅ Paste your API Campaign Key here
        campaignName: "send_list_pdf",
        destination: phone,
        source: "dialogflow",
        userName: "Bot",
        templateParams: []
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 8000  // 8 sec timeout, won't hang forever
      }
    );
    log("✅ CAMPAIGN SENT:", response.data);
    return true;
  } catch (err) {
    log("❌ CAMPAIGN FAILED:", err?.response?.data || err.message);
    return false; // Failure logged but never crashes bot
  }
}

function reply(res, text) {
  try {
    // Double safety: even reply function is protected
    return res.json({ fulfillmentText: text || "OK" });
  } catch (e) {
    log("⚠️ Reply failed:", e.message);
  }
}

// ✅ MASTER SAFETY NET - catches everything
process.on("uncaughtException", (err) => {
  log("🔥 Uncaught Exception (server still running):", err.message);
});

process.on("unhandledRejection", (reason) => {
  log("🔥 Unhandled Rejection (server still running):", reason);
});

app.post("/webhook", async (req, res) => {
  // ✅ OUTER TRY-CATCH: Nothing escapes this
  try {
    const body = req.body || {};
    const source = body?.originalDetectIntentRequest?.source;
    const intent = body?.queryResult?.intent?.displayName;

    // Ignore Dialogflow console tests
    if (source === "DIALOGFLOW_CONSOLE") {
      return reply(res, "OK");
    }

    // ✅ INNER TRY-CATCH: Phone + campaign logic protected separately
    try {
      const phone = getPhone(body);
      log("Intent:", intent, "| Phone:", phone);

      if (intent === "send_list") {
        if (phone) {
          log("📤 Sending list to:", phone);
          // ✅ Fire and forget — bot replies instantly, PDF sends in background
          sendListPDF(phone).catch((e) => log("Background send failed:", e.message));
        } else {
          log("⚠️ No phone found for send_list intent");
        }
        // ✅ Always reply immediately — bot never waits, never stops
        return reply(res, "✅ Hamari product list aapko bhej di gayi hai!");
      }

    } catch (innerErr) {
      log("⚠️ Inner error caught:", innerErr.message);
      // Still reply OK so bot doesn't stop
    }

    return reply(res, "OK");

  } catch (outerErr) {
    log("🔥 Outer error caught:", outerErr.message);
    // Last resort reply — bot must not stop
    try {
      return res.json({ fulfillmentText: "OK" });
    } catch (e) {
      // Nothing more we can do
    }
  }
});

// Health check route (useful for Render)
app.get("/", (req, res) => {
  res.send("✅ Livantic Biotech Webhook is Running!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Livantic Biotech Webhook Running on port", PORT));
