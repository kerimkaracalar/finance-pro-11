# Finans Pro v29 — Gemini AI Proxy

Bu sürüm 0G Router yerine Google Gemini API kullanır.

## Vercel kurulumu

1. Dosyaları repo root dizinine ekleyin.
2. Vercel > Project Settings > Environment Variables alanına ekleyin:

```txt
GEMINI_API_KEY=AI Studio'dan aldığınız Gemini API key
```

İsteğe bağlı model değişkeni:

```txt
GEMINI_MODEL=gemini-2.5-flash
```

3. Redeploy yapın.
4. Panelde Öngörüler bölümünde Proxy URL alanına `/api/ai` yazıp kaydedin.

## Önemli

API key'i HTML içine yazmayın. Paylaşılan key'i AI Studio'da rotate etmeniz önerilir.
