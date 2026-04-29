const router = require("express").Router();
const multer = require("multer");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const upload = multer({
  dest: path.join(__dirname, "..", "tmp"),
  limits: { fileSize: 20 * 1024 * 1024, files: 30 },
});

function pickImageBuffer(file, dataUrl) {
  if (file) {
    const buf = fs.readFileSync(file.path);
    fs.unlink(file.path, () => {});
    return buf;
  }
  if (dataUrl && dataUrl.startsWith("data:image/")) {
    const b64 = dataUrl.split(",")[1];
    return Buffer.from(b64, "base64");
  }
  return null;
}

router.post("/", upload.array("images", 30), async (req, res, next) => {
  try {
    const buffers = [];
    (req.files || []).forEach((f) => {
      const b = pickImageBuffer(f);
      if (b) buffers.push(b);
    });

    let dataUrls = req.body.dataUrls;
    if (typeof dataUrls === "string") {
      try {
        dataUrls = JSON.parse(dataUrls);
      } catch {
        dataUrls = [dataUrls];
      }
    }
    if (Array.isArray(dataUrls)) {
      dataUrls.forEach((du) => {
        const b = pickImageBuffer(null, du);
        if (b) buffers.push(b);
      });
    }

    if (!buffers.length)
      return res
        .status(400)
        .json({ success: false, error: "Koi image nahi mili" });

    const title = (req.body.title || "RDX_Images")
      .replace(/[^a-z0-9_\-]+/gi, "_")
      .slice(0, 60);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${title}.pdf"`
    );

    const doc = new PDFDocument({ autoFirstPage: false, margin: 0 });
    doc.pipe(res);

    buffers.forEach((buf) => {
      try {
        const img = doc.openImage(buf);
        const ratio = img.width / img.height;
        const pageW = 595;
        const pageH = pageW / ratio;
        doc.addPage({ size: [pageW, pageH], margin: 0 });
        doc.image(buf, 0, 0, { width: pageW, height: pageH });
      } catch (e) {
        console.error("img err:", e.message);
      }
    });

    doc.end();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
