import { beforeEach, describe, expect, it, vi } from 'vitest';

// html2canvas / jsPDF stand-ins: the canvas height is set per test, jsPDF records the pages added.
const state = { canvasHeight: 0, pages: 0, imageCalls: [] as number[] };

vi.mock('html2canvas', () => ({
  default: vi.fn(async () => ({
    width: 794,
    height: state.canvasHeight,
    toDataURL: () => 'data:image/png;base64,',
  })),
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function (this: any) {
    state.pages = 1;
    this.internal = { pageSize: { getWidth: () => 595.28, getHeight: () => 841.89 } };
    this.addImage = (_d: unknown, _t: unknown, _x: number, y: number) => state.imageCalls.push(y);
    this.addPage = () => { state.pages += 1; };
    this.output = () => new Blob(['pdf'], { type: 'application/pdf' });
  }),
}));

import { renderElementToPdfBlob, safeFileToken } from './dom-pdf.util';

/** Element with no images (waitForImages resolves at once). */
const element = { querySelectorAll: () => [] } as unknown as HTMLElement;

describe('renderElementToPdfBlob (PDF export)', () => {
  beforeEach(() => {
    state.pages = 0;
    state.imageCalls = [];
  });

  it('renders an A4 document as exactly one page', async () => {
    state.canvasHeight = 1123; // 794 x 1123 px = A4 at 96 dpi
    const blob = await renderElementToPdfBlob(element, 'download');
    expect(blob.type).toBe('application/pdf');
    expect(state.pages).toBe(1);
  });

  it('does not add a blank page for a sub-2pt rounding sliver', async () => {
    state.canvasHeight = 1125; // ~1.5pt taller than A4 after scaling
    await renderElementToPdfBlob(element, 'save');
    expect(state.pages).toBe(1);
  });

  it('still paginates content that is genuinely taller than a page', async () => {
    state.canvasHeight = 1600;
    await renderElementToPdfBlob(element, 'download');
    expect(state.pages).toBe(2);
    expect(state.imageCalls[1]).toBeLessThan(0); // second page shows the lower part
  });
});

describe('safeFileToken', () => {
  it('turns application numbers into safe file names', () => {
    expect(safeFileToken('BSCC/JAY/N/APP/2026-27/00001', 'x')).toBe('BSCC_JAY_N_APP_2026-27_00001');
    expect(safeFileToken('', 'acknowledgement')).toBe('acknowledgement');
    expect(safeFileToken(null, 'acknowledgement')).toBe('acknowledgement');
  });
});
