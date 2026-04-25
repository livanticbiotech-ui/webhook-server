const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  try {
    // 🔴 Intent name
    const intent = req.body?.queryResult?.intent?.displayName || "";

    // 🔴 Safe phone extraction (important fix)
    const phone =
      req.body?.originalDetectIntentRequest?.payload?.data?.from ||
      "";

    // 🔴 Business number (for multi-number setup)
    const businessNumber =
      req.body?.originalDetectIntentRequest?.payload?.data?.to ||
      "";

    // 🔴 Debug logs (VERY IMPORTANT)
    console.log("Intent:", intent);
    console.log("User Phone:", phone);
    console.log("Business Number:", businessNumber);
    console.log("FULL BODY:", JSON.stringify(req.body, null, 2));

    // 🔴 Default values (single number setup)
    let apiKey = process.env.AISENSY_API_KEY;
    let pdfUrl = process.env.PDF_URL;

    // 🟡 OPTIONAL: Multi-number logic (edit if needed)
    /*
    if (businessNumber === "91XXXXXXXXXX") {
      apiKey = "API_KEY_PROJECT_A";
      pdfUrl = "https://link1.pdf";
    } else if (businessNumber === "91YYYYYYYYYY") {
      apiKey = "API_KEY_PROJECT_B";
      pdfUrl = "https://link2.pdf";
    }
    */

    // 🔴 Main logic
    if (intent === "send_list" && phone) {
      await axios.post("https://api.aisensy.com/v1/message", {
        apiKey: apiKey,
        campaignName: "send_list_pdf", // 👈 must match AiSensy template
        destination: phone,
        userName: "Customer",
        templateParams: [],
        media: {
          type: "document",
          url: pdfUrl,
          filename: "Product_List.pdf",
        },
      });

      console.log("✅ PDF Sent Successfully");
    } else {
      console.log("⚠️ Intent mismatch or phone missing");
    }

    // 🔴 Dialogflow response
    res.send({
      fulfillmentText: "Sending you the product list now.",
    });
  } catch (error) {
    console.error("❌ ERROR:", error.response?.data || error.message);

    res.send({
      fulfillmentText: "Something went wrong. Please try again later.",
    });
  }
});

// 🔴 Server start
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Server running...");
});
