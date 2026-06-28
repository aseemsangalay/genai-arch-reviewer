const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { SYSTEM_PROMPT } = require("./prompt");

const MODEL_ID = process.env.AWS_BEDROCK_MODEL_ID || "us.anthropic.claude-haiku-4-5-20251001-v1:0";

// Detect model family from ID
function modelFamily(modelId) {
  if (modelId.includes("anthropic") || modelId.includes("claude")) return "claude";
  if (modelId.includes("deepseek")) return "deepseek";
  if (modelId.includes("llama")) return "llama";
  if (modelId.includes("mistral")) return "mistral";
  if (modelId.includes("nova") || modelId.includes("amazon")) return "nova";
  return "claude";
}

function buildRequestBody(userInput, family) {
  if (family === "claude") {
    return {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userInput }],
    };
  }

  if (family === "llama") {
    // Llama 3 instruct format — system prompt injected into conversation template
    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${SYSTEM_PROMPT}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${userInput}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;
    return { prompt, max_gen_len: 4096, temperature: 0.3 };
  }

  if (family === "mistral") {
    const prompt = `<s>[INST] ${SYSTEM_PROMPT}\n\n${userInput} [/INST]`;
    return { prompt, max_tokens: 4096, temperature: 0.3 };
  }

  if (family === "deepseek") {
    return {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userInput },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    };
  }

  if (family === "nova") {
    return {
      messages: [{ role: "user", content: [{ text: userInput }] }],
      system: [{ text: SYSTEM_PROMPT }],
      inferenceConfig: { maxTokens: 4096, temperature: 0.3 },
    };
  }
}

function extractText(responseBody, family) {
  if (family === "claude") {
    return responseBody.content[0].text;
  }
  if (family === "llama") {
    return responseBody.generation;
  }
  if (family === "mistral") {
    return responseBody.outputs[0].text;
  }
  if (family === "deepseek") {
    return responseBody.choices[0].message.content;
  }
  if (family === "nova") {
    return responseBody.output.message.content[0].text;
  }
}

function stripFences(text) {
  const t = text.trim();
  if (t.startsWith("```")) {
    const afterFirst = t.split("\n").slice(1).join("\n");
    return afterFirst.split("```")[0].trim();
  }
  return t;
}

function repairJSON(text) {
  // Handle truncated JSON by finding the last complete top-level field
  // If valid, return as-is
  try {
    JSON.parse(text);
    return text;
  } catch (_) {}

  // Try appending closing braces (model hit token limit mid-output)
  for (let i = 0; i < 5; i++) {
    try {
      const attempt = text + "}".repeat(i + 1);
      JSON.parse(attempt);
      return attempt;
    } catch (_) {}
  }

  // Try closing an open array then object
  const candidates = [']}', ']}}}', ']}}}}}'];
  for (const suffix of candidates) {
    try {
      JSON.parse(text + suffix);
      return text + suffix;
    } catch (_) {}
  }

  return null; // unrecoverable
}

async function invokeModel(userInput) {
  const client = new BedrockRuntimeClient({
    region: process.env.AWS_DEFAULT_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const family = modelFamily(MODEL_ID);
  const body = buildRequestBody(userInput, family);

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    body: JSON.stringify(body),
    contentType: "application/json",
    accept: "application/json",
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(Buffer.from(response.body).toString("utf-8"));
  const rawText = extractText(responseBody, family);
  const cleaned = stripFences(rawText);
  const repaired = repairJSON(cleaned);

  if (!repaired) {
    throw new Error("Model output could not be parsed as JSON");
  }

  return JSON.parse(repaired);
}

module.exports = { invokeModel, MODEL_ID };
