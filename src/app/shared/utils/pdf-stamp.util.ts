import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface PdfStampInput {
  fileName?: string;
  uploadedOn?: string | Date | null;
}

function formatUploadedOn(uploadedOn?: string | Date | null): string {
  if (!uploadedOn) {
    return 'N/A';
  }

  const parsed = uploadedOn instanceof Date ? uploadedOn : new Date(uploadedOn);
  if (Number.isNaN(parsed.getTime())) {
    return String(uploadedOn);
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
}

export async function stampPdfWithUploadDetails(
  sourceBlob: Blob,
  input: PdfStampInput
): Promise<Blob> {
  const bytes = await sourceBlob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const uploadedOnText = formatUploadedOn(input.uploadedOn);
  const stampText = `Uploaded On: ${uploadedOnText}`;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = 10;
    const paddingX = 8;
    const paddingY = 4;
    const textWidth = regularFont.widthOfTextAtSize(stampText, fontSize);
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;
    const x = Math.max(12, width - boxWidth - 16);
    const y = Math.max(12, height - boxHeight - 16);

    page.drawRectangle({
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      color: rgb(1, 1, 0.92),
      borderColor: rgb(0.73, 0.45, 0.11),
      borderWidth: 0.8,
      opacity: 0.92
    });

    page.drawText(stampText, {
      x: x + paddingX,
      y: y + paddingY,
      size: fontSize,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2)
    });

    if (input.fileName) {
      const fileNameSize = 8;
      const safeFileName = input.fileName.trim();
      const maxWidth = Math.max(0, width - 32);
      let fileNameText = safeFileName;
      while (
        fileNameText.length > 0 &&
        boldFont.widthOfTextAtSize(fileNameText, fileNameSize) > maxWidth
      ) {
        fileNameText = `${fileNameText.slice(0, -2)}...`;
      }

      page.drawText(fileNameText, {
        x: 16,
        y: 10,
        size: fileNameSize,
        font: boldFont,
        color: rgb(0.35, 0.35, 0.35)
      });
    }
  }

  const stampedBytes = await pdfDoc.save();
  const byteCopy = new Uint8Array(stampedBytes.byteLength);
  byteCopy.set(stampedBytes);
  return new Blob([byteCopy.buffer], { type: 'application/pdf' });
}
