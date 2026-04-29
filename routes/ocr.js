const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { anabotGet, extractError } = require("./_anabot");

const upload = multer({
  dest: path.join(__dirname, "..", "uploads"),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post("/", upload.single("image"), async (req, res, next) => {
  try {
    let imageUrl = req.body.imageUrl;

    if (req.file) {
      const ext = path.extname(req.file.originalname) || ".jpg";
      const newName = `${req.file.filename}${ext}`;
      const newPath = path.join(req.file.destination, newName);
      fs.renameSync(req.file.path, newPath);
      const proto = req.headers["x-forwarded-proto"] || req.protocol;
      const host = `${proto}://${req.get("host")}`;
      imageUrl = `${host}/uploads/${newName}`;
    }

    if (!imageUrl)
      return res
        .status(400)
        .json({ success: false, error: "Image URL ya file chahiye" });

    const data = await anabotGet("/tools/ocr", { imageUrl });
    if (!data || data.success !== true)
      return res.status(502).json({
        success: false,
        error: extractError(data, "OCR fail ho gaya. Doosri image try karein."),
      });

    res.json({ success: true, text: data.data?.result || "" });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
