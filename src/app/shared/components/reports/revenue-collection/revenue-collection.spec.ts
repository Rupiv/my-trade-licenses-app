import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RevenueCollection } from './revenue-collection';

describe('RevenueCollection', () => {
  let component: RevenueCollection;
  let fixture: ComponentFixture<RevenueCollection>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevenueCollection],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RevenueCollection);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  const initial = () => {
    http.expectOne(r => r.url.endsWith('/gba/corporations')).flush([{ corporationID: 2, corporationName: 'East City' }]);
    return http.expectOne(r => r.url.includes('reports/revenue-collection'));
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('maps rows in either casing and shows corporation names', () => {
    initial().flush({
      summary: { totalDemand: 100, totalCollected: 60, pendingAmount: 40, totalTransactions: 3 },
      corporationSummary: [{ CorporationId: 2, Demand: 100, Collected: 60, Pending: 40, CollectionPercent: 60 }]
    });
    expect(component.summary?.TotalCollected).toBe(60);
    expect(component.corporationName(component.table[0].CorporationId)).toBe('East City');
  });

  it('sends corporation and date range to the API on Apply', () => {
    initial().flush({ summary: null, corporationSummary: [] });
    component.selectedCorporationId = 2;
    component.fromDate = '2025-04-01';
    component.toDate = '2025-06-30';
    component.applyFilter();
    const req = http.expectOne(r => r.url.includes('reports/revenue-collection'));
    expect(req.request.params.get('corporationId')).toBe('2');
    expect(req.request.params.get('fromDate')).toBe('2025-04-01');
    expect(req.request.params.get('toDate')).toBe('2025-06-30');
    req.flush({ summary: null, corporationSummary: [] });
  });

  it('refuses a from-date after the to-date without calling the API', () => {
    initial().flush({ summary: null, corporationSummary: [] });
    component.fromDate = '2025-07-01';
    component.toDate = '2025-06-30';
    component.applyFilter();
    http.expectNone(r => r.url.includes('reports/revenue-collection'));
    expect(component.filterError).toContain('From date');
  });
});
