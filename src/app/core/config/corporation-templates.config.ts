/**
 * Corporation-specific document templates (GBA).
 *
 * One reusable certificate layout and one reusable acknowledgement layout are rendered with the
 * entry below that matches the application's GBA corporation. Everything that differs between the
 * five reference PDFs (docs/templates/*.pdf) lives here:
 *   - certificate     = page 1 of the corporation's PDF
 *   - acknowledgement = page 2 of the corporation's PDF
 *
 * Corporation IDs are NOT hardcoded: an entry is matched by the corporation NAME the backend returns
 * (`corporationName` from GET /gba/corporations, the certificate API and the application view) and the
 * real `corporationID` is attached at runtime by CorporationTemplateService.
 *
 * To add or change a corporation, edit only this file (and drop its seal into public/templates/gba/).
 *
 * Assets in public/templates/gba/ were extracted unchanged from the reference PDFs (PyMuPDF):
 *   gba-logo.png   - GBA emblem (JPEG + its soft mask -> PNG with transparency), identical in all 5 PDFs
 *   watermark.jpg  - temple watermark, original JPEG bytes, identical in all 5 PDFs (already faded)
 *   seal-<code>.jpg - corporation seal, original JPEG bytes, one per PDF
 * The sample QR code embedded in the PDFs is deliberately NOT used: it is template filler, not a
 * verification code for any real licence.
 */

/** Image rectangle on the A4 page in PDF points: [left, top, right, bottom] (595.3 x 841.9 page). */
export type PdfRect = readonly [number, number, number, number];

/** Where the seal and watermark sit on one page, measured from the reference PDF. */
export interface PagePlacement {
  readonly seal: PdfRect;
  readonly watermark: PdfRect;
}

export interface CorporationTemplate {
  /** Stable key used in template identifiers and asset names. */
  readonly key: 'central' | 'north' | 'south' | 'east' | 'west';
  /** Value of `corporationName` as stored in the GBA corporation master. */
  readonly corporationName: string;
  /** Corporation code used in licence / application numbers, e.g. BSCC/JAY/2026-27/00001. */
  readonly code: string;
  /** Heading printed under "GREATER BENGALURU AUTHORITY". */
  readonly fullName: string;
  /** Identifier of the page-1 design (stored with the generated certificate). */
  readonly certificateTemplateId: string;
  /** Identifier of the page-2 design (stored with the generated acknowledgement). */
  readonly acknowledgementTemplateId: string;
  /** Corporation seal shown at the top right of both documents. */
  readonly sealUrl: string;
  /** Seal / watermark positions on page 1 (certificate), as in this corporation's PDF. */
  readonly certificatePlacement: PagePlacement;
  /** Seal / watermark positions on page 2 (acknowledgement), as in this corporation's PDF. */
  readonly acknowledgementPlacement: PagePlacement;
  /** Reference PDF the design was taken from (documentation only). */
  readonly referencePdf: string;
}

/** Assets shared by all five GBA designs. */
export const GBA_TEMPLATE_ASSETS = {
  /** Greater Bengaluru Authority emblem, top left of both documents. */
  gbaLogoUrl: '/templates/gba/gba-logo.png',
  /** Faded temple watermark behind the body of both documents. */
  watermarkUrl: '/templates/gba/watermark.jpg',
  authorityName: 'GREATER BENGALURU AUTHORITY',
  departmentName: 'PUBLIC HEALTH DEPARTMENT',
} as const;

export const CORPORATION_TEMPLATES: readonly CorporationTemplate[] = [
  {
    key: 'central',
    corporationName: 'Central',
    code: 'BCCC',
    fullName: 'BENGALURU CENTRAL CITY CORPORATION',
    certificateTemplateId: 'GBA-CERT-BCCC-V1',
    acknowledgementTemplateId: 'GBA-ACK-BCCC-V1',
    sealUrl: '/templates/gba/seal-bccc.jpg',
    certificatePlacement: { seal: [485.5, 45.4, 552.4, 112.0], watermark: [188.9, 260.6, 417.0, 631.2] },
    acknowledgementPlacement: { seal: [478.3, 45.4, 545.2, 112.0], watermark: [200.9, 272.6, 429.0, 643.2] },
    referencePdf: 'docs/templates/Shivajingar.pdf',
  },
  {
    key: 'north',
    corporationName: 'North',
    code: 'BNCC',
    fullName: 'BENGALURU NORTH CITY CORPORATION',
    certificateTemplateId: 'GBA-CERT-BNCC-V1',
    acknowledgementTemplateId: 'GBA-ACK-BNCC-V1',
    sealUrl: '/templates/gba/seal-bncc.jpg',
    certificatePlacement: { seal: [485.5, 45.4, 552.5, 112.6], watermark: [200.9, 272.6, 429.0, 643.2] },
    acknowledgementPlacement: { seal: [480.6, 45.4, 547.6, 112.6], watermark: [188.9, 260.6, 417.0, 631.3] },
    referencePdf: 'docs/templates/Yelahanka.pdf',
  },
  {
    key: 'south',
    corporationName: 'South',
    code: 'BSCC',
    fullName: 'BENGALURU SOUTH CITY CORPORATION',
    certificateTemplateId: 'GBA-CERT-BSCC-V1',
    acknowledgementTemplateId: 'GBA-ACK-BSCC-V1',
    sealUrl: '/templates/gba/seal-bscc.jpg',
    certificatePlacement: { seal: [485.5, 45.4, 552.5, 112.6], watermark: [200.9, 272.6, 429.0, 643.3] },
    acknowledgementPlacement: { seal: [475.3, 49.8, 542.3, 117.0], watermark: [188.9, 260.6, 417.0, 631.3] },
    referencePdf: 'docs/templates/Jayanagar.pdf',
  },
  {
    key: 'east',
    corporationName: 'East',
    code: 'BECC',
    fullName: 'BENGALURU EAST CITY CORPORATION',
    certificateTemplateId: 'GBA-CERT-BECC-V1',
    acknowledgementTemplateId: 'GBA-ACK-BECC-V1',
    sealUrl: '/templates/gba/seal-becc.jpg',
    certificatePlacement: { seal: [485.5, 45.4, 552.5, 112.6], watermark: [180.7, 245.6, 408.8, 616.8] },
    acknowledgementPlacement: { seal: [478.1, 45.4, 545.0, 112.6], watermark: [188.5, 260.9, 417.0, 632.0] },
    referencePdf: 'docs/templates/Mahadevapura.pdf',
  },
  {
    key: 'west',
    corporationName: 'West',
    code: 'BWCC',
    fullName: 'BENGALURU WEST CITY CORPORATION',
    certificateTemplateId: 'GBA-CERT-BWCC-V1',
    acknowledgementTemplateId: 'GBA-ACK-BWCC-V1',
    sealUrl: '/templates/gba/seal-bwcc.jpg',
    certificatePlacement: { seal: [485.8, 45.4, 550.7, 109.8], watermark: [188.9, 260.6, 417.0, 631.2] },
    acknowledgementPlacement: { seal: [478.6, 45.4, 543.5, 109.8], watermark: [200.9, 272.6, 429.0, 643.2] },
    referencePdf: 'docs/templates/Sadashivanag.pdf',
  },
];

/** 'Central', 'central', 'Bengaluru Central City Corporation', 'BCCC' -> 'central'. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Finds the template for a corporation name or code as returned by the backend.
 * Returns null when there is no GBA corporation (licences issued before GBA keep the BBMP design).
 */
export function findCorporationTemplate(nameOrCode: string | null | undefined): CorporationTemplate | null {
  const value = normalize(nameOrCode ?? '');
  if (!value) {
    return null;
  }
  return (
    CORPORATION_TEMPLATES.find(
      (t) =>
        value === normalize(t.corporationName) ||
        value === normalize(t.code) ||
        value === normalize(t.fullName) ||
        value === normalize(`Bengaluru ${t.corporationName} City Corporation`)
    ) ?? null
  );
}

/** Inline CSS (pt) placing an element at a rectangle measured in the reference PDF. */
export function pdfRectStyle(rect: PdfRect): Record<string, string> {
  const [left, top, right, bottom] = rect;
  return {
    left: `${left}pt`,
    top: `${top}pt`,
    width: `${+(right - left).toFixed(2)}pt`,
    height: `${+(bottom - top).toFixed(2)}pt`,
  };
}
