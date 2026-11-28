import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ApplicationWiseLicenses } from './application-wise-licenses';

describe('ApplicationWiseLicenses', () => {
  let component: ApplicationWiseLicenses;
  let fixture: ComponentFixture<ApplicationWiseLicenses>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationWiseLicenses],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationWiseLicenses);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  const list = (p: number, totalRecords: number, rows: any[] = []) =>
    ({ totalRecords, pageNumber: p, pageSize: 100, totalPages: Math.ceil(totalRecords / 100), data: rows });

  const flushInitial = () => {
    http.expectOne(r => r.url.endsWith('/gba/corporations')).flush([{ corporationID: 1, corporationName: 'North' }]);
    http.expectOne(r => r.url.endsWith('/bbmp-zones')).flush([{ zoneID: 5, zoneName: 'East' }, { zoneID: 6, zoneName: 'West' }]);
    http.expectOne(r => r.url.endsWith('/bbmp-wards')).flush([
      { wardID: 50, wardName: 'Ward A', zoneID: 5 },
      { wardID: 60, wardName: 'Ward B', zoneID: 6 }
    ]);
    http.expectOne(r => r.url.endsWith('/admin/applications')).flush(list(1, 0));
    http.expectOne(r => r.url.endsWith('/admin/dashboard')).flush({ dashboard: { Approved: 4, Forwarded: 2, Inspected: 1 } });
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows real status counts from the dashboard API, not counts of the current page', () => {
    flushInitial();
    expect(component.statusSummary.map(s => s.count)).toEqual([0, 4, 2, 1]);
    expect(component.startRecord).toBe(0);
  });

  it('sends corporation, zone and ward ids (not the ward name)', () => {
    flushInitial();
    component.filters.corporationId = 1;
    component.onCorporationChange();
    http.expectOne(r => r.url.endsWith('/admin/applications') && r.params.get('corporationId') === '1').flush(list(1, 0));
    http.expectOne(r => r.url.endsWith('/admin/dashboard')).flush({ dashboard: {} });

    component.filters.zoneId = 5;
    component.onZoneChange();
    expect(component.wards).toEqual([{ id: 50, name: 'Ward A' }]);
    http.expectOne(r => r.url.endsWith('/admin/applications')).flush(list(1, 0));
    http.expectOne(r => r.url.endsWith('/admin/dashboard')).flush({ dashboard: {} });

    component.filters.wardId = 50;
    component.onWardChange();
    const req = http.expectOne(r => r.url.endsWith('/admin/applications'));
    expect(req.request.params.get('wardId')).toBe('50');
    expect(req.request.params.get('zoneId')).toBe('5');
    req.flush(list(1, 0));
    http.expectOne(r => r.url.endsWith('/admin/dashboard')).flush({ dashboard: {} });
  });

  it('fetches every page (API caps pageSize at 100) for export', () => {
    flushInitial();
    let rows: any[] = [];
    component.fetchAllData().subscribe(d => rows = d);
    const first = http.expectOne(r => r.url.endsWith('/admin/applications') && r.params.get('pageNumber') === '1');
    expect(first.request.params.get('pageSize')).toBe('100');
    first.flush(list(1, 250, [{ applicationNumber: 'A1' }]));
    http.expectOne(r => r.params.get('pageNumber') === '2').flush(list(2, 250, [{ applicationNumber: 'A2' }]));
    http.expectOne(r => r.params.get('pageNumber') === '3').flush(list(3, 250, [{ applicationNumber: 'A3' }]));
    expect(rows.map(r => r.applicationNumber)).toEqual(['A1', 'A2', 'A3']);
  });
});
