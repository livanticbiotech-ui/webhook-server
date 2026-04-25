const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===============================
// LOGGING
// ===============================
function log(...args) {
  console.log("[WEBHOOK]", ...args);
}

// ===============================
// PHONE EXTRACTOR
// ===============================
function getPhone(body) {
  try {
    const direct =
      body?.originalDetectIntentRequest?.payload?.AiSensyMobileNumber;

    if (direct) return direct.replace("+", "");

    const msg =
      body?.originalDetectIntentRequest?.payload?.AiSensyMessage;

    if (msg) {
      const parsed = JSON.parse(msg);
      if (parsed?.phone_number) {
        return parsed.phone_number.replace("+", "");
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

// ===============================
// AISENSY SEND FUNCTION (FINAL FIXED)
// ===============================
async function sendList(phone) {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        campaignName: "send_list_pdf",   // ✅ YOUR TEMPLATE NAME
        destination: phone,              // 91XXXXXXXXXX
        source: "dialogflow",
        userName: "Bot",
        templateParams: []
      },
      {
        headers: {
          Authorization: `Bearer YOUR_API_CAMPAIGN_KEY`, // ✅ IMPORTANT FIX
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    log("📤 AISENSY SUCCESS:", response.data);
    return true;

  } catch (err) {
    log("❌ AISENSY FAILED:", err?.response?.data || err.message);
    return false;
  }
}

// ===============================
// RESPONSE HELPER
// ===============================
function reply(res, text) {
  return res.json({
    fulfillmentText: text || "OK"
  });
}

// ===============================
// MAIN WEBHOOK
// ===============================
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    const source = body?.originalDetectIntentRequest?.source;
    const intent = body?.queryResult?.intent?.displayName;

    // Ignore Dialogflow console
    if (source === "DIALOGFLOW_CONSOLE") {
      log("Console ignored");
      return reply(res, "Console test only");
    }

    const phone = getPhone(body);

    log("Intent:", intent);
    log("Phone:", phone);

    // Safe fallback (never break bot)
    if (!phone) {
      log("⚠️ No phone found - safe exit");
      return reply(res, "Message received");
    }

    // ===============================
    // YOUR INTENT HANDLER
    // ===============================
    if (intent === "send_list") {
      log("📤 Triggering send_list_pdf for:", phone);

      const success = await sendList(phone);

      if (success) {
        return reply(res, "PDF sent successfully ✅");
      } else {
        return reply(res, "Failed to send PDF ❌");
      }
    }

    return reply(res, "OK");

  } catch (err) {
    log("🔥 Fatal error:", err.message);
    return reply(res, "Recovered from error");
  }
});

// ===============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 FINAL SYSTEM RUNNING ON PORT", PORT);
});
