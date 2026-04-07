import "dotenv/config";
import http from "node:http";
import { GoogleGenAI } from "@google/genai";

const PORT = Number(process.env.GEMINI_HELPER_PORT || 4317);
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const API_KEY = process.env.GEMINI_API_KEY;

const canonicalCategories = [
  "Housing",
  "Groceries",
  "Dining Out",
  "Transportation",
  "Utilities",
  "Health & Medical",
  "Entertainment",
  "Shopping",
  "Travel",
  "Personal Care",
  "Subscriptions",
  "Childcare & Education",
  "Household Supplies",
  "Baby Essentials",
  "Gifts & Donations",
  "Savings & Investments",
  "Income",
  "Other",
];

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

async function generateJson(prompt) {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  });
  const text = response.text;
  return JSON.parse(text);
}

async function classifyTransactions(transactions) {
  const chunks = [];
  for (let index = 0; index < transactions.length; index += 20) {
    chunks.push(transactions.slice(index, index + 20));
  }

  const results = [];
  for (const chunk of chunks) {
    const prompt = `
You are classifying personal finance transactions.

Allowed categories:
${canonicalCategories.join(", ")}

Return a JSON object with a "results" array in the same order as the input.
Each result must contain:
- canonicalCategory
- confidence (0 to 1)
- classificationSource ("auto" if confidence >= 0.8, otherwise "flagged")
- aiStatus ("classified")

Input transactions:
${JSON.stringify(chunk, null, 2)}
`;

    const payload = await generateJson(prompt);
    if (!payload.results || payload.results.length !== chunk.length) {
      throw new Error("Malformed classification response");
    }
    results.push(...payload.results);
  }

  return results;
}

async function recommendBudget(rows) {
  const prompt = `
You are recommending a practical monthly household budget.

Return JSON with a "recommendations" array in the same order as the input rows.
Each recommendation must include:
- category
- actualAverage
- recommended
- yourTarget
- delta
- rationale

Keep rationale to 1-2 concise sentences.

Input rows:
${JSON.stringify(rows, null, 2)}
`;
  const payload = await generateJson(prompt);
  if (!payload.recommendations || payload.recommendations.length !== rows.length) {
    throw new Error("Malformed budget recommendation response");
  }
  return payload.recommendations;
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, {
      enabled: Boolean(ai),
      model: ai ? MODEL : null,
      reason: ai ? "Gemini helper is ready." : "Set GEMINI_API_KEY in a local .env file to enable AI.",
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/classify-transactions") {
    try {
      const body = await parseBody(request);
      const transactions = Array.isArray(body.transactions) ? body.transactions : [];
      if (!transactions.length) {
        sendJson(response, 400, { error: "transactions is required" });
        return;
      }
      const results = await classifyTransactions(transactions);
      sendJson(response, 200, { results });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "classification failed" });
    }
    return;
  }

  if (request.method === "POST" && request.url === "/api/budget-recommendation") {
    try {
      const body = await parseBody(request);
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length) {
        sendJson(response, 400, { error: "rows is required" });
        return;
      }
      const recommendations = await recommendBudget(rows);
      sendJson(response, 200, { recommendations });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "budget recommendation failed" });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Gemini helper listening on http://localhost:${PORT}`);
});
