// Vercel Serverless Function: /api/ai
// Gemini API key'i Vercel Environment Variables içine GEMINI_API_KEY olarak ekleyin.
// HTML içine API key yazmayın.

const MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function toGeminiPrompt(messages = []) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content || "")
    .join("\n\n");

  const user = messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role || "user"}: ${m.content || ""}`)
    .join("\n\n");

  return [
    system ? `SİSTEM TALİMATI:\n${system}` : "",
    user ? `KULLANICI / VERİ PAKETİ:\n${user}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

function shouldTryNextModel(status, detailsText = "") {
  const t = String(detailsText || "").toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    t.includes("high demand") ||
    t.includes("unavailable") ||
    t.includes("rate limit") ||
    t.includes("quota")
  );
}

async function callGemini({ apiKey, model, prompt }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.35,
        topP: 0.9,
        maxOutputTokens: 4096
      }
    })
  });

  const raw = await upstream.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch (_) {
    data = null;
  }

  return {
    ok: upstream.ok,
    status: upstream.status,
    raw,
    data
  };
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "GEMINI_API_KEY environment variable eksik. Vercel Project Settings > Environment Variables alanına ekleyin ve redeploy yapın."
    });
  }

  try {
    const body = req.body || {};
    const requestedModel = body.model || process.env.GEMINI_MODEL;

    const prompt = body.prompt || toGeminiPrompt(body.messages || []);

    if (!prompt.trim()) {
      return res.status(400).json({ error: "Prompt/messages boş geldi." });
    }

    const modelsToTry = requestedModel
      ? [requestedModel, ...MODEL_FALLBACKS.filter((m) => m !== requestedModel)]
      : MODEL_FALLBACKS;

    const errors = [];

    for (const model of modelsToTry) {
      const result = await callGemini({
        apiKey,
        model,
        prompt
      });

      if (result.ok) {
        const text =
          result.data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || "")
            .join("")
            .trim() || "";

        return res.status(200).json({
          provider: "gemini",
          model,
          fallbackUsed: model !== modelsToTry[0],
          triedModels: modelsToTry,
          text,
          usage: result.data?.usageMetadata || null,
          finishReason: result.data?.candidates?.[0]?.finishReason || null
        });
      }

      const details = result.data || result.raw.slice(0, 1000);

      errors.push({
        model,
        status: result.status,
        details
      });

      const detailsText =
        typeof details === "string" ? details : JSON.stringify(details);

      if (!shouldTryNextModel(result.status, detailsText)) {
        break;
      }
    }

    return res.status(errors[errors.length - 1]?.status || 500).json({
      error: "Gemini upstream hatası. Tüm model denemeleri başarısız oldu.",
      triedModels: modelsToTry,
      errors
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || String(err)
    });
  }
};
