import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
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
  }
  onClicksendOTP() {
    //if (isOtpLoading) return;

    // validations
    if (!this.registerModel.fullName) {
      this.notificationService.show('Please enter full name', 'warning');
      return;
    }
    if (!this.registerModel.emailID) {
      this.notificationService.show('Please enter email', 'warning');
      return;
    }
    if (!this.registerModel.mobileNumber) {
      this.notificationService.show('Please enter phone number', 'warning');
      return;
    }
    if (!this.isValidPhone()) {
      this.notificationService.show('Please enter a valid 10-digit mobile number', 'warning');
      return;
    }

    //start 20 sec cooldown
    this.startOtpCooldown();

    //this.isOtpLoading = true;

    this.createAccountService.sendOtp(this.registerModel.mobileNumber).subscribe({
      next: (res) => {
        this.isotpSent = true;
        this.isVerifyingOtp = false;
        this.notificationService.show(
          res?.Message || 'OTP sent successfully',
          'success'
        );
        // console.log('OTP response:', res);
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
    return mobileRegex.test(this.registerModel.mobileNumber);
  }

  /** One-time proof from otp/verify; login-user requires it for this mobile number. */
  private otpToken = '';

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
      error: () => {
        this.isVerifyingOtp = false;
        alert('OTP verification failed');
      }
    });
  }

  onRegister() {
    if (!this.isVerifyingOtp) {
      this.notificationService.show(
        'Please verify OTP before registering.',
        'warning'
      );
      return;
    }
    this.createAccountService.post<any>('/Auth/register', this.registerModel).subscribe({
      next: (res) => {
        this.setUsrToken();
        this.notificationService.show(
          res?.message || res?.Message || 'Account created successfully!',
          'success'
        );
      },
      error: (err) => {
        //Duplicate / SQL error comes here (API returns camelCase JSON: { message })
        let message = 'Something went wrong. Please try again.';

        if (err?.error) {
          if (typeof err.error === 'string') {
            message = err.error; // e.g. "Mobile number already registered"
          } else if (err.error.message || err.error.Message) {
            message = err.error.message || err.error.Message;
          }
        }

        this.notificationService.show(message, 'error');
      }
    });
  }

  onOtpInput(event: any) { 
    // Allow digits only 
    this.otp = this.otp.replace(/\D/g, ''); 

    // Auto verify when 6 digits entered 
    if (this.otp.length === 6 && !this.isVerifyingOtp) {
      this.verifyOtpAutomatically(); 
      this.isVerifyingOtp = true;
      this.notificationService.show(
        'OTP is verified!',
        'success'
      );
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
    this.notificationService.show('Captcha expired. Please log in from the login page.', 'warning');
  }

  onCaptchaErrored() {
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
        // login successful if we reach here
        const role = (this.tokenService.getEffectiveRole() || this.tokenService.getUserRole() || this.tokenService.getRole())
          .toLowerCase()
          .replace(/[\s_-]+/g, '');
        if (role === 'tradeowner' || role === 'trader') {
          this.router.navigate(['/trader']);
        }
      },
      error: () => {
        this.notificationService.show(
          'Unable to redirect to user trade',
          'error'
        );
      }
    });
  }
}
