import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SeniorApprovingOfficer } from './senior-approving-officer';
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

const LIST_URL = '/api/api/trade-licence/senior-approver/applications';
const LOOKUP_URL = '/api/api/trade-licence/senior-approver/lookup';

const row = (id: number, status: string) => ({
  licenceApplicationID: id,
  applicationNumber: `APP-${id}`,
  applicationSubmitDate: '2026-01-01',
  licenceApplicationStatusID: 0,
  licenceApplicationStatusName: status,
  tradeLicenceID: id,
  applicantName: `Applicant ${id}`,
  tradeName: `Trade ${id}`,
  mobileNumber: '',
  emailID: '',
  mohID: 1,
  mohName: 'East',
  wardID: 11,
  wardName: 'E-1'
});

describe('SeniorApprovingOfficer', () => {
  let component: SeniorApprovingOfficer;
  let fixture: ComponentFixture<SeniorApprovingOfficer>;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function create(options: { role?: string; statusId?: string } = {}) {
    signInAs(options.role ?? 'seniorapprover');
    await TestBed.configureTestingModule({
      imports: [SeniorApprovingOfficer],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(options.statusId ? { statusId: options.statusId } : {}) }
          }
        }
      ]
    })
    .compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SeniorApprovingOfficer);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url === LOOKUP_URL).flush({ Zones: [], Wards: [] });
  }

  function flushList(data: any[], totalRecords = data.length) {
    http.expectOne((r) => r.url === LIST_URL).flush({
      TotalRecords: totalRecords,
      PageNumber: 1,
      PageSize: 10,
      VisibleStatuses: ['OBJECTION', 'FORWARDED', 'APPROVED', 'REJECTED'],
      Data: data
    });
    fixture.detectChanges();
  }

  it('should create', async () => {
    await create();
    flushList([]);
    expect(component).toBeTruthy();
  });

  it('no longer shows the hard-coded "TL-2026-0102 beyond SLA" alert or the Priority filter', async () => {
    await create();
    flushList([]);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('TL-2026-0102');
    expect(text).not.toContain('Priority');
  });

  it('filters the loaded page by status (FORWARD row matches FORWARDED)', async () => {
    await create();
    flushList([row(1, 'FORWARD'), row(2, 'OBJECTION'), row(3, 'APPROVED')]);
    component.selectedStatus = 'FORWARDED';
    component.onStatusChanged();
    expect(component.submittedInspectionApplications.map((a) => a.licenceApplicationID)).toEqual([1]);
    expect(component.displayTotalRecords).toBe(1);
  });

  it('pre-selects the status from the dashboard ?statusId= link', async () => {
    await create({ statusId: '5' });
    flushList([row(1, 'FORWARD'), row(2, 'OBJECTION')]);
    expect(component.selectedStatus).toBe('OBJECTION');
    expect(component.submittedInspectionApplications.map((a) => a.licenceApplicationID)).toEqual([2]);
  });

  it('sends the search text to the API as applicationNumber', async () => {
    vi.useFakeTimers();
    try {
      await create();
      flushList([]);
      component.searchText = 'APP-7';
      component.onSearchChanged();
      vi.advanceTimersByTime(350);
      const req = http.expectOne((r) => r.url === LIST_URL);
      expect(req.request.params.get('applicationNumber')).toBe('APP-7');
      expect(req.request.params.get('pageNumber')).toBe('1');
      req.flush({ TotalRecords: 0, Data: [] });
    } finally {
      vi.useRealTimers();
    }
  });

  it('numbers rows across pages and shows 0 - 0 when empty', async () => {
    await create();
    flushList([]);
    expect(component.showingFrom).toBe(0);
    expect(component.showingTo).toBe(0);
  });

  it('routes admin to the admin application view (no /senior-approver route for admin)', async () => {
    await create({ role: 'admin' });
    flushList([]);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.onInspectionClick(9);
    expect(nav).toHaveBeenCalledWith(['/admin/licence-applications', 9]);
  });

  it('routes senior approvers to their inspection page', async () => {
    await create();
    flushList([]);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.onInspectionClick(9);
    expect(nav).toHaveBeenCalledWith(['/senior-approver/inspection', 9]);
  });
});
