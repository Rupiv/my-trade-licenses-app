import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { ReportsDashboard } from './reports-dashboard';
import { isDeclaredRoute } from '../../testing/portal-test-utils';

describe('ReportsDashboard', () => {
  let component: ReportsDashboard;
  let fixture: ComponentFixture<ReportsDashboard>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsDashboard],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsDashboard);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens each report under the current section, on a declared route', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/approver/reports');
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.onControlSheetClick();
    component.onWardWiseLicensesClick();
    component.onApplicationWiseLicensesClick();
    component.onRevenueCollectionClick();
    const urls = nav.mock.calls.map(c => (c[0] as string[])[0]);
    expect(urls).toEqual([
      '/approver/reports/control-sheet',
      '/approver/reports/ward-wise-licenses',
      '/approver/reports/application-wise-licenses',
      '/approver/reports/revenue-collection'
    ]);
    urls.forEach(u => expect(isDeclaredRoute(u)).toBe(true));
    expect(component.isAdminSection).toBe(false);
  });
});
