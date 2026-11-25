import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ApplicationWiseLicenses } from './application-wise-licenses';

describe('ApplicationWiseLicenses', () => {
  let component: ApplicationWiseLicenses;
  let fixture: ComponentFixture<ApplicationWiseLicenses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationWiseLicenses],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationWiseLicenses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
