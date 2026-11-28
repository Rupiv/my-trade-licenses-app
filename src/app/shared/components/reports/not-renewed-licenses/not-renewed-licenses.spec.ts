import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NotRenewedLicenses } from './not-renewed-licenses';

describe('NotRenewedLicenses', () => {
  let component: NotRenewedLicenses;
  let fixture: ComponentFixture<NotRenewedLicenses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotRenewedLicenses],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotRenewedLicenses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows no sample rows or totals (no API provides this report)', () => {
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('not available yet');
    expect(text).not.toContain('TL-2021-00452');
    expect(text).not.toContain('428');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });
});
