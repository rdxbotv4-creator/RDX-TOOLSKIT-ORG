const router = require("express").Router();
const axios = require("axios");
const { anabotGet, extractError } = require("./_anabot");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function pollMediaUrl(mediaUrl, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await axios.get(mediaUrl, {
        headers: { "User-Agent": USER_AGENT, Referer: "https://www.facebook.com/" },
        timeout: 10000,
      });
      const data = res.data;
      if (data.status === "completed" && data.fileUrl) {
        return data.fileUrl;
      }
      if (data.status === "error") {
        return null;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

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
    const mediaItems = api.mediaItems || [];

    const processedMedia = await Promise.all(
      mediaItems.map(async (m) => {
        const resolvedUrl = await pollMediaUrl(m.mediaUrl);
        return {
          type: m.type,
          name: m.name,
          quality: m.mediaQuality,
          resolution: m.mediaRes,
          duration: m.mediaDuration,
          extension: m.mediaExtension,
          fileSize: m.mediaFileSize,
          url: resolvedUrl || m.mediaUrl,
          previewUrl: m.mediaPreviewUrl,
          thumbnail: m.mediaThumbnail,
          downloading: !resolvedUrl,
        };
      })
    );

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
        media: processedMedia,
      },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;