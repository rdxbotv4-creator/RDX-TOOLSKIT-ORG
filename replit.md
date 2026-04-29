# RDX Tools

Owner: **Sardar RDX**

A Node.js + Express toolbox web app with a dark neon UI and many tools, organised by category.

## Stack
- **Backend:** Node.js 20, Express
- **Sidecar:** Python 3.11 + Flask (token generator microservice on 127.0.0.1:5050, spawned by Node)
- **Frontend:** Vanilla HTML/CSS/JS (no build step), animated dark/neon theme with 3D tilt cards, mouse-tracked spotlight, floating orbs, scroll-reveal
- **External APIs:** anabot.my.id (free key) + Facebook auth API (proxied through Python sidecar).

## Project layout
```
server.js                 # Express entrypoint (port 5000)
routes/
  _anabot.js              # Shared anabot.my.id client (uses ANABOT_KEY env or "freeApikey")
  instagram.js            # POST /api/instagram     { url }
  tiktok.js               # POST /api/tiktok        { url }
  facebook.js             # POST /api/facebook      { url }
  ocr.js                  # POST /api/ocr           { imageUrl } OR multipart "image"
  removebg.js             # POST /api/removebg      { imageUrl }
  enhance.js              # POST /api/enhance       { imageUrl }
  textConvert.js          # POST /api/text-convert  { text, format: pdf|docx|xlsx|txt, title }
  imageToPdf.js           # POST /api/image-to-pdf  multipart "images" or "dataUrls" JSON
  token.js                # POST /api/token/generate · /generate-multiple — proxies to Python sidecar
python/
  token_service.py        # Flask sidecar — Facebook token gen (RSA+AES password enc, 2FA support)
public/
  index.html              # Landing page (categorised tool grid)
  css/style.css           # Theme + 3D tilt + animations
  js/main.js              # Shared fetch/loader helpers
  js/effects.js           # Cursor glow, 3D card tilt, scroll reveal, animated counters
  pages/
    instagram.html  tiktok.html  facebook.html
    text-to-doc.html  image-to-pdf.html  capture-to-pdf.html
    ocr.html  removebg.html  enhance.html
    token.html            # FB token generator UI (single + bulk tabs, app picker)
uploads/                  # OCR temporary uploads (served at /uploads)
tmp/                      # multer scratch
```

## Tools
**Video downloaders**
- Instagram, TikTok (with no-watermark + audio), Facebook (multi-quality + audio).

**Document tools**
- Text → PDF / Word (.docx) / Excel (.xlsx) / TXT
- Multiple Images → single PDF
- Live camera capture → PDF (multi-page)

**AI / image tools**
- OCR (image → text)
- Background remover
- Image enhancer / upscaler

**Developer tools**
- FB Token Generator (single + bulk, 6 app types, 2FA support)

## Workflow
- `Start application` runs `node server.js` on port 5000.
  Node spawns the Python token sidecar on 127.0.0.1:5050 (auto-restarts on crash, killed on shutdown).

## Configuration
- Optional env var `ANABOT_KEY` overrides the default `freeApikey`.
- Optional env var `TOKEN_PORT` (default 5050) and `PYTHON_BIN` (default `python3`) for the sidecar.
