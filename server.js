const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

function log(...args) {
  console.log("[WEBHOOK]", ...args);
}

// ✅ API Keys — paste your keys here
const API_KEYS = {
  "919888776757": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YjkzZGYzOTkyZjA5MTBmMTEwMzYxMyIsIm5hbWUiOiJsaXZhbnRpYyBiaW90ZWNoIDE3NjAiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjhiOTNkZjM5OTJmMDkxMGYxMTAzNjBlIiwiYWN0aXZlUGxhbiI6IkJBU0lDX01PTlRITFkiLCJpYXQiOjE3NzcxMjI0ODJ9.-kJgh0Jdv-I8EsFIuKN7QiRyNHLjpY6V6Z6irsvGHRg",  // Livantic Biotech 1760
  "917707860105": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTFhYzlkMjAyNDkxMmRjZjNlYjM5NSIsIm5hbWUiOiJMSVZBTlRJQyBCSU9URUNIIFNBTEVTIDEiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjhiOTNkZjM5OTJmMDkxMGYxMTAzNjBlIiwiYWN0aXZlUGxhbiI6IkZSRUVfRk9SRVZFUiIsImlhdCI6MTc2Mjc2NTk4MX0.6efW4i9U40M4OL9C7Fs7heNfgj0DnjsIsXCoE5kLsxY"   // Livantic Biotech Sales 1
};

// ✅ Campaign names for each number
const CAMPAIGNS = {
  "919888776757": "send_list_pdf",   // 1st number campaign
  "917707860105": "send_list_pdf2"   // 2nd number campaign
};

function getPhone(body) {
  try {
    const direct = body?.originalDetectIntentRequest?.payload?.AiSensyMobileNumber;
    if (direct) return direct.replace("+", "").replace(/\s/g, "");
    const msg = body?.originalDetectIntentRequest?.payload?.AiSensyMessage;
    if (msg) {
      const parsed = typeof msg === "string" ? JSON.parse(msg) : msg;
      if (parsed?.phone_number) return parsed.phone_number.replace("+", "");
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getAiSensyNumber(body) {
  try {
    // This tells us WHICH business number the customer messaged on
    const num = body?.originalDetectIntentRequest?.payload?.AiSensyBusinessNumber;
    if (num) return num.replace("+", "").replace(/\s/g, "");

    // Fallback — some AiSensy versions send it differently
    const num2 = body?.ori
