const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const instagram = require("./routes/instagram");
const tiktok = require("./routes/tiktok");
const facebook = require("./routes/facebook");
const ocr = require("./routes/ocr");
const removebg = require("./routes/removebg");
const enhance = require("./routes/enhance");
const textConvert = require("./routes/textConvert");
const imageToPdf = require("./routes/imageToPdf");
const token = require("./routes/token");

const app = express();
const PORT = process.env.PORT || 5000;

["uploads", "tmp"].forEach((d) => {
  const p = path.join(__dirname, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use("/api/instagram", instagram);
app.use("/api/tiktok", tiktok);
app.use("/api/facebook", facebook);
app.use("/api/ocr", ocr);
app.use("/api/removebg", removebg);
app.use("/api/enhance", enhance);
app.use("/api/text-convert", textConvert);
app.use("/api/image-to-pdf", imageToPdf);
app.use("/api/token", token);

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), { maxAge: 0 })
);
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => res.json({ ok: true, owner: "Sardar RDX" }));

app.use((err, _req, res, _next) => {
  console.error("ERR:", err);
  res
    .status(err.status || 500)
    .json({ success: false, error: err.message || "Server error" });
});

/* ===== Spawn Python token sidecar ===== */
const TOKEN_PORT = process.env.TOKEN_PORT || "5050";
const pyBin = process.env.PYTHON_BIN || "python3";
let pyProc = null;

function startTokenService() {
  pyProc = spawn(pyBin, [path.join(__dirname, "python", "token_service.py")], {
    env: { ...process.env, TOKEN_PORT, PYTHONUNBUFFERED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  pyProc.on("error", (err) => {
    console.log("Python not found - token service disabled");
    pyProc = null;
  });
  pyProc.stdout.on("data", (d) => process.stdout.write(`[token] ${d}`));
  pyProc.stderr.on("data", (d) => process.stderr.write(`[token] ${d}`));
  pyProc.on("exit", (code, sig) => {
    console.error(`[token] exited code=${code} sig=${sig}`);
    pyProc = null;
    if (!shuttingDown) setTimeout(startTokenService, 2000);
  });
}
let shuttingDown = false;
function shutdown() {
  shuttingDown = true;
  if (pyProc) try { pyProc.kill("SIGTERM"); } catch {}
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
try {
  startTokenService();
} catch (e) {
  console.log("Token service not available - running without it");
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RDX Tools running on http://0.0.0.0:${PORT}`);
  console.log(`Token sidecar on 127.0.0.1:${TOKEN_PORT}`);
});
