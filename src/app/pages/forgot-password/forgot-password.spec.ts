import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ForgotPasswordComponent as ForgotPassword } from './forgot-password';

describe('ForgotPassword', () => {
  let component: ForgotPassword;
  let fixture: ComponentFixture<ForgotPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('runs the full reset flow against the API and blocks double submits', () => {
    const http = TestBed.inject(HttpTestingController);

    component.username = 'officer1';
    component.sendOtp();
    component.sendOtp(); // ignored while in flight
    http.expectOne('/api/api/Auth/forgot-password/send-otp').flush({ message: 'OTP sent', mobileNo: 'XXXXXX3210' });
    expect(component.currentStep).toBe(2);
    expect(component.maskedMobile).toBe('XXXXXX3210');
    expect(component.resendCooldown()).toBe(30);

    component.otpDigits = ['1', '2', '3', '4', '5', '6'];
    component.verifyOtp();
    http.expectOne('/api/api/Auth/forgot-password/verify-otp').flush({ isValid: true, resetToken: 'rt' });
    expect(component.currentStep).toBe(3);

    component.newPassword = 'NewPass123';
    component.confirmPassword = 'Mismatch123';
    component.resetPassword();
    expect(component.otpError).toBe('Passwords do not match.');
    http.expectNone('/api/api/Auth/forgot-password/reset-password');

    component.confirmPassword = 'NewPass123';
    component.resetPassword();
    const reset = http.expectOne('/api/api/Auth/forgot-password/reset-password');
    expect(reset.request.body).toEqual({ login: 'officer1', newPassword: 'NewPass123', resetToken: 'rt' });
    reset.flush({ message: 'Password reset successfully' });
    expect(component.currentStep).toBe(4);
  });

  it('shows the API message when the username is unknown', () => {
    const http = TestBed.inject(HttpTestingController);
    component.username = 'nobody';
    component.sendOtp();
    http.expectOne('/api/api/Auth/forgot-password/send-otp')
      .flush({ message: 'User not found' }, { status: 400, statusText: 'Bad Request' });
    expect(component.sendOtpError).toBe('User not found');
    expect(component.isLoading).toBe(false);
    expect(component.currentStep).toBe(1);
  });

  it('counts the resend cooldown down', () => {
    vi.useFakeTimers();
    try {
      (component as any).startResendCooldown(3);
      vi.advanceTimersByTime(2000);
      expect(component.resendCooldown()).toBe(1);
      vi.advanceTimersByTime(1000);
      expect(component.resendCooldown()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
