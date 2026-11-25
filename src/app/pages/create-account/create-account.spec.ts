import { EMPTY } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

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

  it('never sends the placeholder token when the widget gives no token; sends the user to login', () => {
    const auth = TestBed.inject(AuthService);
    const login = vi.spyOn(auth, 'userlogin');
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.onCaptchaResolved(null);
    expect(login).not.toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith(['/login']);
  });
});
