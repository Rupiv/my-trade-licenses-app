import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RenewLicense } from './renew-license';
import { isDeclaredRoute } from '../../testing/portal-test-utils';

describe('RenewLicense', () => {
  let component: RenewLicense;
  let fixture: ComponentFixture<RenewLicense>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenewLicense],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RenewLicense);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows no sample licence data and no dead payment button', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('TL-GBA-2021-4587');
    expect(el.textContent).not.toContain('Ravi Bakery');
    expect(el.textContent).not.toContain('Proceed to Payment');
    expect(el.textContent).toContain('not available');
  });

  it('only links to declared routes', () => {
    fixture.detectChanges();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a[href]'));
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      expect(isDeclaredRoute(a.getAttribute('href')!)).toBe(true);
    }
  });
});
