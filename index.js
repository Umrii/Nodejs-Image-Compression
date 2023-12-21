const express = require("express");
const sharp = require("sharp");
const fs = require("fs");
const sizeOf = require("image-size");
const multer = require("multer");
const upload = multer();
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

if (!process.env.UPLOAD_PATH || !process.env.IMAGE_DIRECTORY) {
  throw new Error(
    "Environment variables for paths are not properly configured."
  );
}

// Function to resize and compress an image
async function optimizeImage(
  inputPath,
  outputPath,
  maxWidth,
  maxHeight,
  quality
) {
  try {
    const metadata = await sharp(inputPath).metadata();
    const { format } = metadata;

    await sharp(inputPath)
      .resize({ width: maxWidth, height: maxHeight, fit: sharp.fit.inside })
      .toFormat(metadata.format, { quality })
      .toFile(outputPath);

    console.log(`Image optimized: ${outputPath}`);
  } catch (error) {
    throw new Error(`Error optimizing image: ${error}`);
  }
}
// retrieve image height asynchronously
async function getImageHeight(inputImageBuffer) {
  try {
    const dimensions = sizeOf(inputImageBuffer);
    return dimensions.height;
  } catch (error) {
    throw new Error(`Error getting image height: ${error}`);
  }
}
app.use("/images", express.static(process.env.IMAGE_DIRECTORY));
app.use(bodyParser.urlencoded({ extended: true }));

const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"]; // Add more as needed

// Function to validate file type
function validateFileType(file) {
  return allowedImageTypes.includes(file.mimetype);
}

app.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file || !validateFileType(req.file)) {
      throw new Error("Please upload a valid image file.");
    }

    const inputImageBuffer = req.file.buffer;

    const originalFilename = req.file.originalname;
    const extName = path.extname(originalFilename);

    const outputDirectory = process.env.IMAGE_DIRECTORY;

    const compressedFileName = `compressed_${Date.now()}${extName}`;
    const compressedImagePath = path.join(outputDirectory, compressedFileName);

    const height = await getImageHeight(inputImageBuffer); // Pass buffer instead of file path
    const maxWidth = 600;
    const maxHeight = Math.floor(height / 1.1);
    const quality = 80;

    // Process the image from buffer and save the compressed version
    await optimizeImage(
      inputImageBuffer, // Pass buffer instead of file path
      compressedImagePath,
      maxWidth,
      maxHeight,
      quality
    );

    const publicURL = `http://localhost:3000/images/${compressedFileName}`;
    res.status(200).json({
      message: "Image saved at:",
      outputDirectory,
      downloadLink: publicURL,
    });
  } catch (error) {
    res.status(500).json({
      error: "Image upload and optimization failed",
      message: error.message,
    });
  }
});
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
app.options("/upload-image", cors());
