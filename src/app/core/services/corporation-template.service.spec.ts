import { describe, expect, it } from 'vitest';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { CorporationTemplateService } from './corporation-template.service';
import { CORPORATION_TEMPLATES, pdfRectStyle } from '../config/corporation-templates.config';
import type { ApiService } from './api.service';

/** Minimal ApiService stand-in that records calls. */
function fakeApi(response: () => Observable<unknown>) {
  const calls: string[] = [];
  const api = { get: (url: string) => { calls.push(url); return response(); } } as unknown as ApiService;
  return { api, calls };
}

const master = [
  { corporationID: 21, corporationName: 'Central', corporationNativeName: null },
  { corporationID: 22, corporationName: 'North', corporationNativeName: null },
  { corporationID: 23, corporationName: 'South', corporationNativeName: null },
  { corporationID: 24, corporationName: 'East', corporationNativeName: null },
  { corporationID: 25, corporationName: 'West', corporationNativeName: null },
];

describe('CorporationTemplateService (template selection)', () => {
  it('selects each corporation template and attaches the ID from the GBA master', async () => {
    const { api } = fakeApi(() => of(master));
    const service = new CorporationTemplateService(api);
    for (const [name, code, id] of [['Central', 'BCCC', 21], ['North', 'BNCC', 22], ['South', 'BSCC', 23], ['East', 'BECC', 24], ['West', 'BWCC', 25]] as const) {
      const t = await firstValueFrom(service.resolve(name));
      expect(t?.code).toBe(code);
      expect(t?.corporationID).toBe(id);
      expect(t?.certificateTemplateId).toBe(`GBA-CERT-${code}-V1`);
      expect(t?.acknowledgementTemplateId).toBe(`GBA-ACK-${code}-V1`);
    }
  });

  it('falls back to the legacy BBMP design (null) without calling the API', async () => {
    const { api, calls } = fakeApi(() => of(master));
    const service = new CorporationTemplateService(api);
    expect(await firstValueFrom(service.resolve(null))).toBeNull();
    expect(await firstValueFrom(service.resolve(''))).toBeNull();
    expect(await firstValueFrom(service.resolve('Bruhat Bangalore Mahanagara Palike'))).toBeNull();
    expect(calls).toEqual([]);
  });

  it('loads the corporation master once', async () => {
    const { api, calls } = fakeApi(() => of(master));
    const service = new CorporationTemplateService(api);
    await firstValueFrom(service.resolve('South'));
    await firstValueFrom(service.resolve('East'));
    expect(calls).toEqual(['/gba/corporations']);
  });

  it('still selects the design if the master is unavailable, with no invented ID', async () => {
    const { api } = fakeApi(() => throwError(() => new Error('offline')));
    const t = await firstValueFrom(new CorporationTemplateService(api).resolve('West'));
    expect(t?.code).toBe('BWCC');
    expect(t?.corporationID).toBeNull();
  });

  it('does not take an ID from a different corporation', async () => {
    const { api } = fakeApi(() => of([{ corporationID: 99, corporationName: 'North', corporationNativeName: null }]));
    const t = await firstValueFrom(new CorporationTemplateService(api).resolve('South'));
    expect(t?.corporationID).toBeNull();
  });
});

describe('measured placements', () => {
  it('keeps every seal and watermark inside the A4 page, seal top-right', () => {
    for (const t of CORPORATION_TEMPLATES) {
      for (const page of [t.certificatePlacement, t.acknowledgementPlacement]) {
        for (const [l, top, r, b] of [page.seal, page.watermark]) {
          expect(l).toBeGreaterThanOrEqual(0);
          expect(top).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(595.3);
          expect(b).toBeLessThanOrEqual(841.9);
          expect(r).toBeGreaterThan(l);
          expect(b).toBeGreaterThan(top);
        }
        expect(page.seal[0]).toBeGreaterThan(450);
        expect(page.seal[1]).toBeLessThan(60);
      }
    }
  });

  it('converts a PDF rectangle to pt styles', () => {
    expect(pdfRectStyle([485.5, 45.4, 552.5, 112.6])).toEqual({ left: '485.5pt', top: '45.4pt', width: '67pt', height: '67.2pt' });
  });
});
