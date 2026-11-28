import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RenewalStatus } from './renewal-status';
import { isDeclaredRoute } from '../../testing/portal-test-utils';

describe('RenewalStatus', () => {
  let component: RenewalStatus;
  let fixture: ComponentFixture<RenewalStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenewalStatus],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RenewalStatus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not show a sample renewal timeline as if it were real', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Provisionally Renewed');
    expect(el.textContent).not.toContain('Payment Completed');
    for (const a of Array.from(el.querySelectorAll('a[href]'))) {
      expect(isDeclaredRoute(a.getAttribute('href')!)).toBe(true);
    }
  });
});
