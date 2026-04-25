app.post("/webhook", async (req, res) => {
    try {
        const intent = req.body.queryResult?.intent?.displayName;

        const phone =
            req.body.originalDetectIntentRequest?.payload?.data?.from;

        console.log("Intent:", intent);
        console.log("Phone:", phone);

        // ❗ Important guard
        if (!phone) {
            console.log("⚠️ Phone missing in payload");
            return res.send({
                fulfillmentText: "Please try again."
            });
        }

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

        res.send({
            fulfillmentText: "Sending you the product list now."
        });

    } catch (error) {
        console.error("❌ ERROR:", error.response?.data || error.message);

        res.send({
            fulfillmentText: "Something went wrong."
        });
    }
});
