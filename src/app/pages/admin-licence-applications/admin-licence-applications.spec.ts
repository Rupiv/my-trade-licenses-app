import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AdminLicenceApplications } from './admin-licence-applications';
import { ensureWebStorage } from '../../testing/portal-test-utils';

const row = (id: number, status: string) => ({
  licenceApplicationID: id,
  applicationNumber: `APP-${id}`,
  licenceApplicationStatusName: status
});

describe('AdminLicenceApplications', () => {
  let component: AdminLicenceApplications;
  let fixture: ComponentFixture<AdminLicenceApplications>;
  let http: HttpTestingController;

  beforeEach(async () => {
    ensureWebStorage();
    await TestBed.configureTestingModule({
      imports: [AdminLicenceApplications],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminLicenceApplications);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  function flushList(): void {
    http.expectOne((r) => r.url === '/api/api/trade-licence/admin/applications').flush({
      totalRecords: 25,
      pageNumber: 1,
      pageSize: 10,
      data: [row(1, 'Approved'), row(2, 'Rejected'), row(3, 'Approved')]
    });
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('status filter narrows the loaded page without losing rows or the server paging', () => {
    flushList();
    const base = { corporationId: null, zoneId: null, mohId: null, wardId: null };

    component.onFiltersChanged({ ...base, status: 'Approved' });
    expect(component.applications.map((a) => a.licenceApplicationID)).toEqual([1, 3]);
    expect(component.totalRecords).toBe(25);

    // Switching to another status used to filter the already-filtered list (always empty)
    component.onFiltersChanged({ ...base, status: 'Rejected' });
    expect(component.applications.map((a) => a.licenceApplicationID)).toEqual([2]);

    // Clearing used to leave the list filtered
    component.onFiltersChanged({ ...base, status: '' });
    expect(component.applications.length).toBe(3);
    expect(component.totalRecords).toBe(25);
  });

  it('keeps a status from the dashboard link selectable using the server spelling', () => {
    // as read from ?status=APPROVED; the initial load is still pending
    component.selectedStatus = 'APPROVED';
    flushList();
    expect(component.selectedStatus).toBe('Approved');
    expect(component.statusOptions).toContain('Approved');
    expect(component.applications.length).toBe(2);
    expect(component.isStatusFilterPageOnly).toBe(true);
  });
});
