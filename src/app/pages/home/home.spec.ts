import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Home } from './home';
import { PortalSessionService } from '../../core/services/portal-session.service';
import { CORPORATION_TEMPLATES } from '../../core/config/corporation-templates.config';
import { LICENCE_DOCUMENTS, NEW_LICENCE_STEPS } from '../../core/config/licence-documents.config';
import { isDeclaredRoute, signInAs, signOutAll } from '../../testing/portal-test-utils';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let el: HTMLElement;

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    await fixture.whenStable();
    // The session is read after the first render (afterNextRender); make sure it is applied.
    TestBed.inject(PortalSessionService).refresh();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const hrefs = () =>
    Array.from(el.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') ?? '');

  beforeEach(() => signOutAll());
  afterEach(() => signOutAll());

  it('should create', async () => {
    await render();
    expect(component).toBeTruthy();
  });

  it('every in-app link points to a declared route (no dead links to the ** fallback)', async () => {
    await render();
    const internal = hrefs().filter((h) => h.startsWith('/'));
    expect(internal.length).toBeGreaterThan(10);
    for (const href of internal) {
      expect(isDeclaredRoute(href), `dead link: ${href}`).toBe(true);
    }
  });

  it('has no placeholder contact details or estimated figures', async () => {
    await render();
    const text = el.textContent ?? '';
    expect(text).not.toMatch(/XXX/);
    expect(text).not.toContain('50K+');
    expect(text).not.toContain('99.5%');
  });

  it('shows stats taken from the portal configuration', async () => {
    await render();
    const values = component.stats.map((s) => s.value);
    expect(values).toContain(String(CORPORATION_TEMPLATES.length));
    expect(values).toContain(String(NEW_LICENCE_STEPS.length));
    expect(values).toContain(String(LICENCE_DOCUMENTS.filter((d) => d.required).length));
  });

  it('sends visitors to the OTP login for trader pages, returning them afterwards', async () => {
    await render();
    expect(hrefs()).toContain('/login?mode=user&returnUrl=%2Ftrader%2Ftrack-application');
    expect(hrefs()).toContain('/login?mode=user&returnUrl=%2Ftrader%2Ftrader-licenses');
    expect(hrefs().some((h) => h.includes('renew'))).toBe(false); // no renewal API exists
    expect(hrefs()).toContain('/create-account');
    expect(el.textContent).toContain('Sign In');
    expect(el.textContent).not.toContain('My Dashboard');
  });

  it('links help resources to the Support page sections', async () => {
    await render();
    for (const section of ['guide', 'faq', 'documents', 'contact']) {
      expect(hrefs()).toContain(`/support#${section}`);
    }
  });

  it('opens trader pages directly for a signed-in trader', async () => {
    signInAs('TRADE_OWNER');
    await render();
    expect(hrefs()).toContain('/trader/track-application');
    expect(hrefs()).toContain('/trader/new-licenses');
    expect(hrefs()).toContain('/trader/trader-licenses');
    expect(el.textContent).toContain('My Dashboard');
    expect(el.textContent).toContain('Open Dashboard');
  });

  it('sends a signed-in officer to their own dashboard', async () => {
    signInAs('approver');
    await render();
    expect(component.dashboardLink()).toBe('/approver');
    expect(hrefs()).not.toContain('/trader/track-application');
  });

  it('signs out from the header', async () => {
    signInAs('TRADE_OWNER');
    await render();
    const signOut = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Sign Out'))!;
    signOut.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(el.textContent).toContain('Sign In');
  });

  it('toggles the mobile navigation menu', async () => {
    await render();
    const toggler = el.querySelector<HTMLButtonElement>('.navbar-toggler')!;
    const menu = el.querySelector('#homeNavbar')!;
    expect(menu.classList).not.toContain('show');
    toggler.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(menu.classList).toContain('show');
  });

  it('closes the disclaimer popup', async () => {
    await render();
    el.querySelector<HTMLButtonElement>('.disclaimer-popup button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('.disclaimer-popup')).toBeNull();
  });
});
