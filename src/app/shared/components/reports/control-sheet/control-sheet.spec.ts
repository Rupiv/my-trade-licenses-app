import { HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from '../../notification/notification.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ControlSheet } from './control-sheet';

describe('ControlSheet', () => {
  let component: ControlSheet;
  let fixture: ComponentFixture<ControlSheet>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlSheet],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlSheet);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  const flushYears = (rows: any[] = [{ finanicalYearID: 7, financialYear: '2025-2026' }]) =>
    http.expectOne(r => r.url.endsWith('/financial-years')).flush(rows);

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('requests the selected financial year from the master instead of a fixed id', () => {
    flushYears();
    const req = http.expectOne(r => r.url.includes('reports/control-sheet'));
    expect(req.request.params.get('financialYearID')).toBe('7');
    req.flush({
      totals: { approved: 3, pending: 2, rejected: 1, totalApplications: 6 },
      statusSummary: [{ status: 'APPROVED', applicationCount: 3, percentage: 50 }]
    });
    expect(component.totals).toEqual({ Approved: 3, Pending: 2, Rejected: 1, TotalApplications: 6 });
    expect(component.statusOptions).toEqual(['APPROVED']);
    expect(component.filteredStatusSummary.length).toBe(1);
  });

  it('shows "No records found" and no totals when the procedure returns nothing', async () => {
    flushYears();
    http.expectOne(r => r.url.includes('reports/control-sheet')).flush({ totals: null, statusSummary: [] });
    // In the app an HTTP interceptor schedules change detection; the bare test client does not
    fixture.componentRef.changeDetectorRef.markForCheck();
    await fixture.whenStable();
    expect(component.totals).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No records found');
  });

  it('shows the API message when the report is refused (403 for non-admin officers)', () => {
    const notify = vi.spyOn(TestBed.inject(NotificationService), 'show');
    flushYears();
    const req = http.match(r => r.url.includes('reports/control-sheet'))[0];
    expect(req).toBeTruthy();
    req.flush({ message: 'This report is available to administrators only.' }, { status: 403, statusText: 'Forbidden' });
    expect(notify).toHaveBeenCalledWith('This report is available to administrators only.', 'warning');
  });
});
