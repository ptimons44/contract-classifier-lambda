import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { TextractClient, AnalyzeDocumentCommand, AnalyzeDocumentCommandInput } from '@aws-sdk/client-textract';

import { PDFDocument } from 'pdf-lib';

const s3 = new S3Client({});
const textract = new TextractClient({});

interface EventInput {
  s3Key: string;
  bucket?: string;
}

exports.handler = async (event: EventInput) => {
  try {
    // Determine the bucket to use (from event or environment variable)
    const bucket = event.bucket || process.env.S3_BUCKET;
    if (!bucket) {
      throw new Error("Bucket name not provided");
    }
    
    const key = event.s3Key;
    console.log(`Fetching PDF from S3: bucket=${bucket}, key=${key}`);
    
    // Download the PDF from S3
    const s3Object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!s3Object.Body) {
      throw new Error("Empty S3 object body");
    }
    
    // Convert the S3 response body to Buffer before loading
    const pdfBuffer = Buffer.from(await s3Object.Body.transformToByteArray());
    
    // Load the PDF document using pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new Error("PDF contains no pages");
    }
    
    // Extract the first page from the PDF
    const newPdfDoc = await PDFDocument.create();
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [0]);
    newPdfDoc.addPage(copiedPage);
    const firstPagePdfBytes: Uint8Array = await newPdfDoc.save();
    
    // Prepare the parameters for the Textract synchronous API call.
    // In this example we use analyzeDocument without any FeatureTypes,
    // but you can add features like ["TABLES", "FORMS"] if needed.
    const textractParams: AnalyzeDocumentCommandInput = {
      Document: { Bytes: firstPagePdfBytes },
      FeatureTypes: ['LAYOUT'] // Adjust feature types if required
    };
    
    console.log("Calling Textract analyzeDocument API...");
    const textractResponse = await textract.send(new AnalyzeDocumentCommand(textractParams));
    
    // Example logic: Count the number of blocks with BlockType 'LINE'
    const blocks = textractResponse.Blocks || [];
    const lineBlocks = blocks.filter(block => block.BlockType === 'LINE');
    console.log(`Found ${lineBlocks.length} LINE blocks.`);
    
    // Further logic can be performed here based on the Textract response
    // For instance, processing layout, extracting text positions, etc.
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Textract processed the first page successfully.",
        lineCount: lineBlocks.length,
      }),
    };
    
  } catch (error) {
    console.error("Error processing PDF with Textract:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing PDF with Textract",
        error: error instanceof Error ? error.message : error,
      }),
    };
  }
};
