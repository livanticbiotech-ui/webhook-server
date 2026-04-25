const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ===============================
// LOG HELPER
// ===============================
function log(...args) {
  console.log("[WEBHOOK]", ...args);
}

// ===============================
// PHONE EXTRACTOR (AISENSY SAFE)
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
// AISENSY SEND FUNCTION
// ===============================
async function sendList(phone) {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: "YOUR_API_KEY_HERE",
        campaignName: "send_list",   // must match dashboard campaign
        destination: phone,          // 91XXXXXXXXXX
        userName: "Bot",
        source: "dialogflow",
        templateParams: []
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    log("📤 AISensy SUCCESS:", response.data);
    return true;

  } catch (err) {
    log("❌ AISensy FAILED:", err?.response?.data || err.message);
    return false;
  }
}

// ===============================
// SAFE RESPONSE
// ===============================
function reply(res, text) {
  return res.json({
    fulfillmentText: text || "OK"
  });
}

// ===============================
// WEBHOOK MAIN
// ===============================
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    const source = body?.originalDetectIntentRequest?.source;
    const intent = body?.queryResult?.intent?.displayName;

    // Ignore console test
    if (source === "DIALOGFLOW_CONSOLE") {
      log("Console ignored");
      return reply(res, "Console test only");
    }

    const phone = getPhone(body);

    log("Intent:", intent);
    log("Phone:", phone);

    // Safe fallback (never break bot)
    if (!phone) {
      log("⚠️ No phone found");
      return reply(res, "Message received");
    }

    // MAIN INTENT
    if (intent === "send_list") {
      log("📤 Sending list to:", phone);

      const success = await sendList(phone);

      if (success) {
        return reply(res, "List sent successfully ✅");
      } else {
        return reply(res, "Failed to send list ❌");
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
  console.log("🚀 Server running on port", PORT);
});
