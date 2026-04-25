const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 ENV
const AISENSY_API_KEY = process.env.AISENSY_API_KEY;
const PDF_URL = "https://yourdomain.com/catalog.pdf"; // change this

// 🎯 Aisensy Payload Parser (robust)
function extractPhone(body) {
  try {
    const payload = body?.originalDetectIntentRequest?.payload;

    if (!payload) return null;

    // Case 1 (most common - Aisensy)
    if (payload?.data?.from) return payload.data.from;

    // Case 2
    if (payload?.from) return payload.from;

    // Case 3 (WhatsApp meta style)
    if (payload?.data?.contacts?.[0]?.wa_id)
      return payload.data.contacts[0].wa_id;

    // Case 4 (deep nested webhook)
    if (payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from)
      return payload.entry[0].changes[0].value.messages[0].from;

    // Case 5
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

    // ✅ ALWAYS respond immediately (prevents bot freeze)
    res.json({
      fulfillmentText: "Processing your request..."
    });

    // 🎯 SEND LIST INTENT
    if (intentName === "send_list") {

      if (!phone) {
        console.log("⚠️ Phone missing → skipping API call");
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
        console.error(
          "❌ Aisensy API Error:",
          err.response?.data || err.message
        );
      }
    }

    // 🎯 OTHER INTENTS (optional logging)
    if (intentName === "no_requirement") {
      console.log("User selected: No Requirement");
    }

  } catch (error) {
    console.error("❌ Webhook Error:", error.message);

    if (!res.headersSent) {
      res.json({
        fulfillmentText: "Something went wrong."
      });
    }
  }
});

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Webhook server is live");
});

// 🚀 Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
