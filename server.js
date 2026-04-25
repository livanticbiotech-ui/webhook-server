const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 ENV
const AISENSY_API_KEY = process.env.AISENSY_API_KEY;
const PDF_URL = "https://yourdomain.com/catalog.pdf"; // change this

app.post("/webhook", async (req, res) => {
  try {
    const intentName = req.body.queryResult?.intent?.displayName;

    const phone =
      req.body.originalDetectIntentRequest?.payload?.data?.from;

    console.log("👉 Intent:", intentName);
    console.log("👉 Phone:", phone);

    // ✅ ALWAYS respond immediately (CRITICAL)
    res.json({
      fulfillmentText: "Processing your request..."
    });

    // 🎯 HANDLE SEND LIST
    if (intentName === "send_list" && phone) {
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

        console.log("✅ PDF sent successfully");
      } catch (err) {
        console.error(
          "❌ Aisensy API Error:",
          err.response?.data || err.message
        );
      }
    }

    // 🎯 HANDLE OTHER INTENTS (optional logging)
    if (intentName === "no_requirement") {
      console.log("User not interested");
    }

  } catch (error) {
    console.error("❌ Webhook Error:", error.message);

    // fallback response (just in case)
    if (!res.headersSent) {
      res.json({
        fulfillmentText: "Something went wrong."
      });
    }
  }
});

// ✅ Health check (optional)
app.get("/", (req, res) => {
  res.send("Server is live");
});

// 🚀 START SERVER
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});
