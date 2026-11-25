import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BusinessOwner } from './business-owner';

describe('BusinessOwner', () => {
  let component: BusinessOwner;
  let fixture: ComponentFixture<BusinessOwner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessOwner],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessOwner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
