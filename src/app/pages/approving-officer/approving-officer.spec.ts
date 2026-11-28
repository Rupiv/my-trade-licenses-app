import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ApprovingOfficer } from './approving-officer';
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

const LIST_URL = '/api/api/trade-licence/approver/applications';
const LOOKUP_URL = '/api/api/trade-licence/approver/lookup';

describe('ApprovingOfficer', () => {
  let component: ApprovingOfficer;
  let fixture: ComponentFixture<ApprovingOfficer>;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function create(role = 'approver') {
    signInAs(role);
    await TestBed.configureTestingModule({
      imports: [ApprovingOfficer],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ApprovingOfficer);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url === LOOKUP_URL).flush({
      Zones: [{ ZoneID: 1, ZoneName: 'East' }, { ZoneID: 2, ZoneName: 'West' }],
      Wards: [{ WardID: 11, WardName: 'E-1', ZoneID: 1 }, { WardID: 21, WardName: 'W-1', ZoneID: 2 }]
    });
    http.expectOne(LIST_URL).flush({ totalRecords: 0, pageNumber: 1, pageSize: 10, data: [] });
  }

  it('should create', async () => {
    await create();
    expect(component).toBeTruthy();
  });

  it('reloads from the API with mohId when the zone changes (not just the loaded page)', async () => {
    await create();
    component.selectedZoneId = 1;
    component.onZoneChanged();
    const req = http.expectOne(LIST_URL);
    expect(req.request.body.mohId).toBe(1);
    req.flush({ totalRecords: 0, data: [] });
  });

  it('lists only the selected zone wards', async () => {
    await create();
    component.selectedZoneId = 2;
    expect(component.filteredWardOptions.map((w) => w.id)).toEqual([21]);
  });

  it('does not send free text the API would reject (400) as applicationNumber', async () => {
    await create();
    component.searchText = 'Ramesh Kumar';
    expect(component.serverSearchText).toBe('');
    component.searchText = 'TL/2026-0001';
    expect(component.serverSearchText).toBe('TL/2026-0001');
  });

  it('opens the admin application view for admin (no /approver route for admin)', async () => {
    await create('admin');
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.onInspectionClick(42);
    expect(nav).toHaveBeenCalledWith(['/admin/licence-applications', 42]);
  });

  it('opens the approver inspection page for approvers', async () => {
    await create('approver');
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.onInspectionClick(42);
    expect(nav).toHaveBeenCalledWith(['/approver/inspection', 42]);
  });
});
