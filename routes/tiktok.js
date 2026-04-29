const router = require("express").Router();
const { anabotGet, extractError } = require("./_anabot");

router.post("/", async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || !/tiktok\.com/i.test(url))
      return res
        .status(400)
        .json({ success: false, error: "Valid TikTok URL chahiye" });

    const data = await anabotGet("/download/tiktok", { url });
    if (!data || data.success !== true)
      return res.status(502).json({
        success: false,
        error: `${extractError(data, "TikTok fetch fail ho gaya.")} — link check kar ke phir try karein.`,
      });

    const r = data.data?.result || {};
    res.json({
      success: true,
      result: {
        username: r.username || null,
        description: r.description || null,
        thumbnail: r.thumbnail || null,
        video: r.video || null,
        nowatermark: r.nowatermark || null,
        audio: r.audio || null,
        images: r.image || [],
      },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
