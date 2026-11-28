import { EMPTY, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationService } from '../../shared/components/notification/notification.service';

import { CreateAccount } from './create-account';

describe('CreateAccount', () => {
  let component: CreateAccount;
  let fixture: ComponentFixture<CreateAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateAccount],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateAccount);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('logs in after registration with the token from the CAPTCHA widget', () => {
    const auth = TestBed.inject(AuthService);
    const login = vi.spyOn(auth, 'userlogin').mockReturnValue(EMPTY);
    component.registerModel.mobileNumber = '9876543210';
    (component as any).otpToken = 'otp-proof';
    component.onCaptchaResolved('widget-token');
    expect(login).toHaveBeenCalledTimes(1);
    const payload = login.mock.calls[0][0];
    expect(payload.captchaToken).toBe('widget-token');
    expect(payload.otpToken).toBe('otp-proof');
    expect(payload.mobileNumber).toBe('9876543210');
  });

  describe('validation and OTP gating', () => {
    let http: HttpTestingController;
    let toasts: string[];

    beforeEach(() => {
      http = TestBed.inject(HttpTestingController);
      toasts = [];
      vi.spyOn(TestBed.inject(NotificationService), 'show').mockImplementation((m: string) => { toasts.push(m); });
      component.registerModel = { fullName: 'Asha Rao', emailID: 'asha@example.com', mobileNumber: '9876543210' };
    });

    it('rejects a malformed email before sending an OTP', () => {
      component.registerModel.emailID = 'asha@';
      component.onClicksendOTP();
      expect(toasts.at(-1)).toBe('Please enter a valid email address');
      http.expectNone(() => true);
    });

    it('does not announce the OTP as verified until the API confirms it', () => {
      component.otp = '123456';
      component.onOtpInput(null);
      expect(toasts).not.toContain('OTP is verified!');
      http.expectOne((r) => r.url.includes('otp/verify')).flush({ isValid: false });
      expect(toasts.at(-1)).toBe('Invalid OTP');
      expect(component.isOtpVerified).toBe(false);
    });

    it('blocks registration while the OTP is unverified, even after 6 digits are typed', () => {
      component.otp = '123456';
      component.onOtpInput(null); // verification request still in flight
      component.onRegister();
      expect(toasts.at(-1)).toContain('wait while your OTP is verified');
      http.expectNone((r) => r.url.includes('/Auth/register'));
    });

    it('registers once the OTP is verified and shows the duplicate-number message from the API', () => {
      (component as any).otpToken = 'otp-proof';
      component.onRegister();
      component.onRegister(); // second click while in flight is ignored
      http.expectOne((r) => r.url.includes('/Auth/register'))
        .flush({ message: 'Mobile number already registered' }, { status: 409, statusText: 'Conflict' });
      expect(toasts.at(-1)).toBe('Mobile number already registered');
      expect(component.isRegistering).toBe(false);
    });

    it('changing the mobile number discards the earlier OTP verification', () => {
      (component as any).otpToken = 'otp-proof';
      component.registerModel.mobileNumber = '9123456789';
      component.onPhoneInput();
      expect(component.isOtpVerified).toBe(false);
    });
  });

  it('sends the user to the OTP login if the automatic sign-in after registration fails', () => {
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(AuthService), 'userlogin').mockReturnValue(throwError(() => new Error('401')));
    component.onCaptchaResolved('widget-token');
    expect(nav).toHaveBeenCalledWith(['/login'], { queryParams: { mode: 'user' } });
  });

  it('never sends the placeholder token when the widget gives no token; sends the user to login', () => {
    const auth = TestBed.inject(AuthService);
    const login = vi.spyOn(auth, 'userlogin');
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.onCaptchaResolved(null);
    expect(login).not.toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith(['/login']);
  });
});
