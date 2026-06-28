require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const { invokeModel, MODEL_ID } = require("./bedrock");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", model: MODEL_ID });
});

// Main review endpoint
app.post("/review", async (req, res) => {
  const { input } = req.body;

  if (!input || typeof input !== "string") {
    return res.status(400).json({ error: "input field required (string)" });
  }

  const trimmed = input.trim();
  if (trimmed.length < 10) {
    return res.status(400).json({ error: "input too short" });
  }
  if (trimmed.length > 5000) {
    return res.status(400).json({ error: "input too long (max 5000 chars)" });
  }

  try {
    const result = await invokeModel(trimmed);
    res.json({ result });
  } catch (err) {
    console.error("invokeModel error:", err.message);

    if (err.message.includes("AccessDenied") || err.message.includes("payment")) {
      return res.status(503).json({ error: "Model access unavailable. Check Bedrock permissions." });
    }
    if (err.message.includes("could not be parsed")) {
      return res.status(502).json({ error: "Model returned malformed output. Try again." });
    }

    res.status(500).json({ error: "Review failed. Try again." });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Model: ${MODEL_ID}`);
});
