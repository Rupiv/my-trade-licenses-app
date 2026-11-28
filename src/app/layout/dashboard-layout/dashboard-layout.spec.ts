import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DashboardLayout } from './dashboard-layout';
import { isDeclaredRoute, signInAs, signOutAll } from '../../testing/portal-test-utils';

describe('DashboardLayout', () => {
  let component: DashboardLayout;
  let fixture: ComponentFixture<DashboardLayout>;
  let el: HTMLElement;

  async function render(role: string): Promise<void> {
    signInAs(role);
    await TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardLayout);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const menuHrefs = () =>
    Array.from(el.querySelectorAll('.sidebar a[href]')).map((a) => a.getAttribute('href') ?? '');

  beforeEach(() => signOutAll());
  afterEach(() => signOutAll());

  it('should create', async () => {
    await render('TRADE_OWNER');
    expect(component).toBeTruthy();
  });

  it.each([
    ['admin', 'Admin Portal'],
    ['approver', 'Health Supervisor Portal'],
    ['seniorapprover', 'Health Officer Portal'],
    ['zoneapprover', 'Medical Officer of Health Portal'],
    ['healthsupervisor', 'Health Supervisor Portal'],
    ['healthofficer', 'Health Officer Portal'],
    ['medicalofficerofhealth', 'Medical Officer of Health Portal'],
    ['TRADE_OWNER', 'Trader Portal'],
  ])('shows the portal name for %s', async (role, subtitle) => {
    await render(role);
    expect(el.querySelector('.subtitle')?.textContent?.trim()).toBe(subtitle);
  });

  it.each(['admin', 'approver', 'seniorapprover', 'zoneapprover', 'TRADE_OWNER'])(
    'every %s menu link points to a declared route',
    async (role) => {
      await render(role);
      // open the admin workflow group so its links are rendered too
      if (role === 'admin') {
        component.toggleWorkflowMenu();
        fixture.detectChanges();
        await fixture.whenStable();
      }
      const hrefs = menuHrefs();
      expect(hrefs.length).toBeGreaterThan(2);
      for (const href of hrefs) {
        expect(isDeclaredRoute(href), `dead link: ${href}`).toBe(true);
      }
    }
  );

  it('gives traders a Track Application entry', async () => {
    await render('TRADE_OWNER');
    expect(menuHrefs()).toContain('/trader/track-application');
  });

  it('shows no invented notifications', async () => {
    await render('TRADE_OWNER');
    expect(el.textContent).not.toContain('#1141184');
    expect(el.querySelector('.notification-dropdown, .notification-wrapper')).toBeNull();
  });

  it('hamburger opens the drawer on mobile and collapses the sidebar on desktop', async () => {
    await render('TRADE_OWNER');
    const sidebar = el.querySelector('.sidebar')!;

    component.isMobile.set(false);
    component.toggleSidebar();
    fixture.detectChanges();
    expect(sidebar.classList).toContain('collapsed');

    component.isMobile.set(true);
    component.toggleSidebar();
    fixture.detectChanges();
    expect(sidebar.classList).toContain('mobile-open');
    expect(sidebar.classList).not.toContain('collapsed');
    expect(el.querySelector('.sidebar-backdrop')).not.toBeNull();

    component.closeMobileMenu();
    fixture.detectChanges();
    expect(sidebar.classList).not.toContain('mobile-open');
  });

  it('signs out', async () => {
    await render('TRADE_OWNER');
    el.querySelector<HTMLButtonElement>('.signout-btn')!.click();
    expect(localStorage.getItem('access_token')).toBeNull();
  });
});
