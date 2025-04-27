const cloudinary = require("cloudinary").v2;

cloudinary.config({
  secure: true, // Ensure HTTPS URLs
  url: process.env.CLOUDINARY_URL,
});

module.exports = cloudinary;
