const router = require("express").Router();
const { anabotGet, extractError } = require("./_anabot");

router.post("/", async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || !/facebook\.com|fb\.watch/i.test(url))
      return res
        .status(400)
        .json({ success: false, error: "Valid Facebook URL chahiye" });

    const data = await anabotGet("/download/facebook", { url });
    if (!data || data.success !== true)
      return res.status(502).json({
        success: false,
        error: `${extractError(data, "Facebook fetch fail ho gaya.")} — link public hai check karein.`,
      });

    const api = data.data?.result?.api || {};
    res.json({
      success: true,
      result: {
        title: api.title || null,
        description: api.description || null,
        thumbnail: api.imagePreviewUrl || null,
        previewUrl: api.previewUrl || null,
        permanentLink: api.permanentLink || null,
        userInfo: api.userInfo || null,
        mediaStats: api.mediaStats || null,
        media: (api.mediaItems || []).map((m) => ({
          type: m.type,
          name: m.name,
          quality: m.mediaQuality,
          resolution: m.mediaRes,
          duration: m.mediaDuration,
          extension: m.mediaExtension,
          fileSize: m.mediaFileSize,
          url: m.mediaUrl,
          previewUrl: m.mediaPreviewUrl,
          thumbnail: m.mediaThumbnail,
        })),
      },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
