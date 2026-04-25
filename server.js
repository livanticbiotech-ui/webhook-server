const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 🔴 Crash debugging (VERY IMPORTANT)
process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
});

app.post("/webhook", async (req, res) => {
    try {
        console.log("🔵 FULL BODY:", JSON.stringify(req.body, null, 2));

        const intent = req.body.queryResult?.intent?.displayName;

        const phone =
            req.body.originalDetectIntentRequest?.payload?.data?.from;

        console.log("👉 Intent:", intent);
        console.log("👉 Phone:", phone);

        // ❗ If phone missing (Dialogflow test case)
        if (!phone) {
            console.log("⚠️ Phone missing in payload");

            return res.send({
                fulfillmentText: "Please try again."
            });
        }

        // ❗ Check env variables
        if (!process.env.AISENSY_API_KEY) {
            console.error("❌ AISENSY_API_KEY missing");
        }

        if (!process.env.PDF_URL) {
            console.error("❌ PDF_URL missing");
        }

        // ✅ Main logic
        if (intent === "send_list") {
            await axios.post("https://api.aisensy.com/v1/message", {
                apiKey: process.env.AISENSY_API_KEY,
                campaignName: "send_list_pdf",
                destination: phone,
                userName: "Customer",
                templateParams: [],
                media: {
                    type: "document",
                    url: process.env.PDF_URL,
                    filename: "Product_List.pdf"
                }
            });

            console.log("✅ PDF sent to:", phone);
        }

        // ✅ Dialogflow response
        return res.send({
            fulfillmentText: "Sending you the product list now."
        });

    } catch (error) {
        console.error("❌ ERROR:", error.response?.data || error.message);

        return res.send({
            fulfillmentText: "Something went wrong."
        });
    }
});

// ✅ Render compatible port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
