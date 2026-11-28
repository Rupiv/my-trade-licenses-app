import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SeniorapprovingDashboard } from './seniorapproving-dashboard';
import { isDeclaredRoute, signInAs } from '../../testing/portal-test-utils';

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

describe('SeniorapprovingDashboard', () => {
  let component: SeniorapprovingDashboard;
  let fixture: ComponentFixture<SeniorapprovingDashboard>;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    signInAs('seniorapprover');
    await TestBed.configureTestingModule({
      imports: [SeniorapprovingDashboard],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SeniorapprovingDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url === '/api/api/trade-licence/senior-approver/dashboard').flush({
      dashboard: { TotalForwarded: 4, TotalObjection: 2, TotalApproved: 3, TotalRejected: 1, GrandTotal: 10 }
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.stats.GrandTotal).toBe(10);
  });

  it('every action button is a link to a declared senior-approver route (no dead buttons)', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('button:not([disabled])').length).toBe(1); // only "Refresh Counts"

    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('a.btn'));
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Review Forwarded Applications',
      'View Objection Cases'
    ]);
    for (const a of links) {
      const href = a.getAttribute('href') ?? '';
      expect(href.startsWith('/senior-approver/senior-approving-officer?statusId=')).toBe(true);
      expect(isDeclaredRoute(href)).toBe(true);
    }
  });
});
