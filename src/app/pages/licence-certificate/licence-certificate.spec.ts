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
});
