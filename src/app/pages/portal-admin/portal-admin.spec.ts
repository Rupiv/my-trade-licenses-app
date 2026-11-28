import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PortalAdmin } from './portal-admin';
import { ensureWebStorage, signInAs, signOutAll } from '../../testing/portal-test-utils';

describe('PortalAdmin', () => {
  let component: PortalAdmin;
  let fixture: ComponentFixture<PortalAdmin>;
  let http: HttpTestingController;

  beforeEach(async () => {
    ensureWebStorage();
    signInAs('admin');
    await TestBed.configureTestingModule({
      imports: [PortalAdmin],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PortalAdmin);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => signOutAll());

  it('should create', () => {
    expect(component).toBeTruthy();
    http.match(() => true);
  });

  it('shows a dash (not a fake 0) until the dashboard API answers, then the real counts', () => {
    const req = http.expectOne((r) => r.url === '/api/api/trade-licence/admin/dashboard');
    fixture.detectChanges();
    expect(component.formatNumber(component.dashboard.Approved)).toBe('—');
    expect(component.lastUpdated).toBeNull();

    req.flush({ role: 'Admin', dashboard: { Entered: 1, Applied: 2, Approved: 1234, Rejected: 0, Objection: 0, Forwarded: 0, Inspected: 0, GrandTotal: 1237 } });
    fixture.detectChanges();

    expect(component.hasLoaded).toBe(true);
    expect(component.formatNumber(component.dashboard.Approved)).toBe('1,234');
    expect(component.lastUpdated).not.toBeNull();
  });

  it('shows the error state when the dashboard fails', () => {
    http.expectOne((r) => r.url === '/api/api/trade-licence/admin/dashboard')
      .flush({ message: 'x' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(component.loadError).toContain('unavailable');
    expect(component.hasLoaded).toBe(false);
  });
});
