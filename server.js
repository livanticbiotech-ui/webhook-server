const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  try {
    // 🔴 Intent
    const intent = req.body?.queryResult?.intent?.displayName || "";

    // 🔴 Safe phone extraction
    const phone =
      req.body?.originalDetectIntentRequest?.payload?.data?.from || "";

    // 🔴 Debug logs
    console.log("Intent:", intent);
    console.log("Phone:", phone);
    console.log("FULL BODY:", JSON.stringify(req.body, null, 2));

    // 🔴 Check intent
    if (intent === "send_list" && phone) {

      await axios.post("https://api.aisensy.com/v1/message", {
        apiKey: process.env.AISENSY_API_KEY,   // 👈 Render se aayega
        campaignName: "send_list_pdf",         // 👈 AiSensy template
        destination: phone,
        userName: "Customer",
        templateParams: [],
        media: {
          type: "document",
          url: process.env.PDF_URL,            // 👈 Render se aayega
          filename: "Product_List.pdf"
        }
      });

      console.log("✅ PDF Sent Successfully");

    } else {
      console.log("⚠️ Intent mismatch or phone missing");
    }

    res.send({
      fulfillmentText: "Sending you the product list now."
    });

  } catch (error) {
    console.error("❌ ERROR:", error.response?.data || error.message);

    res.send({
      fulfillmentText: "Something went wrong. Please try again."
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running...");
});
