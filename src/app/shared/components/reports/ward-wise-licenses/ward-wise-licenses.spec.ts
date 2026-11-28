import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { WardWiseLicenses } from './ward-wise-licenses';

describe('WardWiseLicenses', () => {
  let component: WardWiseLicenses;
  let fixture: ComponentFixture<WardWiseLicenses>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WardWiseLicenses],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WardWiseLicenses);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders before the data arrives without a summary', () => {
    expect(component.summary).toBeNull();
    expect(component.displayedSummary).toBeNull();
  });

  it('uses the financial-year master and narrows wards / totals to the selected zone', () => {
    http.expectOne(r => r.url.endsWith('/financial-years')).flush([{ finanicalYearID: 4, financialYear: '2025-2026' }]);
    const req = http.expectOne(r => r.url.includes('reports/ward-wise-licenses'));
    expect(req.request.params.get('financialYearID')).toBe('4');
    req.flush({
      summary: { ActiveLicenses: 5, ExpiredLicenses: 1, SuspendedLicenses: 0, TotalLicenses: 6 },
      table: [
        { Zone: 'East', Ward: 'W1', Active: 2, Expired: 1, Suspended: 0, Total: 3 },
        { Zone: 'West', Ward: 'W2', Active: 3, Expired: 0, Suspended: 0, Total: 3 }
      ]
    });
    expect(component.displayedSummary?.TotalLicenses).toBe(6);

    component.selectedZone = 'East';
    component.onZoneChange();
    expect(component.wards).toEqual(['W1']);
    expect(component.filteredTable.length).toBe(1);
    expect(component.displayedSummary).toEqual({ ActiveLicenses: 2, ExpiredLicenses: 1, SuspendedLicenses: 0, TotalLicenses: 3 });

    component.resetFilters();
    expect(component.filteredTable.length).toBe(2);
  });

  it('tolerates a null summary row', () => {
    http.expectOne(r => r.url.endsWith('/financial-years')).flush([]);
    http.expectOne(r => r.url.includes('reports/ward-wise-licenses')).flush({ summary: null, table: [] });
    expect(component.summary).toBeNull();
    expect(component.filteredTable).toEqual([]);
  });
});
