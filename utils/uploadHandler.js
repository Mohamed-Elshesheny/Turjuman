const multer = require("multer");
const fs = require("fs");

const uploadPath = "/tmp/uploads/";
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log(`Uploads folder created at: ${uploadPath}`);
}

const upload = multer({ dest: uploadPath });

module.exports = upload;