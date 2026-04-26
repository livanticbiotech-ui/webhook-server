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

async function sendCampaign(phone, campaignName) {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YjkzZGYzOTkyZjA5MTBmMTEwMzYxMyIsIm5hbWUiOiJsaXZhbnRpYyBiaW90ZWNoIDE3NjAiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjhiOTNkZjM5OTJmMDkxMGYxMTAzNjBlIiwiYWN0aXZlUGxhbiI6IkJBU0lDX01PTlRITFkiLCJpYXQiOjE3NzcxMjI0ODJ9.-kJgh0Jdv-I8EsFIuKN7QiRyNHLjpY6V6Z6irsvGHRg",
        campaignName: campaignName,
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
    log("✅ CAMPAIGN SENT:", campaignName, response.data);
    return true;
  } catch (err) {
    log("❌ CAMPAIGN FAILED:", campaignName, err?.response?.data || err.message);
    return false;
  }
}

function reply(res, text) {
  try {
    return res.json({ fulfillmentText: text || "OK" });
  } catch (e) {
    log("Reply failed:", e.message);
  }
}

function emptyReply(res) {
  try {
    // Empty reply — Dialogflow ka apna intent response jayega
    return res.json({
      fulfillmentText: "",
      fulfillmentMessages: []
    });
  } catch (e) {
    log("Empty reply failed:", e.message);
  }
}

process.on("uncaughtException", (err) => {
  log("Server error (still running):", err.message);
});

process.on("unhandledRejection", (reason) => {
  log("Unhandled rejection (still running):", reason);
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

      // ================================
      // SEND LIST INTENT
      // Campaign trigger hoga
      // Dialogflow ka apna reply jayega
      // Output context bhi kaam karega
      // ================================
      if (intent === "send_list") {
        if (phone) {
          log("📤 Sending list campaign to:", phone);
          // Fire and forget — bot wait nahi karega
          sendCampaign(phone, "send_list_pdf")
            .catch((e) => log("send_list_pdf failed:", e.message));
        }
        // ✅ Empty reply — intent ka apna response jayega
        return emptyReply(res);
      }

      // ================================
      // FOLLOW UP INTENT (agar chahiye)
      // AiSensy mein follow_up_campaign
      // naam ki campaign banao
      // ================================
      // if (intent === "user_interested") {
      //   if (phone) {
      //     sendCampaign(phone, "follow_up_campaign")
      //       .catch((e) => log("follow_up failed:", e.message));
      //   }
      //   return emptyReply(res);
      // }

    } catch (innerErr) {
      log("Inner error:", innerErr.message);
    }

    return reply(res, "OK");

  } catch (outerErr) {
    log("Outer error:", outerErr.message);
    try {
      return res.json({ fulfillmentText: "OK" });
    } catch (e) {}
  }
});

app.get("/", (req, res) => {
  res.send("Livantic Biotech Webhook is Running!");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Webhook running on port", PORT));
