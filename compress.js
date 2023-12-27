const { spawn } = require("child_process");
const path = require("path");
const streamifier = require("streamifier");
const baseURL = process.env.BASE_URL || "http://localhost:3000/images/";
const fs = require("fs");

async function compressPDF(originalFilename, inputBuffer) {
  return new Promise((resolve, reject) => {
    const outputDirectory = process.env.IMAGE_DIRECTORY || "compressed/";
    const originalFilePath = path.join(
      outputDirectory,
      `${originalFilename}_original.pdf`
    );
    const compressedFilePath = path.join(
      outputDirectory,
      `${originalFilename}_compressed.pdf`
    );

    fs.writeFileSync(originalFilePath, inputBuffer);

    const originalFileSize = fs.statSync(originalFilePath).size;

    const args = [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/screen",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-dDetectDuplicateImages=true",
      "-dDownsampleColorImages=true",
      "-dColorImageResolution=150",
      "-dColorImageDownsampleThreshold=1.0",
      "-dDownsampleGrayImages=true",
      "-dGrayImageResolution=150",
      "-dGrayImageDownsampleThreshold=1.0",
      "-dDownsampleMonoImages=true",
      "-dMonoImageResolution=150",
      "-dMonoImageDownsampleThreshold=1.0",
      `-sOutputFile=${compressedFilePath}`,
      originalFilePath,
    ];

    const pdfProcessor = spawn("gswin64c", args);

    pdfProcessor.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    pdfProcessor.on("close", (code) => {
      if (code === 0) {
        const compressedFileSize = fs.statSync(compressedFilePath).size;

        if (compressedFileSize >= originalFileSize) {
          fs.unlinkSync(compressedFilePath);
          resolve(originalFilePath);
        } else {
          fs.unlinkSync(originalFilePath);
          resolve(compressedFilePath);
          const publicURL = `${baseURL}${originalFilename}`;
          console.log("Pdf Link", publicURL);
        }
      } else {
        console.error(`Ghostscript process exited with code ${code}`);
        reject(new Error(`Ghostscript process exited with code ${code}`));
      }
    });

    pdfProcessor.on("error", (err) => {
      console.error("Spawn error:", err);
      reject(err);
    });

    const inputStream = streamifier.createReadStream(inputBuffer);

    inputStream.on("end", () => {
      console.log("Input stream ended.");
      // Optionally, you can also close the child process's stdin explicitly if needed.
      pdfProcessor.stdin.end();
    });

    pdfProcessor.stdin.on("end", () => {
      console.log("Child process stdin ended.");
      // You might add some handling here if required.
    });
  });
}

module.exports = compressPDF;
