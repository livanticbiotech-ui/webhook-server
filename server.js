const axios = require("axios");

async function sendList(phone) {
  try {
    const response = await axios.post(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        campaignName: "send_list_pdf",
        destination: phone,
        source: "dialogflow",
        userName: "Bot",
        templateParams: []
      },
      {
        headers: {
          "x-api-key": "YOUR_API_KEY",   // 🔥 FIXED (NOT BEARER)
          "Content-Type": "application/json"
        }
      }
    );

    console.log("📤 SUCCESS:", response.data);
    return true;

  } catch (err) {
    console.log("❌ FAILED:", err?.response?.data || err.message);
    return false;
  }
}
