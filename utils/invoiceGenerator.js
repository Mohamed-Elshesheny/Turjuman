const PDFDocument = require("pdfkit");
const fs = require("fs");

function generateInvoice(user, items = [], outputPath = null) {
  const doc = new PDFDocument();
  const buffers = [];

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {
    const pdfData = Buffer.concat(buffers);
    if (outputPath) fs.writeFileSync(outputPath, pdfData);
  });

  doc.fontSize(25).text("Turjuman Invoice", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Name: ${user.name}`);
  doc.text(`Email: ${user.email}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  items.forEach((item, i) => {
    doc.text(`${i + 1}. ${item.name} - ${item.amount} EGP`);
  });

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });
}

module.exports = { generateInvoice };
