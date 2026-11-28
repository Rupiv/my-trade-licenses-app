import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { LicenceCertificate } from './licence-certificate';

describe('LicenceCertificate', () => {
  let component: LicenceCertificate;
  let fixture: ComponentFixture<LicenceCertificate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LicenceCertificate],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LicenceCertificate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not offer Print / Download / Save when the certificate could not be loaded', () => {
    component.ngOnInit(); // no route param -> invalid id
    fixture.detectChanges();
    expect(component.errorMessage).toBe('Invalid application id.');
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.page-actions button'))
      .filter((b) => /Print|Download/.test(b.textContent ?? '')) as HTMLButtonElement[];
    expect(buttons.length).toBe(2);
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });
});
