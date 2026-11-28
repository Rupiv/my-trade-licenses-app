import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ZoneApprovingOfficer } from './zone-approving-officer';
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

describe('ZoneApprovingOfficer', () => {
  let component: ZoneApprovingOfficer;
  let fixture: ComponentFixture<ZoneApprovingOfficer>;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function create(role: string) {
    signInAs(role);
    await TestBed.configureTestingModule({
      imports: [ZoneApprovingOfficer],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ZoneApprovingOfficer);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url === '/api/api/trade-licence/zone-approver/lookup').flush({
      Zones: [{ ZoneID: 1, ZoneName: 'East' }, { ZoneID: 2, ZoneName: 'West' }],
      Wards: [{ WardID: 11, WardName: 'E-1', ZoneID: 1 }, { WardID: 21, WardName: 'W-1', ZoneID: 2 }]
    });
    http.expectOne((r) => r.url === '/api/api/trade-licence/zone-approver/applications')
      .flush({ TotalRecords: 0, Data: [] });
  }

  it('lists only the selected zone wards', async () => {
    await create('zoneapprover');
    expect(component.filteredWardOptions.length).toBe(2);
    component.selectedZoneId = 1;
    expect(component.filteredWardOptions.map((w) => w.id)).toEqual([11]);
  });

  it.each([
    ['zoneapprover', '/zone-approver/licence-applications'],
    ['admin', '/admin/licence-applications']
  ])('%s opens a declared details route', async (role, prefix) => {
    await create(role);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.onOpenApplicationDetails({ licenceApplicationID: 7 } as any);
    expect(nav.mock.calls[0][0]).toEqual([prefix, 7]);
    expect(isDeclaredRoute(`${prefix}/7`)).toBe(true);
  });
});
