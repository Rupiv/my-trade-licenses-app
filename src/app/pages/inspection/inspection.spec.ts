import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Inspection, validateRemarks } from './inspection';
import { NotificationService } from '../../shared/components/notification/notification.service';
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

const APPROVER_LIST = '/api/api/trade-licence/approver/applications';
const DOCS = '/api/api/licence-documents/by-application/55';
const SUBMIT = '/api/api/master/licence-process/submit-action';

describe('validateRemarks (mirrors LicenceActionRequest.Remarks)', () => {
  it('requires remarks', () => {
    expect(validateRemarks('')).toContain('enter remarks');
  });

  it('rejects characters the API rejects', () => {
    expect(validateRemarks('Checked on 12/03')).toContain('only contain');
    expect(validateRemarks("Owner's shop")).toContain('only contain');
  });

  it('accepts letters, digits, spaces and - . , ( )', () => {
    expect(validateRemarks('Site verified, all OK (board present) - 2026.')).toBeNull();
  });

  it('enforces the 500 character limit', () => {
    expect(validateRemarks('a'.repeat(501))).toContain('500');
  });
});

describe('Inspection', () => {
  let component: Inspection;
  let fixture: ComponentFixture<Inspection>;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    signInAs('approver');
    await TestBed.configureTestingModule({
      imports: [Inspection],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ applicationNo: '55' }) } } }
      ]
    })
    .compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Inspection);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(DOCS).flush([]); // saved inspection photos
  });

  it('should create', () => {
    http.expectOne(APPROVER_LIST).flush({ totalRecords: 0, data: [] });
    expect(component).toBeTruthy();
  });

  it('has no mock checklist or no-op "Save Draft" button', () => {
    http.expectOne(APPROVER_LIST).flush({ totalRecords: 0, data: [] });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Inspection Checklist');
    expect(text).not.toContain('Save Draft');
  });

  it('shows a not-in-queue state and hides the actions when the application is not returned', () => {
    const notify = vi.spyOn(TestBed.inject(NotificationService), 'show');
    http.expectOne(APPROVER_LIST).flush({ totalRecords: 0, data: [] });
    fixture.detectChanges();
    expect(component.applicationNotFound).toBe(true);
    expect(notify).toHaveBeenCalledWith('This application is not in your queue.', 'warning');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('could not be loaded from your queue');
    expect(text).not.toContain('Forward To Higher Authority');
  });

  describe('with the application loaded', () => {
    beforeEach(() => {
      http.expectOne(APPROVER_LIST).flush({
        totalRecords: 1,
        data: [{ licenceApplicationID: 55, licenceApplicationStatusID: 2, applicationNumber: 'APP-55' }]
      });
      // follow-up loads (location, documents, timeline, full-details panel) stay pending: not under test
      fixture.detectChanges();
    });

    it('blocks remarks the API would reject before calling it', () => {
      const notify = vi.spyOn(TestBed.inject(NotificationService), 'show');
      component.remarks = 'Checked 12/03';
      component.submitProcessAction(7);
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('only contain'), 'warning');
      http.expectNone(SUBMIT);
    });

    it('submits once even when clicked twice, and shows a plain-text API error', async () => {
      const notify = vi.spyOn(TestBed.inject(NotificationService), 'show');
      component.remarks = 'Site verified';
      component.submitProcessAction(7);
      component.submitProcessAction(7);
      expect(component.isSubmitting).toBe(true);
      await Promise.resolve(); // photo-upload promise (no photos)
      await Promise.resolve();
      const reqs = http.match(SUBMIT);
      expect(reqs.length).toBe(1);
      expect(reqs[0].request.body).toEqual(expect.objectContaining({
        licenceApplicationID: 55, licenceProcessID: 7, currentStatus: 2, remarks: 'Site verified'
      }));
      reqs[0].flush('Invalid Remarks', { status: 400, statusText: 'Bad Request' });
      expect(component.isSubmitting).toBe(false);
      expect(notify).toHaveBeenCalledWith('Invalid Remarks', 'error');
    });
  });
});
