import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RecaptchaComponent, RecaptchaModule } from 'ng-recaptcha';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CreateAccountService } from './create-account.service';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { environment } from '../../../environments/environment';
import { normalizeRole } from '../../core/utils/role-home';


@Component({
  selector: 'app-create-account',
  imports: [CommonModule, FormsModule, RouterModule, RecaptchaModule],
  templateUrl: './create-account.html',
  styleUrl: './create-account.css',
})
export class CreateAccount {
  // Same invisible reCAPTCHA as the login page: the automatic login after registration needs a real
  // token (the API no longer accepts a placeholder outside development).
  @ViewChild(RecaptchaComponent) recaptcha?: RecaptchaComponent;
  readonly captchaSiteKey = environment.recaptchaSiteKey;
  readonly captchaEnabled = environment.captchaEnabled;
   registerModel = {
    fullName: '',
    emailID: '',
    mobileNumber: '',
  };
  
  otp: string = '';
  /** True while registration (and the login after it) is in flight. */
  isRegistering = false;
  isVerifyingOtp = false;
  isotpSent = false;
  isOtpLoading = signal(false);
  otpCooldown = signal(20);
  otpTimer: any;
  otpSub?: Subscription;

   constructor(private router: Router, private createAccountService: CreateAccountService, 
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private tokenService: TokenService) {}
   ngOnInit(): void {
    this.isotpSent = false;
  }
  onPhoneInput() {
    this.registerModel.mobileNumber =
    this.registerModel.mobileNumber.replace(/\D/g, '');

    if (this.registerModel.mobileNumber.length > 10) {
      this.registerModel.mobileNumber =
        this.registerModel.mobileNumber.substring(0, 10);
    }

    this.isotpSent = false;
    this.isVerifyingOtp = false;
    this.otp = '';
    this.otpToken = ''; // a verification belongs to the previous number
  }

  /** Field checks shared by Send OTP and Create Account; returns the first problem, or ''. */
  validateDetails(): string {
    const { fullName, emailID, mobileNumber } = this.registerModel;
    if (!fullName.trim()) return 'Please enter full name';
    if (!emailID.trim()) return 'Please enter email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailID.trim())) return 'Please enter a valid email address';
    if (!mobileNumber) return 'Please enter phone number';
    if (!this.isValidPhone()) return 'Please enter a valid 10-digit mobile number';
    return '';
  }

  onClicksendOTP() {
    const problem = this.validateDetails();
    if (problem) {
      this.notificationService.show(problem, 'warning');
      return;
    }

    //start 20 sec cooldown
    this.startOtpCooldown();

    this.createAccountService.sendOtp(this.registerModel.mobileNumber).subscribe({
      next: (res) => {
        this.isotpSent = true;
        this.isVerifyingOtp = false;
        this.notificationService.show(
          res?.Message || 'OTP sent successfully',
          'success'
        );
      },
      error: (err: HttpErrorResponse) => {
        // let the user retry straight away instead of waiting out the cooldown
        this.stopOtpCooldown();
        this.notificationService.show(this.serverMessage(err) || 'Failed to send OTP', 'error');
      }
    });
  }

  /**20 second cooldown logic */
  startOtpCooldown() {
    this.stopOtpCooldown();
    this.isOtpLoading.set(true);
    this.otpCooldown.set(20);

    this.otpTimer = setInterval(() => {
      this.otpCooldown.update(v => v - 1);

      if (this.otpCooldown() <= 0) {
        this.stopOtpCooldown();
      }
    }, 1000);
  }

  private stopOtpCooldown() {
    if (this.otpTimer) {
      clearInterval(this.otpTimer);
      this.otpTimer = null;
    }
    this.isOtpLoading.set(false);
  }

  ngOnDestroy() {
    this.stopOtpCooldown();
    this.otpSub?.unsubscribe();
  }

  isValidPhone(): boolean {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(this.registerModel.mobileNumber);
  }

  /** One-time proof from otp/verify; login-user requires it for this mobile number. */
  private otpToken = '';

  /** True once otp/verify accepted the OTP for the current mobile number. */
  get isOtpVerified(): boolean {
    return !!this.otpToken;
  }

  verifyOtpAutomatically() {
    this.createAccountService
    .verifyOtp(this.registerModel.mobileNumber, this.otp)
    .subscribe({
      next: (res) => {
        if (res.isValid) {
          this.otpToken = res.otpToken ?? '';
          this.notificationService.show(
            'OTP is Verified.',
            'success'
          );
        } else {
          this.otpToken = '';
          this.isVerifyingOtp = false;
          this.notificationService.show(
            'Invalid OTP',
            'error'
          );
          this.otp = '';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.otpToken = '';
        this.isVerifyingOtp = false;
        this.otp = '';
        this.notificationService.show(this.serverMessage(err) || 'OTP verification failed', 'error');
      }
    });
  }

  onRegister() {
    if (this.isRegistering) {
      return;
    }
    const problem = this.validateDetails();
    if (problem) {
      this.notificationService.show(problem, 'warning');
      return;
    }
    if (!this.isOtpVerified) {
      this.notificationService.show(
        this.isVerifyingOtp ? 'Please wait while your OTP is verified.' : 'Please verify OTP before registering.',
        'warning'
      );
      return;
    }

    this.isRegistering = true;
    const payload = {
      fullName: this.registerModel.fullName.trim(),
      emailID: this.registerModel.emailID.trim(),
      mobileNumber: this.registerModel.mobileNumber,
    };
    this.createAccountService.post<any>('/Auth/register', payload).subscribe({
      next: (res) => {
        this.setUsrToken();
        this.notificationService.show(
          res?.message || res?.Message || 'Account created successfully!',
          'success'
        );
      },
      error: (err: HttpErrorResponse) => {
        this.isRegistering = false;
        // Duplicate mobile / email comes back as 409 { message }
        this.notificationService.show(this.serverMessage(err) || 'Something went wrong. Please try again.', 'error');
      }
    });
  }

  onOtpInput(event: any) {
    // Allow digits only
    this.otp = this.otp.replace(/\D/g, '');

    // Auto verify when 6 digits entered; verifyOtpAutomatically announces the result
    if (this.otp.length === 6 && !this.isVerifyingOtp) {
      this.isVerifyingOtp = true;
      this.verifyOtpAutomatically();
    }
  }

  setUsrToken() {
    if (!this.captchaEnabled) {
      // development builds only (CAPTCHA disabled): the API accepts this only in Development
      this.loginAfterRegistration(environment.captchaToken || 'test');
      return;
    }
    this.recaptcha?.execute(); // -> onCaptchaResolved
  }

  onCaptchaResolved(token: string | null) {
    if (!token) {
      this.onCaptchaErrored();
      return;
    }
    this.loginAfterRegistration(token);
  }

  onCaptchaExpired() {
    this.isRegistering = false;
    this.notificationService.show('Captcha expired. Please log in from the login page.', 'warning');
    this.router.navigate(['/login']);
  }

  onCaptchaErrored() {
    this.isRegistering = false;
    this.notificationService.show('Account created. Please log in from the login page.', 'warning');
    this.router.navigate(['/login']);
  }

  private loginAfterRegistration(captchaToken: string) {
    const payload = {
      mobileNumber: this.registerModel.mobileNumber,
      captchaToken,
      otpToken: this.otpToken
    };
    this.otpToken = ''; // single use

    this.auth.userlogin(payload).subscribe({
      next: () => {
        this.isRegistering = false;
        const role = normalizeRole(
          this.tokenService.getEffectiveRole() || this.tokenService.getUserRole() || this.tokenService.getRole()
        );
        if (role === 'tradeowner' || role === 'trader') {
          this.router.navigate(['/trader']);
          return;
        }
        this.notificationService.show('Account created. Please log in from the login page.', 'warning');
        this.router.navigate(['/login']);
      },
      error: () => {
        // The account exists at this point; only the automatic sign-in failed.
        this.isRegistering = false;
        this.notificationService.show('Account created. Please sign in with your mobile number.', 'warning');
        this.router.navigate(['/login'], { queryParams: { mode: 'user' } });
      }
    });
  }

  private serverMessage(err: HttpErrorResponse): string {
    const body = err?.error;
    if (typeof body === 'string') return body;
    const msg = body?.message ?? body?.Message ?? body?.error ?? body?.Error;
    return typeof msg === 'string' ? msg : '';
  }
}
