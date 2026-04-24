const QRCode = require("qrcode");

async function generateQRBuffer(url) {
  return QRCode.toBuffer(url, {
    type: "png",
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
}

module.exports = { generateQRBuffer };
