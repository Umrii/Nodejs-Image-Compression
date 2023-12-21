const { PDFDocumentFactory, PDFDocumentWriter } = require("./pdf-lib/src");

const fs = require("fs");

async function compressPDF(inputPath, outputPath) {
  try {
    // Read the input PDF file
    const pdfBytes = fs.readFileSync(inputPath);

    // Load the PDF document
    const pdfDoc = await PDFDocumentFactory.load(pdfBytes);

    // Compress the PDF document
    await pdfDoc.compress();

    // Write the compressed PDF to a new file
    const modifiedPdfBytes = await PDFDocumentWriter.saveToBytes(pdfDoc);
    fs.writeFileSync(outputPath, modifiedPdfBytes);

    console.log("PDF compression successful!");
  } catch (error) {
    console.error("Error compressing PDF:", error);
  }
}

// Replace 'input.pdf' and 'output.pdf' with your file names
const inputFilePath =
  "C:\\Users\\aatiq\\OneDrive\\Desktop\\Optimization\\PDFReport_Specification(1) (1).pdf";
const outputFilePath = "output_compressed.pdf";

compressPDF(inputFilePath, outputFilePath);
