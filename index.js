const express = require("express");
const sharp = require("sharp");
const fs = require("fs");
const sizeOf = require("image-size");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const path = require("path");

const app = express();

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
async function getImageHeight(inputImagePath) {
  try {
    const image = await fs.promises.readFile(inputImagePath);
    const dimensions = sizeOf(image);
    return dimensions.height;
  } catch (error) {
    throw new Error(`Error getting image height: ${error}`);
  }
}

app.use(
  "/images",
  express.static("C:\\Users\\aatiq\\OneDrive\\Desktop\\Optimization\\new")
);

app.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    const inputImagePath = req.file.path;

    const originalFilename = req.file.originalname;
    const extName = path.extname(originalFilename);

    const outputDirectory =
      "C:\\Users\\aatiq\\OneDrive\\Desktop\\Optimization\\new";

    const outputImagePath = path.join(outputDirectory, originalFilename);

    const height = await getImageHeight(inputImagePath);
    const maxWidth = 600;
    const maxHeight = Math.floor(height / 1.1);
    const quality = 80;

    await optimizeImage(
      inputImagePath,
      outputImagePath,
      maxWidth,
      maxHeight,
      quality
    );

    const compressedFileName = `compressed_${Date.now()}${extName}`;
    const compressedImagePath = path.join(outputDirectory, compressedFileName);

    fs.renameSync(outputImagePath, compressedImagePath);

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
