const { exec } = require("child_process");
const path = require("path");
const streamifier = require("streamifier");
const baseURL = process.env.BASE_URL;

async function compressPDF(originalFilename, inputBuffer) {
  return new Promise((resolve, reject) => {
    const outputDirectory = process.env.IMAGE_DIRECTORY || "compressed/";
    const outputFileName = `${originalFilename}.pdf`; // Using the original filename for the compressed PDF

    const command = `gswin64c -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -dDetectDuplicateImages=true -dDownsampleColorImages=true -dColorImageResolution=150 -dColorImageDownsampleThreshold=1.0 -dDownsampleGrayImages=true -dGrayImageResolution=150 -dGrayImageDownsampleThreshold=1.0 -dDownsampleMonoImages=true -dMonoImageResolution=150 -dMonoImageDownsampleThreshold=1.0 -sOutputFile=${path.join(
      outputDirectory,
      outputFileName
    )} -`;

    const pdfProcessor = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error compressing PDF: ${stderr}`);
        reject(error);
      } else {
        const compressedFilePath = path.join(outputDirectory, outputFileName);
        resolve(compressedFilePath);
        const publicURL = `${baseURL}${originalFilename}`;
        console.log("Pdf Link", publicURL);
      }
    });

    pdfProcessor.stdin.on("error", (err) => {
      console.error("Error writing to Ghostscript:", err);
      reject(err);
    });

    pdfProcessor.on("exit", (code, signal) => {
      if (code !== 0) {
        console.error(
          `Ghostscript process exited with code ${code} and signal ${signal}`
        );
        reject(
          new Error(
            `Ghostscript process exited with code ${code} and signal ${signal}`
          )
        );
      }
    });

    const inputStream = streamifier.createReadStream(inputBuffer);
    inputStream.pipe(pdfProcessor.stdin);
  });
}

module.exports = compressPDF;
