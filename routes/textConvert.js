const router = require("express").Router();
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} = require("docx");

router.post("/", async (req, res, next) => {
  try {
    const { text = "", format = "pdf", title = "RDX Document" } = req.body;
    if (!text.trim())
      return res
        .status(400)
        .json({ success: false, error: "Text khali hai" });

    const fmt = String(format).toLowerCase();
    const safeTitle = (title || "RDX_Document")
      .replace(/[^a-z0-9_\-]+/gi, "_")
      .slice(0, 60);

    if (fmt === "txt") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeTitle}.txt"`
      );
      return res.send(text);
    }

    if (fmt === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeTitle}.pdf"`
      );
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      doc.pipe(res);
      doc
        .fontSize(20)
        .fillColor("#7c4dff")
        .text(title, { align: "center" })
        .moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#7c4dff").stroke();
      doc.moveDown();
      doc.fontSize(12).fillColor("#000").text(text, { align: "left" });
      doc.end();
      return;
    }

    if (fmt === "docx" || fmt === "word") {
      const paragraphs = [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: title, bold: true })],
        }),
        ...text.split(/\r?\n/).map(
          (line) =>
            new Paragraph({ children: [new TextRun({ text: line || " " })] })
        ),
      ];
      const doc = new Document({
        sections: [{ properties: {}, children: paragraphs }],
      });
      const buf = await Packer.toBuffer(doc);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeTitle}.docx"`
      );
      return res.send(buf);
    }

    if (fmt === "xlsx" || fmt === "excel") {
      const wb = new ExcelJS.Workbook();
      wb.creator = "RDX Tools";
      const ws = wb.addWorksheet(title.slice(0, 28) || "Sheet1");
      ws.columns = [
        { header: "#", key: "n", width: 6 },
        { header: "Line", key: "line", width: 100 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF7C4DFF" },
      };
      const lines = text.split(/\r?\n/);
      lines.forEach((line, i) => ws.addRow({ n: i + 1, line }));
      const buf = await wb.xlsx.writeBuffer();
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeTitle}.xlsx"`
      );
      return res.send(Buffer.from(buf));
    }

    return res
      .status(400)
      .json({ success: false, error: "Format support nahi (pdf/docx/xlsx/txt)" });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
