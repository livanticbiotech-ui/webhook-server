const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const AISENSY_API_KEY = process.env.AISENSY_API_KEY;
const PDF_URL = "https://yourdomain.com/catalog.pdf";

// 🎯 Phone extractor — handles AiSensy + fallbacks
function extractPhone(body) {
  try {
    const payload = body?.originalDetectIntentRequest?.payload;
    if (!payload) return null;

    // ✅ Case 1: AiSensy standard field (confirmed working in your logs)
    if (payload.AiSensyMobileNumber) return payload.AiSensyMobileNumber;

    // ✅ Case 2: Parse from AiSensyMessage JSON string
    if (payload.AiSensyMessage) {
      const msg = JSON.parse(payload.AiSensyMessage);
      if (msg.phone_number) return `+${msg.phone_number}`;
    }

    // Fallbacks for other platforms
    if (payload?.data?.from) return payload.data.from;
    if (payload?.from) return payload.from;
    if (payload?.phone) return payload.phone;

    return null;
  } catch (err) {
    console.error("❌ Phone parse error:", err.message);
    return null;
  }
}

// 🚀 WEBHOOK
app.post("/webhook", async (req, res) => {
  try {
    const intentName = req.body.queryResult?.intent?.displayName;
    const phone = extractPhone(req.body);

    console.log("👉 Intent:", intentName);
    console.log("👉 Phone:", phone);
    console.log("📦 FULL BODY:", JSON.stringify(req.body, null, 2));

    // ✅ Always respond immediately to Dialogflow (5s timeout)
    res.json({
      fulfillmentText: "Processing your request..."
    });

    // 🎯 SEND LIST INTENT
    if (intentName === "send_list") {
      if (!phone) {
        console.log("⚠️ Phone missing → skipping API call (likely Dialogflow Console test)");
        return;
      }

      try {
        await axios.post(
          "https://backend.aisensy.com/campaign/t1/api/v2",
          {
            apiKey: AISENSY_API_KEY,
            campaignName: "send_list_pdf",
            destination: phone,
            userName: "Customer",
            templateParams: [],
            source: "dialogflow",
            media: {
              url: PDF_URL,
              filename: "Pharma_Product_List.pdf"
            }
          }
        );
        console.log("✅ PDF sent to:", phone);
      } catch (err) {
        console.error("❌ AiSensy API Error:", err.response?.data || err.message);
      }
    }

    if (intentName === "no_requirement") {
      console.log("User selected: No Requirement");
    }

  } catch (error) {
    console.error("❌ Webhook Error:", error.message);
    if (!res.headersSent) {
      res.json({ fulfillmentText: "Something went wrong." });
    }
  }
});

app.get("/", (req, res) => res.send("Webhook server is live"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🚀 Server running on port", PORT));
