// Vercel Serverless Function: /api/ai
// Gemini API key'i Vercel Environment Variables içine GEMINI_API_KEY olarak ekleyin.
// HTML içine API key yazmayın.

const DEFAULT_MODEL = "gemini-2.5-flash";

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
    const model = body.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const prompt = body.prompt || toGeminiPrompt(body.messages || []);

    if (!prompt.trim()) {
      return res.status(400).json({ error: "Prompt/messages boş geldi." });
    }

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

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: "Gemini upstream hatası",
        status: upstream.status,
        details: data || raw.slice(0, 1000)
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim() || "";

    return res.status(200).json({
      provider: "gemini",
      model,
      text,
      usage: data?.usageMetadata || null,
      finishReason: data?.candidates?.[0]?.finishReason || null
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || String(err)
    });
  }
};
