const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

function log(...args) {
  console.log("[WEBHOOK]", ...args);
}

// ✅ Project IDs mapped to business numbers
const PROJECT_IDS = {
  "68b93df3992f0910f1103613": "919888776757",  // 1st account - Livantic Biotech 1760
  "6911ac9d2024912dcf3eb395": "917707860105"   // 2nd account - Livantic Biotech Sales 1
};

// ✅ API Keys for each number
const API_KEYS = {
  "919888776757": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YjkzZGYzOTkyZjA5MTBmMTEwMzYxMyIsIm5hbWUiOiJsaXZhbnRpYyBiaW90ZWNoIDE3NjAiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjhiOTNkZjM5OTJmMDkxMGYxMTAzNjBlIiwiYWN0aXZlUGxhbiI6IkJBU0lDX01PTlRITFkiLCJpYXQiOjE3NzcxMjI0ODJ9.-kJgh0Jdv-I8EsFIuKN7QiRyNHLjpY6V6Z6irsvGHRg",
  "917707860105": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTFhYzlkMjAyNDkxMmRjZjNlYjM5NSIsIm5hbWUiOiJMSVZBTlRJQyBCSU9URUNIIFNBTEVTIDEiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjhiOTNkZjM5OTJmMDkxMGYxMTAzNjBlIiwiYWN0aXZlUGxhbiI6IkZSRUVfRk9SRVZFUiIsImlhdCI6MTc2Mjc2NTk4MX0.6efW4i9U40M4OL9C7Fs7heNfgj0DnjsIsXCoE5kLsxY"
};

// ✅ Campaign names for each number
const CAMPAIGNS = {
  "919888776757": "send_list_pdf",
  "917707860105": "send_list_pdf2"
};

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

function getAiSensyNumber(body) {
  try {
    const msg = body?.originalDetectIntentRequest?.payload?.AiSensyMessage;
    if (msg) {
      const parsed = typeof msg === "string" ? JSON.parse(msg) : msg;
      const projectId = parsed?.project_id;
      log("🔍 Project ID detected:", projectId);
      if (projectId && PROJECT_IDS[projectId]) {
        return PROJECT_IDS[projectId];
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function sendCampaign(phone, campaignName, apiKey) {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        apiKey: apiKey,
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
      const aiSensyNumber = getAiSensyNumber(body);

      log("Intent:", intent, "| Customer Phone:", phone, "| Business Number:", aiSensyNumber);

      if (intent === "send_list") {
        if (phone) {
          let apiKey, campaignName;

          if (aiSensyNumber && API_KEYS[aiSensyNumber]) {
            apiKey = API_KEYS[aiSensyNumber];
            campaignName = CAMPAIGNS[aiSensyNumber];
            log("📤 Routing to number:", aiSensyNumber, "| Campaign:", campaignName);
          } else {
            apiKey = API_KEYS["919888776757"];
            campaignName = CAMPAIGNS["919888776757"];
            log("⚠️ Project ID not matched, falling back to 1st number");
          }

          sendCampaign(phone, campaignName, apiKey)
            .catch((e) => log("Campaign failed:", e.message));
        }
        return emptyReply(res);
      }

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
