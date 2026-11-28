import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Support } from './support';
import { PortalSessionService } from '../../core/services/portal-session.service';
import { LICENCE_DOCUMENTS } from '../../core/config/licence-documents.config';
import { CORPORATION_TEMPLATES } from '../../core/config/corporation-templates.config';
import { isDeclaredRoute, signInAs, signOutAll } from '../../testing/portal-test-utils';

describe('Support', () => {
  let component: Support;
  let fixture: ComponentFixture<Support>;
  let el: HTMLElement;

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Support],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(Support);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    await fixture.whenStable();
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

  it('has the sections the Home page links to', async () => {
    await render();
    for (const id of ['guide', 'documents', 'faq', 'contact']) {
      expect(el.querySelector(`#${id}`), `missing #${id}`).not.toBeNull();
    }
  });

  it('lists every licence document with its requirement', async () => {
    await render();
    const rows = el.querySelectorAll('#documents tbody tr');
    expect(rows.length).toBe(LICENCE_DOCUMENTS.length);
    expect(el.querySelectorAll('#documents .badge.bg-danger').length).toBe(
      LICENCE_DOCUMENTS.filter((d) => d.required).length
    );
  });

  it('lists every city corporation under Contact', async () => {
    await render();
    const text = el.querySelector('#contact')!.textContent ?? '';
    for (const c of CORPORATION_TEMPLATES) {
      expect(text).toContain(c.fullName);
    }
    expect(text).not.toMatch(/XXX/);
  });

  it('every in-app link points to a declared route', async () => {
    await render();
    // Open every FAQ so its action links are rendered too.
    for (let i = 0; i < component.faqs().length; i++) {
      component.toggleFaq(i);
      fixture.detectChanges();
      await fixture.whenStable();
      for (const href of hrefs().filter((h) => h.startsWith('/'))) {
        expect(isDeclaredRoute(href), `dead link: ${href}`).toBe(true);
      }
    }
  });

  it('toggles FAQ answers', async () => {
    await render();
    expect(el.querySelectorAll('.faq-answer').length).toBe(1);
    el.querySelector<HTMLButtonElement>('.faq-question')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelectorAll('.faq-answer').length).toBe(0);
  });

  it('opens trader pages directly for a signed-in trader', async () => {
    signInAs('TRADE_OWNER');
    await render();
    expect(hrefs()).toContain('/trader/track-application');
    expect(hrefs()).toContain('/trader');
  });
});
