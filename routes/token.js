const express = require("express");
const axios = require("axios");

const router = express.Router();
const TOKEN_BASE = `http://127.0.0.1:${process.env.TOKEN_PORT || 5050}`;

async function forward(path, body, res) {
  try {
    const r = await axios.post(`${TOKEN_BASE}${path}`, body, {
      timeout: 90000,
      headers: { "content-type": "application/json" },
      validateStatus: () => true,
    });
    return res.status(r.status).json(r.data);
  } catch (err) {
    const friendly =
      err.code === "ECONNREFUSED"
        ? "Token service abhi start ho rahi hai, 5 second baad try karein"
        : err.code === "ETIMEDOUT" || err.message?.includes("timeout")
        ? "Facebook ne timeout kiya — dobara try karein"
        : err.message || "Token service error";
    return res.status(502).json({ status: "error", message: friendly });
  }
}

router.post("/generate", (req, res) => forward("/generate-token", req.body, res));
router.post("/generate-multiple", (req, res) =>
  forward("/generate-multiple", req.body, res)
);

router.get("/health", async (_req, res) => {
  try {
    const r = await axios.get(`${TOKEN_BASE}/health`, { timeout: 3000 });
    res.json(r.data);
  } catch {
    res.status(503).json({ ok: false, message: "Token service offline" });
  }
});

module.exports = router;
