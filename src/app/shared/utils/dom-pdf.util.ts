/**
 * Renders a DOM element (an A4 certificate / acknowledgement page) into a PDF blob with
 * html2canvas + jsPDF. Extracted unchanged from LicenceCertificate so both documents use the
 * same rendering: 'save' = compressed JPEG for upload, 'download' = sharper PNG.
 */
export async function renderElementToPdfBlob(
  target: HTMLElement,
  mode: 'save' | 'download' = 'download'
): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
    waitForImages(target),
  ]);

  const canvas = await html2canvas(target, {
    scale: mode === 'save' ? 1.1 : 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imageType = mode === 'save' ? 'JPEG' : 'PNG';
  const imgData =
    mode === 'save'
      ? canvas.toDataURL('image/jpeg', 0.72)
      : canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'pt',
    format: 'a4',
    compress: mode === 'save',
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageWidth = pageWidth;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  const compression = mode === 'save' ? 'FAST' : 'MEDIUM';

  let heightLeft = imageHeight;
  let position = 0;

  pdf.addImage(imgData, imageType, 0, position, imageWidth, imageHeight, undefined, compression);
  heightLeft -= pageHeight;

  // A page that is exactly A4 tall can exceed it by a rounding pixel; ignore slivers under 2pt.
  while (heightLeft > 2) {
    position = heightLeft - imageHeight;
    pdf.addPage();
    pdf.addImage(imgData, imageType, 0, position, imageWidth, imageHeight, undefined, compression);
    heightLeft -= pageHeight;
  }

  return pdf.output('blob');
}

/** Resolves once every <img> inside the element has loaded or failed (max 5s), so seals/logos are captured. */
function waitForImages(root: HTMLElement, timeoutMs = 5000): Promise<void> {
  const pending = Array.from(root.querySelectorAll('img')).filter((img) => !img.complete);
  if (!pending.length) {
    return Promise.resolve();
  }
  const loads = pending.map(
    (img) =>
      new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      })
  );
  const timer = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([Promise.all(loads).then(() => undefined), timer]);
}

/** Triggers a browser download of a blob. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Letters, digits, '-' and '_' only, for file names built from application numbers. */
export function safeFileToken(value: string | null | undefined, fallback: string): string {
  const cleaned = (value ?? '').replace(/[^a-z0-9-_]/gi, '_').trim();
  return cleaned || fallback;
}
