const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  try {
    const intent = req.body?.queryResult?.intent?.displayName || "";

    console.log("FULL BODY:", JSON.stringify(req.body, null, 2));

    // 🔴 CORRECT PHONE EXTRACTION (AiSensy specific)
    let phone =
      req.body?.originalDetectIntentRequest?.payload?.AiSensyMobileNumber ||
      "";

    // Clean phone (+ hata do)
    if (phone) {
      phone = phone.replace(/\D/g, "");
    }

    console.log("Intent:", intent);
    console.log("Phone:", phone);

    if (intent === "send_list" && phone) {
      await axios.post("https://api.aisensy.com/v1/message", {
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: "send_list_pdf",
        destination: phone,
        userName: "Customer",
        templateParams: [],
        media: {
          type: "document",
          url: process.env.PDF_URL,
          filename: "Product_List.pdf",
        },
      });

      console.log("✅ PDF SENT SUCCESSFULLY");
    } else {
      console.log("⚠️ Intent mismatch or phone missing");
    }

    res.send({
      fulfillmentText: "Sending you the product list now.",
    });
  } catch (error) {
    console.error("❌ ERROR:", error.response?.data || error.message);

    res.send({
      fulfillmentText: "Error occurred. Try again.",
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running...");
});
