const express = require("express");
const app = express();

app.use(express.json());

// ===============================
// SESSION STORE (Replace with Redis in production)
// ===============================
const sessionStore = new Map();

// ===============================
// SAFE LOGGER
// ===============================
function log(...args) {
  console.log("[WEBHOOK]", ...args);
}

// ===============================
// EXTRACT SESSION (ROBUST)
// ===============================
function getSessionId(body) {
  try {
    const direct =
      body?.originalDetectIntentRequest?.payload?.AiSensyMobileNumber;

    if (direct) return direct.replace("+", "");

    const msg =
      body?.originalDetectIntentRequest?.payload?.AiSensyMessage;

    if (msg) {
      const parsed = JSON.parse(msg);
      if (parsed?.phone_number) {
        return parsed.phone_number.replace("+", "");
      }
    }

    return null;
  } catch (e) {
    log("Session parse error:", e.message);
    return null;
  }
}

// ===============================
// GUARANTEED RESPONSE WRAPPER
// ===============================
function safeReply(res, text) {
  return res.json({
    fulfillmentText: text || "OK"
  });
}

// ===============================
// MAIN WEBHOOK
// ===============================
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    const source = body?.originalDetectIntentRequest?.source;
    const intent = body?.queryResult?.intent?.displayName;

    // ===============================
    // IGNORE CONSOLE TESTS
    // ===============================
    if (source === "DIALOGFLOW_CONSOLE") {
      log("Console test ignored");
      return safeReply(res, "Console test only");
    }

    const sessionId = getSessionId(body);

    log("Session:", sessionId);
    log("Intent:", intent);

    // ===============================
    // NO SESSION HANDLING (CRITICAL FIX)
    // ===============================
    if (!sessionId) {
      log("No session found - soft fallback");

      return safeReply(res, "Message received");
    }

    // Keep session alive
    sessionStore.set(sessionId, {
      lastSeen: Date.now()
    });

    // ===============================
    // EXAMPLE INTENT: SEND LIST
    // ===============================
    if (intent === "send_list") {
      try {
        log("Trigger send_list for:", sessionId);

        // 👉 PLACE YOUR AISENSY API HERE
        // await sendListAPI(sessionId);

        return safeReply(res, `List sent to ${sessionId}`);
      } catch (err) {
        log("API error:", err.message);
        return safeReply(res, "Failed to send list");
      }
    }

    // ===============================
    // DEFAULT RESPONSE
    // ===============================
    return safeReply(res, "OK");

  } catch (err) {
    // 🔥 NEVER LET WEBHOOK DIE
    log("Fatal error:", err.message);
    return safeReply(res, "Recovered from error");
  }
});

// ===============================
// CLEANUP OLD SESSIONS (optional hygiene)
// ===============================
setInterval(() => {
  const now = Date.now();

  for (const [key, value] of sessionStore.entries()) {
    if (now - value.lastSeen > 30 * 60 * 1000) {
      sessionStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

// ===============================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Bulletproof webhook running on port", PORT);
});
