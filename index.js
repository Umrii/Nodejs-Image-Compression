const express = require("express");
const sharp = require("sharp");
const sizeOf = require("image-size");
const multer = require("multer");
const upload = multer();
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());

if (!process.env.IMAGE_DIRECTORY) {
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
      .rotate()
      .resize({
        width: maxWidth,
        height: maxHeight,
        fit: sharp.fit.inside,
      })
      .toFormat(metadata.format, { quality })
      .toFile(outputPath);

    console.log(`Image optimized: ${outputPath}`);
  } catch (error) {
    throw new Error(`Error optimizing image: ${error}`);
  }
}
// retrieve image height and width asynchronously
async function getImageDimensions(inputImageBuffer) {
  try {
    const dimensions = sizeOf(inputImageBuffer);
    return {
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    throw new Error(`Error getting image dimensions: ${error}`);
  }
}
app.use("/images", express.static(process.env.IMAGE_DIRECTORY));
app.use(bodyParser.urlencoded({ extended: true }));

const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"]; // Add more as needed

// Function to validate file type
function validateFileType(file) {
  return allowedImageTypes.includes(file.mimetype);
}

// Update the route to handle array of images
app.post("/upload-images", upload.array("images"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new Error("Please upload at least one valid image file.");
    }

    const outputDirectory = process.env.IMAGE_DIRECTORY;
    const quality = 80;

    const imageProcessingPromises = req.files.map(async (file) => {
      if (!validateFileType(file)) {
        throw new Error(`Invalid file type: ${file.originalname}`);
      }

      const inputImageBuffer = file.buffer;
      const originalFilename = file.originalname;
      const extName = path.extname(originalFilename);

      const compressedFileName = `${originalFilename}`;
      const compressedImagePath = path.join(
        outputDirectory,
        compressedFileName
      );

      const { width, height } = await getImageDimensions(inputImageBuffer);
      const maxHeight = Math.floor(height / 3);
      const maxWidth = Math.floor(width / 3);

      // Process each image from buffer and save the compressed version
      await optimizeImage(
        inputImageBuffer,
        compressedImagePath,
        maxWidth,
        maxHeight,
        quality
      );

      const publicURL = `http://localhost:3000/images/${compressedFileName}`;
      return {
        originalFilename,
        downloadLink: publicURL,
      };
    });

    // Execute all image processing promises
    const processedImages = await Promise.all(imageProcessingPromises);

    res.status(200).json({
      message: "Images saved at:",
      outputDirectory,
      processedImages,
    });
  } catch (error) {
    res.status(500).json({
      error: "Image upload and optimization failed",
      message: error.message,
    });
  }
});

// ... (existing code)
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
app.options("/upload-image", cors());
