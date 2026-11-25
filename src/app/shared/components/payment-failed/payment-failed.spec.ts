import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PaymentFailed } from './payment-failed';

describe('PaymentFailed', () => {
  let component: PaymentFailed;
  let fixture: ComponentFixture<PaymentFailed>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentFailed],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentFailed);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
