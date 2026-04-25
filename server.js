const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔐 ENV (Render me set karo)
const AISENSY_API_KEY = process.env.AISENSY_API_KEY;

// 📄 PDF link (public hona chahiye)
const PDF_URL = "https://yourdomain.com/catalog.pdf";

app.post("/webhook", async (req, res) => {
  try {
    const intentName = req.body.queryResult.intent.displayName;

    console.log("Intent:", intentName);

    // 📱 Phone extract
    const phone =
      req.body.originalDetectIntentRequest?.payload?.data?.from;

    if (!phone) {
      console.log("Phone not found");
      return res.json({
        fulfillmentText: "Number detect nahi ho paaya."
      });
    }

    // 🎯 YOUR FINAL INTENT
    if (intentName === "send_list_pdf") {

      const apiResponse = await axios.post(
        "https://backend.aisensy.com/campaign/t1/api/v2",
        {
          apiKey: AISENSY_API_KEY,
          campaignName: "send_list_pdf", // ✅ same as your template
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

      console.log("Aisensy Response:", apiResponse.data);

      return res.json({
        fulfillmentText:
          "✅ Product list aapko WhatsApp par bhej di gayi hai."
      });
    }

    return res.json({
      fulfillmentText: "Intent match nahi hua."
    });

  } catch (error) {
    console.error(
      "ERROR:",
      error.response?.data || error.message
    );

    return res.json({
      fulfillmentText:
        "❌ Error aaya hai. Please thodi der baad try karein."
    });
  }
});

// 🌐 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
