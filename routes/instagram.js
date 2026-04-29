const router = require("express").Router();
const { anabotGet, extractError } = require("./_anabot");

router.post("/", async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || !/instagram\.com/i.test(url))
      return res
        .status(400)
        .json({ success: false, error: "Valid Instagram URL chahiye" });

    const data = await anabotGet("/download/instagram", { url });
    if (!data || data.success !== true) {
      const upstream = extractError(data, "Instagram fetch fail ho gaya.");
      return res.status(502).json({
        success: false,
        error: `${upstream} — yaqeeni banayein ke link public hai aur sahi hai, phir dobara try karein.`,
      });
    }

    const items = (data?.data?.result || []).map((it) => ({
      thumbnail: it.thumbnail,
      url: it.url,
    }));

    if (!items.length)
      return res
        .status(404)
        .json({ success: false, error: "Is link mein koi downloadable media nahi mila." });

    res.json({ success: true, count: items.length, items });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
