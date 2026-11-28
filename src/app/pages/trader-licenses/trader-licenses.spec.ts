import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TraderLicenses } from './trader-licenses';
import { ensureWebStorage, fakeToken } from '../../testing/portal-test-utils';

describe('TraderLicenses', () => {
  let component: TraderLicenses;
  let fixture: ComponentFixture<TraderLicenses>;
  let http: HttpTestingController;

  beforeEach(async () => {
    ensureWebStorage();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('access_token', fakeToken('trader', 7));

    await TestBed.configureTestingModule({
      imports: [TraderLicenses],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TraderLicenses);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Zoneless: the app's view-refresh interceptor redraws after HTTP; in the test, mark and wait.
  async function render() {
    fixture.componentRef.changeDetectorRef.markForCheck();
    await fixture.whenStable();
  }

  const app = (over: Partial<any>) => ({
    licenceApplicationID: 1,
    applicationNumber: 'N1',
    applicationSubmitDate: '2026-01-05T00:00:00',
    licenceFromDate: '',
    licenceToDate: '',
    applicationStatus: 'APPLIED',
    currentStatus: '',
    tradeLicenceID: 11,
    applicantName: 'Applicant',
    tradeName: 'Trade',
    ...over,
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    http.match(() => true);
  });

  it('shows only real approved applications under My Licenses (no sample data)', async () => {
    http.expectOne('/api/api/trade-licence/user/7/applications').flush({
      userId: 7, fullName: 'X', mobileNumber: '', emailId: '',
      applications: [
        app({ licenceApplicationID: 1, tradeName: 'Pending Shop', applicationStatus: 'APPLIED' }),
        app({ licenceApplicationID: 2, tradeName: 'Approved Shop', applicationStatus: 'APPROVED', applicationNumber: 'N2' }),
      ],
    });
    await render();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Sharma');
    expect(el.textContent).not.toContain('MG Road');
    expect(component.approvedLicences.map((a) => a.licenceApplicationID)).toEqual([2]);

    const certButtons = Array.from(el.querySelectorAll('button')).filter((b) => b.textContent?.includes('Certificate'));
    expect(certButtons.length).toBe(1);

    const spy = vi.spyOn(component, 'downloadCertificate').mockImplementation(() => {});
    certButtons[0].click();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ licenceApplicationID: 2 }));
  });

  it('shows empty states when the trader has no applications', async () => {
    http.expectOne('/api/api/trade-licence/user/7/applications').flush({
      userId: 7, fullName: 'X', mobileNumber: '', emailId: '', applications: [],
    });
    await render();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('You have no approved licences yet.');
    expect(text).toContain('You have not applied for any licence yet.');
  });

  it('shows a retry message when loading fails', async () => {
    http.expectOne('/api/api/trade-licence/user/7/applications')
      .flush('boom', { status: 500, statusText: 'Server Error' });
    await render();

    expect(component.loading).toBe(false);
    expect(component.loadFailed).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('could not be loaded');
  });
});
