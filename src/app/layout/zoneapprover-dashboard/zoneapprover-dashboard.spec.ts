import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ZONE_SUMMARY_PAGE_SIZE, ZoneapproverDashboard } from './zoneapprover-dashboard';
import { signInAs } from '../../testing/portal-test-utils';

// Node >= 25 ships an experimental global `localStorage` that is undefined unless
// --localstorage-file is passed, shadowing jsdom's Storage; give the test an in-memory one.
function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    removeItem: (k: string) => { data.delete(k); },
    setItem: (k: string, v: string) => { data.set(k, String(v)); },
  };
}

const DASHBOARD = '/api/api/trade-licence/zone-approver/dashboard';
const LIST = '/api/api/trade-licence/zone-approver/applications';
const app = (zone: string, status: string) => ({ mohName: zone, licenceApplicationStatusName: status } as any);

describe('ZoneapproverDashboard', () => {
  let component: ZoneapproverDashboard;
  let fixture: ComponentFixture<ZoneapproverDashboard>;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    signInAs('zoneapprover');
    await TestBed.configureTestingModule({
      imports: [ZoneapproverDashboard],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ZoneapproverDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the KPI counts once and the zone table from the queue', () => {
    http.expectOne((r) => r.url === DASHBOARD).flush({
      Dashboard: { TotalInspected: 5, TotalObjection: 2, TotalRejected: 1, GrandTotal: 8 }
    });
    const list = http.expectOne((r) => r.url === LIST);
    expect(list.request.params.get('pageSize')).toBe(String(ZONE_SUMMARY_PAGE_SIZE));
    list.flush({
      TotalRecords: 900,
      Data: [app('East', 'INSPECTED'), app('East', 'OBJECTION'), app('West', 'REJECTED')]
    });
    http.expectNone((r) => r.url === DASHBOARD); // no second, duplicate dashboard call
    fixture.detectChanges();

    expect(component.kpis.map((k) => k.value)).toEqual([5, 2, 1, 8]);
    expect(component.zoneSummary).toEqual([
      { zone: 'East', inspected: 1, objections: 1, rejected: 0 },
      { zone: 'West', inspected: 0, objections: 0, rejected: 1 }
    ]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Based on the latest 3 of 900 applications');
    expect(text).not.toContain('Forwarded'); // the queue never holds FORWARD rows
  });

  it('shows an error when the dashboard API fails instead of silent zeros', () => {
    http.expectOne((r) => r.url === DASHBOARD).flush('x', { status: 500, statusText: 'Server Error' });
    // retry({ count: 1, delay: 800 }) - fail fast in the test by erroring the retried request too
    return new Promise<void>((resolve) => setTimeout(resolve, 900)).then(() => {
      http.expectOne((r) => r.url === DASHBOARD).flush('x', { status: 500, statusText: 'Server Error' });
      http.expectOne((r) => r.url === LIST).flush({ TotalRecords: 0, Data: [] });
      fixture.detectChanges();
      expect(component.loadError).toContain('unavailable');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Dashboard service is unavailable');
    });
  });
});
