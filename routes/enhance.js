const router = require("express").Router();
const { anabotGet, extractError } = require("./_anabot");

router.post("/", async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl)
      return res
        .status(400)
        .json({ success: false, error: "Image URL chahiye" });

    const data = await anabotGet("/ai/toEnhance", { imageUrl });
    if (!data || data.success !== true)
      return res.status(502).json({
        success: false,
        error: extractError(data, "Enhance fail ho gaya."),
      });

    res.json({ success: true, url: data.data?.result || null });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
