import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationService } from '../../shared/components/notification/notification.service';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  async function create(queryParams: Record<string, string> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  it('should create', async () => {
    await create();
    expect(component).toBeTruthy();
  });

  it('opens the password login by default', async () => {
    await create();
    expect(component.isUserLogin).toBe(false);
  });

  it('opens the OTP (user) login for ?mode=user from the Home page trader portal', async () => {
    await create({ mode: 'user', returnUrl: '/trader/track-application' });
    expect(component.isUserLogin).toBe(true);
  });

  describe('OTP login validation', () => {
    let http: HttpTestingController;
    let toasts: string[];

    beforeEach(async () => {
      await create({ mode: 'user' });
      http = TestBed.inject(HttpTestingController);
      toasts = [];
      vi.spyOn(TestBed.inject(NotificationService), 'show').mockImplementation((m: string) => { toasts.push(m); });
    });

    it('rejects an invalid mobile number without calling the API', () => {
      component.mobileNumber = '12345';
      component.onSubmit();
      expect(toasts.at(-1)).toContain('valid 10-digit');
      http.expectNone(() => true);
    });

    it('requires a verified OTP before calling login-user', () => {
      component.mobileNumber = '9876543210';
      component.onSubmit();
      expect(toasts.at(-1)).toContain('Send OTP');
      http.expectNone((r) => r.url.includes('login-user'));
    });

    it('re-enables sending an OTP when the send fails, and shows the server message', () => {
      component.mobileNumber = '9876543210';
      component.onClicksendOTP();
      expect(component.isOtpLoading()).toBe(true);
      http.expectOne((r) => r.url.includes('otp/send'))
        .flush({ error: 'Too many OTP requests' }, { status: 429, statusText: 'Too Many Requests' });
      expect(component.isOtpLoading()).toBe(false);
      expect(toasts.at(-1)).toBe('Too many OTP requests');
    });

    it('changing the mobile number clears a previous OTP verification', () => {
      component.mobileNumber = '98765abc43210999';
      component.otp = '123456';
      component.isVerifyingOtp = true;
      component.onMobileNumberChange();
      expect(component.mobileNumber).toBe('9876543210');
      expect(component.otp).toBe('');
      expect(component.isVerifyingOtp).toBe(false);
    });
  });

  it('shows the API error text for a rejected password login and allows retrying', async () => {
    await create();
    const http = TestBed.inject(HttpTestingController);
    const toasts: string[] = [];
    vi.spyOn(TestBed.inject(NotificationService), 'show').mockImplementation((m: string) => { toasts.push(m); });

    component.email = 'officer';
    component.password = 'wrong';
    component.onSubmit();
    expect(component.isSubmitting).toBe(true);
    component.onSubmit(); // double submit is ignored
    const req = http.expectOne((r) => r.url.endsWith('/Auth/login'));
    req.flush({ error: 'Account locked' }, { status: 401, statusText: 'Unauthorized' });

    expect(toasts.at(-1)).toBe('Account locked');
    expect(component.isSubmitting).toBe(false);
  });
});
