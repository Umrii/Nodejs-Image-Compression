const express = require("express");
const sharp = require("sharp");
const sizeOf = require("image-size");
const fs = require("fs");
const multer = require("multer");
const upload = multer();
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const baseURL = process.env.BASE_URL;
const app = express();
const compressPDF = require("./compress");

app.use("/images", express.static(process.env.IMAGE_DIRECTORY));
app.use(bodyParser.urlencoded({ extended: true }));

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

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
]; // Add more as needed

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
    const maxSizeInBytes = 200 * 1024;
    const compressedFilePaths = [];

    const fileProcessingPromises = req.files.map(async (file) => {
      if (!validateFileType(file)) {
        throw new Error(`Invalid file type: ${file.originalname}`);
      }
      if (file.mimetype === "application/pdf") {
        const inputBuffer = file.buffer;
        try {
          const outputPath = await compressPDF(file.originalname, inputBuffer);
          compressedFilePaths.push(outputPath);
          const publicURL = `${baseURL}${file.originalname}`;
          return {
            originalFilename: file.originalname,
            downloadLink: publicURL,
          };
        } catch (error) {
          console.log("Compression failed: " + error.message);
          return null;
        }
      } else {
        const inputImageBuffer = file.buffer;
        const originalFilename = file.originalname;

        const imageBufferLength = inputImageBuffer.length;

        if (imageBufferLength <= maxSizeInBytes) {
          // For smaller images, save in the same directory as compressed images
          try {
            const compressedFileName = `${originalFilename}`;
            const compressedImagePath = path.join(
              outputDirectory,
              compressedFileName
            );
            // Save the smaller image to the directory for compressed images
            fs.writeFileSync(compressedImagePath, inputImageBuffer);
            console.log(`Image optimized: ${compressedImagePath}`);

            const publicURL = `${baseURL}${compressedFileName}`;
            return {
              originalFilename,
              downloadLink: publicURL,
            };
          } catch (error) {
            throw new Error(`Error optimizing image: ${error}`);
          }
        } else {
          const { width, height } = await getImageDimensions(inputImageBuffer);
          // Process larger images
          const compressedFileName = `${originalFilename}`;
          const compressedImagePath = path.join(
            outputDirectory,
            compressedFileName
          );

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

          const publicURL = `${baseURL}${compressedFileName}`;
          return {
            originalFilename,
            downloadLink: publicURL,
          };
        }
      }
    });

    // Execute all image processing promises
    const processedFiles = await Promise.all(fileProcessingPromises);
    const validFiles = processedFiles.filter((file) => file !== null);

    res.status(200).json({
      message: "Files processed successfully.",
      outputDirectory,
      processedFiles: validFiles,
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
app.options("/upload-images", cors());
