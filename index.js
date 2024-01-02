const express = require("express");
const sharp = require("sharp");
const sizeOf = require("image-size");
const fs = require("fs");
const multer = require("multer");
const upload = multer();
const path = require("path");
require("dotenv").config();
const bodyParser = require("body-parser");
const compressPDF = require("./compress");
const cors = require("cors");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: "http://localhost", credentials: true }));
app.use(cors());

if (!process.env.IMAGE_DIRECTORY) {
  throw new Error(
    "Environment variables for paths are not properly configured."
  );
}
async function optimizeImage(
  inputPath,
  outputPath,
  maxWidth,
  maxHeight,
  quality
) {
  try {
    const metadata = await sharp(inputPath).metadata();
    await sharp(inputPath)
      .rotate()
      .resize({ width: maxWidth, height: maxHeight, fit: sharp.fit.inside })
      .toFormat(metadata.format, { quality })
      .toFile(outputPath);

    console.log(`Image Optimized: ${outputPath}`);
  } catch (error) {
    console.log("Unsupported Image Format");
    fs.writeFileSync(compressedImagePath, inputImageBuffer);
  }
}

async function getImageDimensions(inputImageBuffer) {
  try {
    const dimensions = sizeOf(inputImageBuffer);
    return { width: dimensions.width, height: dimensions.height };
  } catch (error) {
    throw new Error(`Error getting image dimensions: ${error}`);
  }
}

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
];

function validateFileType(file) {
  return allowedImageTypes.includes(file.mimetype);
}

app.post("/upload-images", upload.any(), async (req, res) => {
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
        const unsupportedFileName = `${file.originalname}`;
        const unsupportedFilePath = path.join(
          outputDirectory,
          unsupportedFileName
        );
        fs.writeFileSync(unsupportedFilePath, file.buffer);
        console.log(`Unsupported file copied: ${unsupportedFilePath}`);
        return null;
      }

      if (file.mimetype === "application/pdf") {
        const inputBuffer = file.buffer;
        try {
          const outputPath = await compressPDF(file.originalname, inputBuffer);
          compressedFilePaths.push(outputPath);
          return { originalFilename: file.originalname };
        } catch (error) {
          console.log("Compression failed: " + error.message);
          return null;
        }
      } else {
        const inputImageBuffer = file.buffer;
        const originalFilename = file.originalname;

        const imageBufferLength = inputImageBuffer.length;

        if (imageBufferLength <= maxSizeInBytes) {
          try {
            const compressedFileName = `${originalFilename}`;
            const compressedImagePath = path.join(
              outputDirectory,
              compressedFileName
            );
            fs.writeFileSync(compressedImagePath, inputImageBuffer);
            console.log(`Image optimized: ${compressedImagePath}`);
            return { originalFilename };
          } catch (error) {
            throw new Error(`Error optimizing image: ${error}`);
          }
        } else {
          const { width, height } = await getImageDimensions(inputImageBuffer);
          const compressedFileName = `${originalFilename}`;
          const compressedImagePath = path.join(
            outputDirectory,
            compressedFileName
          );

          const maxHeight = Math.floor(height / 3);
          const maxWidth = Math.floor(width / 3);
          try {
            await optimizeImage(
              inputImageBuffer,
              compressedImagePath,
              maxWidth,
              maxHeight,
              quality
            );
            return { originalFilename };
          } catch (optimizationError) {
            try {
              const originalFilePath = path.join(
                outputDirectory,
                file.originalname
              );
              fs.writeFileSync(originalFilePath, file.buffer);
              console.log(
                `Unsupported Format Image is copied as: ${originalFilePath}`
              );
              return { originalFilename: file.originalname };
            } catch (copyError) {
              console.error(
                "Unsupported Format, Failed to copy image:",
                copyError.message
              );
            }
          }
        }
      }
    });

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
