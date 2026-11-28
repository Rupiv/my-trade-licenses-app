import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminLicenceApplicationDetails } from './admin-licence-application-details';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { ensureWebStorage, signInAs, signOutAll } from '../../testing/portal-test-utils';

describe('AdminLicenceApplicationDetails', () => {
  let component: AdminLicenceApplicationDetails;
  let fixture: ComponentFixture<AdminLicenceApplicationDetails>;
  let http: HttpTestingController;

  async function setup(role: string): Promise<void> {
    ensureWebStorage();
    signInAs(role);
    await TestBed.configureTestingModule({
      imports: [AdminLicenceApplicationDetails],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ licenceApplicationId: '55' }) } } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLicenceApplicationDetails);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    component.ngOnInit();
  }

  const appUrl = '/api/api/trade-licence/admin/applications';
  const timelineUrl = '/api/api/master/licence-process/application/55/timeline';
  const details = (statusId: number, status: string) => ({
    data: [{ licenceApplicationID: 55, applicationNumber: 'APP-55', licenceApplicationStatusID: statusId, licenceApplicationStatusName: status }]
  });

  afterEach(() => signOutAll());

  it('should create', async () => {
    await setup('admin');
    expect(component).toBeTruthy();
  });

  it('rejects remarks the API would refuse, without calling it', async () => {
    await setup('zoneapprover');
    http.expectOne((r) => r.url === appUrl).flush(details(7, 'Inspected'));
    const notify = vi.spyOn(TestBed.inject(NotificationService), 'show');

    component.remarks = 'Looks <ok>';
    component.submitAdminAction(6, 'Forwarded');
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('may only contain'), 'warning');

    component.remarks = 'x'.repeat(501);
    component.submitAdminAction(6, 'Forwarded');
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('500'), 'warning');

    expect(http.match((r) => r.url.endsWith('/submit-action')).length).toBe(0);
  });

  it('reloads status and timeline after a successful action', async () => {
    await setup('zoneapprover');
    http.expectOne((r) => r.url === appUrl).flush(details(7, 'Inspected'));
    http.expectOne(timelineUrl).flush([]);

    component.remarks = 'Site verified, forwarding.';
    component.submitAdminAction(6, 'Forwarded');
    const submit = http.expectOne((r) => r.url.endsWith('/master/licence-process/submit-action'));
    expect(submit.request.body.remarks).toBe('Site verified, forwarding.');
    expect(submit.request.body.licenceApplicationID).toBe(55);
    submit.flush({ Success: 1 });

    expect(component.remarks).toBe('');
    http.expectOne((r) => r.url === appUrl).flush(details(6, 'Forwarded'));
    http.expectOne(timelineUrl).flush([{ licenceProcessName: 'Forwarded' }]);
    expect(component.details?.licenceApplicationStatusName).toBe('Forwarded');
    expect(component.timeline.length).toBe(1);
  });
});
