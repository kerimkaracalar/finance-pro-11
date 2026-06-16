# Finans Pro v28 — 0G AI Proxy Ready

Bu sürüm `Failed to fetch` / CORS problemini çözmek için `/api/ai` proxy endpoint'i ile birlikte gelir.

## Kurulum — Vercel

1. Bu klasörü GitHub'a yükleyin veya Vercel'e import edin.
2. Vercel Project Settings > Environment Variables bölümüne şunu ekleyin:
   - Name: `OG_API_KEY`
   - Value: 0G Router API key'iniz
3. Deploy edin.
4. Site açılınca Öngörüler bölümünde Proxy URL alanına `/api/ai` yazıp **Proxy Kaydet** deyin.
5. AI Derin Analiz'e basın. Rozette `✅ 0G AI aktif` görmelisiniz.

## Neden proxy gerekiyor?

Tarayıcıdan doğrudan `https://router-api.0g.ai/v1/chat/completions` adresine istek atmak CORS nedeniyle `Failed to fetch` verebilir. Proxy bu isteği sunucu tarafından yaptığı için CORS ve API key görünürlüğü sorununu çözer.

## Güvenlik

API key HTML içine yazılmamalıdır. Bu sürüm key'i Vercel environment variable olarak sunucuda kullanır.
