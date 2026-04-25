const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===============================
// SAFE LOGGING
// ===============================
function log(...args) {
  console.log("[WEBHOOK]", ...args);
}

// ===============================
// SESSION / PHONE EXTRACTOR
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
// AISENSY API CALL (FINAL FIX)
// ===============================
async function sendList(phone) {
  try {
    const response = await axios.post(
      "https://api.aisensy.com/campaign/t1/api/v2", // ⚠️ confirm endpoint
      {
        apiKey: "YOUR_API_KEY",
        to: phone,
        type: "text",
        message: "📄 Here is your requested list"
      },
      {
        timeout: 10000
      }
    );

    log("📤 AISensy Success:", response.data);
    return true;

  } catch (err) {
    log("❌ AISensy Failed:", err?.response?.data || err.message);
    return false;
  }
}

// ===============================
// GUARANTEED RESPONSE
// ===============================
function reply(res, text) {
  return res.json({
    fulfillmentText: text || "OK"
  });
}

// ===============================
// WEBHOOK
// ===============================
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    const source = body?.originalDetectIntentRequest?.source;
    const intent = body?.queryResult?.intent?.displayName;

    // ===============================
    // IGNORE CONSOLE
    // ===============================
    if (source === "DIALOGFLOW_CONSOLE") {
      log("Console ignored");
      return reply(res, "Console test only");
    }

    const phone = getPhone(body);

    log("Intent:", intent);
    log("Phone:", phone);

    // ===============================
    // SAFE FALLBACK (NO DEAD BOT)
    // ===============================
    if (!phone) {
      log("⚠️ No phone - safe exit");

      return reply(res, "Message received");
    }

    // ===============================
    // MAIN INTENT
    // ===============================
    if (intent === "send_list") {
      log("📤 Sending list to:", phone);

      const success = await sendList(phone);

      if (success) {
        return reply(res, "List sent successfully ✅");
      } else {
        return reply(res, "Failed to send list ❌");
      }
    }

    // ===============================
    // DEFAULT
    // ===============================
    return reply(res, "OK");

  } catch (err) {
    log("🔥 Fatal error:", err.message);
    return reply(res, "Recovered from error");
  }
});

// ===============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 FINAL WEBHOOK RUNNING ON PORT", PORT);
});
