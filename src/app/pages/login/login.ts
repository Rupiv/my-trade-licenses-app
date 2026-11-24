import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { signal } from '@angular/core';
import { LoginService } from './login.service';
import { RecaptchaComponent, RecaptchaModule } from 'ng-recaptcha';
import { environment } from '../../../environments/environment';

type LoginMode = 'admin' | 'user';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterModule, FormsModule, RecaptchaModule], //CreateAccount
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  @ViewChild(RecaptchaComponent) recaptcha?: RecaptchaComponent;

  isLogin = false;
  isUserLogin = false;
  showPassword = false;
  email = '';
  password = '';
  mobileNumber = '';

  captchaToken = '';
  captchaInProgress = false;
  pendingLoginMode: LoginMode | null = null;
  readonly captchaSiteKey = environment.recaptchaSiteKey;
  readonly captchaEnabled = environment.captchaEnabled;
  readonly captchaTestToken = environment.captchaToken;

  otp: string = '';
  isVerifyingOtp = false;
  isotpSent = false;
  isOtpLoading = signal(false);
  otpCooldown = signal(20);
  otpTimer: any;
  otpSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private tokenService: TokenService,
    private notificationService: NotificationService,
    private loginService: LoginService
  ) {}

  /** Sends a trader back to the page they were on (e.g. payment result) if the session expired there. */
  private goToTrader(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
    if (returnUrl.startsWith('/trader/')) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
    this.router.navigate(['/trader']);
  }

  private normalizeRole(role: string | null | undefined): string {
    return (role ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.captchaInProgress) {
      return;
    }

    if (this.isUserLogin) {
      if (!this.mobileNumber) {
        this.notificationService.show('Please enter mobile number', 'warning');
        return;
    }

      this.pendingLoginMode = 'user';
      this.captchaToken = this.getCaptchaToken();
      if (!this.captchaEnabled) {
        this.submitUserLogin();
        return;
      }

      this.captchaInProgress = true;
      this.recaptcha?.execute();
      return;
    }

    if (!this.email.trim()) {
      this.notificationService.show('Please enter username, phone, or email', 'warning');
      return;
    }

    if (!this.password) {
      this.notificationService.show('Please enter password', 'warning');
      return;
    }

    this.pendingLoginMode = 'admin';
    this.captchaToken = this.getCaptchaToken();
    if (!this.captchaEnabled) {
      this.submitAdminLogin();
      return;
    }

    this.captchaInProgress = true;
    this.recaptcha?.execute();
  }

  onCaptchaResolved(token: string | null) {
    this.captchaInProgress = false;

    if (!token) {
      this.captchaToken = this.getCaptchaToken();
    } else {
      this.captchaToken = token;
    }
    const loginMode = this.pendingLoginMode;
    this.pendingLoginMode = null;

    if (loginMode === 'user') {
      this.submitUserLogin();
      return;
    }

    if (loginMode === 'admin') {
      this.submitAdminLogin();
      return;
    }

    this.clearCaptchaState();
  }

  onCaptchaExpired() {
    this.clearCaptchaState();
    this.notificationService.show('Captcha expired. Please try again.', 'warning');
  }

  onCaptchaErrored() {
    this.clearCaptchaState();
    this.notificationService.show('Captcha could not be loaded. Please try again.', 'warning');
  }

  private clearCaptchaState() {
    this.captchaToken = this.getCaptchaToken();
    this.captchaInProgress = false;
    this.pendingLoginMode = null;
  }

  private getCaptchaToken(): string {
    return this.captchaTestToken || 'test';
  }

  private submitAdminLogin() {
    const payload = {
      usernameOrPhone: this.email.trim(),
      password: this.password,
      captchaToken: this.captchaToken,
    };

    this.auth.login(payload).subscribe({
      next: () => {
        this.clearCaptchaState();
        const role = this.normalizeRole(
          this.tokenService.getEffectiveRole() ||
          this.tokenService.getUserRole() ||
          this.tokenService.getRole()
        );

        if (role === 'admin') {
          this.router.navigate(['/admin']);
        } else if (role === 'trader' || role === 'tradeowner') {
          this.goToTrader();
        } else if (role === 'approver' || role === 'approvingofficer') {
          this.router.navigate(['/approver']);
        } else if (role === 'seniorapprover' || role === 'seniorapprovingofficer') {
          this.router.navigate(['/senior-approver']);
        } else if (role === 'zoneapprover' || role === 'zonalapprover') {
          this.router.navigate(['/zone-approver']);
        } else {
          this.notificationService.show(
            `Login succeeded, but the role "${role || 'unknown'}" is not mapped in the UI.`,
            'warning'
          );
        }
      },
      error: (error: HttpErrorResponse) => {
        this.clearCaptchaState();
        if (error.status === 404) {
          this.notificationService.show(
            'Login API not found. Check the proxy or backend base URL.',
            'error'
          );
          return;
        }

        if (error.status === 0) {
          this.notificationService.show(
            'Cannot reach the login API. Check the backend or proxy.',
            'error'
          );
          return;
        }

        if (error.status === 401 || error.status === 400) {
          this.notificationService.show('Invalid credentials', 'warning');
          return;
        }

        this.notificationService.show('Login failed. Please try again.', 'error');
      }
    });
  }

  private submitUserLogin() {
    const payload = {
      mobileNumber: this.mobileNumber,
      captchaToken: this.captchaToken,
    };

    this.auth.userlogin(payload).subscribe({
      next: () => {
        this.clearCaptchaState();
        const role = this.normalizeRole(
          this.tokenService.getEffectiveRole() ||
          this.tokenService.getUserRole() ||
          this.tokenService.getRole()
        );

        if (role === 'tradeowner' || role === 'trader') {
          this.goToTrader();
          return;
        }

        this.notificationService.show('Login successful, but your role is not recognized.', 'warning');
      },
      error: (error: HttpErrorResponse) => {
        this.clearCaptchaState();
        if (error.status === 404) {
          this.notificationService.show(
            'User login API not found. Check the proxy or backend base URL.',
            'error'
          );
          return;
        }

        if (error.status === 0) {
          this.notificationService.show(
            'Cannot reach the user login API. Check the backend or proxy.',
            'error'
          );
          return;
        }

        if (error.status === 401 || error.status === 400) {
          this.notificationService.show('Invalid credentials', 'warning');
          return;
        }

        this.notificationService.show('Login failed. Please try again.', 'error');
      }
    });
  }

  //Otp sending
  onClicksendOTP() {
    if (!this.mobileNumber) {
      this.notificationService.show('Please enter phone number', 'warning');
      return;
    }
    if (!this.isValidPhone()) {
      this.notificationService.show('Please enter a valid 10-digit mobile number', 'warning');
      return;
    }

    this.startOtpCooldown();

    this.loginService.sendOtp(this.mobileNumber).subscribe({
      next: (res) => {
        this.isotpSent = true;
        this.isVerifyingOtp = false;
        this.notificationService.show(
          res?.Message || 'OTP sent successfully',
          'success'
        );
      },
      error: () => {
        this.notificationService.show(
          'Failed to send OTP',
          'error'
        );
      }
    });
  }

  /**20 second cooldown logic */
  startOtpCooldown() {
    this.isOtpLoading.set(true);
    this.otpCooldown.set(20);

    const timer = setInterval(() => {
      this.otpCooldown.update(v => v - 1);

      if (this.otpCooldown() === 0) {
        clearInterval(timer);
        this.isOtpLoading.set(false);
      }
    }, 1000);
  }

  isValidPhone(): boolean {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(this.mobileNumber);
  }

  verifyOtpAutomatically() {
    this.loginService
      .verifyOtp(this.mobileNumber, this.otp)
      .subscribe({
        next: (res) => {
          if (res.isValid) {
            this.notificationService.show(
              'OTP is verified!',
              'success'
            );
            this.isVerifyingOtp = true;
          } else {
            this.isVerifyingOtp = false;
            this.notificationService.show(
              'Invalid OTP',
              'error'
            );
            this.otp = '';
          }
        },
        error: () => {
          this.isVerifyingOtp = false;
          this.notificationService.show(
            'OTP verification failed',
            'error'
          );
        }
      });
  }

  onOtpInput(event: any) {
    this.otp = this.otp.replace(/\D/g, '');

    if (this.otp.length === 6 && !this.isVerifyingOtp) {
      this.verifyOtpAutomatically();
      this.isVerifyingOtp = true;
    }
  }
}
