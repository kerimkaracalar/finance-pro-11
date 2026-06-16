// Vercel Serverless Function: /api/ai
// API key'i Vercel Environment Variables içine OG_API_KEY olarak ekleyin.

const OG_API_URL = "https://router-api.0g.ai/v1/chat/completions";
const DEFAULT_MODEL = "minimax-m3";

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OG_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "OG_API_KEY environment variable eksik. Vercel Project Settings > Environment Variables alanına ekleyin."
    });
  }

  try {
    const body = req.body || {};
    const upstream = await fetch(OG_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: body.model || DEFAULT_MODEL,
        messages: body.messages || [],
        stream: body.stream !== false
      })
    });

    res.statusCode = upstream.status;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache, no-transform");

    const contentType = upstream.headers.get("content-type") || "text/plain; charset=utf-8";
    res.setHeader("Content-Type", contentType);

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.end(errText);
    }

    // Streaming yanıtı olduğu gibi tarayıcıya aktar.
    if (upstream.body && typeof upstream.body.getReader === "function") {
      const reader = upstream.body.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      return res.end();
    }

    const text = await upstream.text();
    return res.end(text);
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: err.message || String(err) });
  }
};
