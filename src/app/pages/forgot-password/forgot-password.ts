import { CommonModule } from '@angular/common';
import { Component, OnDestroy, ViewChildren, QueryList, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgZone } from '@angular/core';
import { LoaderService } from '../../shared/components/loader/loader.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPasswordComponent implements OnDestroy {

  constructor(private router: Router, private http: HttpClient, private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private loaderservice : LoaderService
  ) {}

  // ─── Step Control ──────────────────────────────────────────────
  // Steps: 1 = Email, 2 = OTP, 3 = Reset Password, 4 = Success
  currentStep: number = 1;

  // ─── Step 1: Email ─────────────────────────────────────────────
  username: string = '';
  maskedMobile: string = ''; 
  mobileNo: string = '';
  sendOtpError: string = '';   

  // ─── Step 2: OTP ───────────────────────────────────────────────
  otpDigits: string[] = ['', '', '', '', '', ''];
  otpError: string = '';
  resendCooldown: number = 0;
  private resendTimer: any = null;

  // ─── Step 3: Reset Password ────────────────────────────────────
  newPassword: string = '';
  confirmPassword: string = '';
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  // ─── Shared ────────────────────────────────────────────────────
  isLoading: boolean = false;

  @ViewChildren('otpRef') otpRefs!: QueryList<ElementRef<HTMLInputElement>>;


  // ════════════════════════════════════════════════════════════════
  // STEP 1 — Send OTP
  // ════════════════════════════════════════════════════════════════
  sendOtp(): void {
    this.loaderservice.show();
    this.sendOtpError = '';  // ← clear previous error

    this.http.post<{ message: string; mobileNo: string }>(
      'https://pickitover.com/api/api/Auth/forgot-password/send-otp',
      { login: this.username, mobileNo: this.mobileNo }  // ← also send mobileNo
    ).subscribe({
      next: (res) => {
        this.loaderservice.hide();
        this.maskedMobile = res?.mobileNo || this.mobileNo;
        this.currentStep = 2;
        this.startResendCooldown();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loaderservice.hide();
        this.sendOtpError = err?.error?.message || 'Failed to send OTP.';
        this.cdr.detectChanges();
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 2 — OTP Handling
  // ════════════════════════════════════════════════════════════════

  /** Returns true when all 6 OTP boxes are filled */
  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d.trim().length === 1);
  }

  /** Returns the full OTP string */
  get otpValue(): string {
    return this.otpDigits.join('');
  }

  /**
   * On keyup: move focus forward when a digit is typed,
   * or handle paste across all boxes.
   */
  trackByIndex(index: number): number {
  return index;
}

onOtpInput(event: Event, index: number): void {
  const input = event.target as HTMLInputElement;
  const value = input.value.replace(/\D/g, '');

  // Handle paste
  if (value.length > 1) {
    const digits = value.slice(0, 6).split('');
    // Create a new array reference to trigger change detection
    const newDigits = [...this.otpDigits];
    digits.forEach((d, i) => {
      if (i < newDigits.length) newDigits[i] = d;
    });
    this.otpDigits = newDigits;
    this.focusOtpBox(Math.min(digits.length - 1, 5));
    return;
  }

  // Single digit
  const newDigits = [...this.otpDigits];
  newDigits[index] = value.slice(-1); // take last char only
  this.otpDigits = newDigits;
  input.value = newDigits[index]; // sync DOM

  if (value && index < 5) {
    this.focusOtpBox(index + 1);
  }
}

  /**
   * On keydown: move focus backward on Backspace when box is empty.
   */
  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      this.focusOtpBox(index - 1);
    }
  }

  private focusOtpBox(index: number): void {
    const boxes = this.otpRefs.toArray();
    if (boxes[index]) {
      boxes[index].nativeElement.focus();
    }
  }

  /** Verify the entered OTP */
  verifyOtp(): void {
    if (!this.isOtpComplete()) return;
    this.loaderservice.show();
    this.otpError = '';

    this.http.post('https://pickitover.com/api/api/Auth/forgot-password/verify-otp', {
      mobileNo: this.mobileNo,   // ← changed from login: this.username
      otp: this.otpValue
    }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.loaderservice.hide();
          this.currentStep = 3;
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loaderservice.hide();
          this.otpError = err?.error?.message || 'Invalid OTP. Please try again.';
          this.otpDigits = ['', '', '', '', '', ''];
          this.focusOtpBox(0);
        });
      }
    });
  }

resetPassword(): void {
  if (!this.newPassword || this.newPassword.length < 8 || this.newPassword !== this.confirmPassword) return;
  this.loaderservice.show();

  this.http.post('https://pickitover.com/api/api/Auth/forgot-password/reset-password', {
    login: this.username,
    newPassword: this.newPassword
  }).subscribe({
    next: () => {
      this.ngZone.run(() => {
        this.loaderservice.hide();
        this.currentStep = 4;
      });
    },
    error: (err) => {
      this.ngZone.run(() => {
        this.loaderservice.hide();
        this.otpError = err?.error?.message || 'Failed to reset password. Please try again.';
      });
    }
  });
}

  /** Resend OTP and restart cooldown */
  resendOtp(): void {
    if (this.resendCooldown > 0) return;

    this.otpDigits = ['', '', '', '', '', ''];
    this.otpError = '';

    this.http.post('https://pickitover.com/api/api/Auth/forgot-password/send-otp', {
      login: this.username
    }).subscribe({
      next: () => {
        this.startResendCooldown();
      },
      error: (err) => {
        this.otpError = err?.error?.message || 'Failed to resend OTP. Please try again.';
      }
    });
  }

  private startResendCooldown(seconds: number = 30): void {
    this.resendCooldown = seconds;
    this.clearResendTimer();
    this.resendTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.clearResendTimer();
      }
    }, 1000);
  }

  private clearResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 3 — Reset Password
  // ════════════════════════════════════════════════════════════════
  // ────────────────────────────────────────────────────────────────
  // Password Strength
  // ────────────────────────────────────────────────────────────────

  private getPasswordStrength(): 'weak' | 'fair' | 'strong' {
    const p = this.newPassword;
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 2) return 'weak';
    if (score <= 3) return 'fair';
    return 'strong';
  }

  get passwordStrengthClass(): string {
    return this.getPasswordStrength();
  }

  get passwordStrengthLabel(): string {
    const map = { weak: 'Weak', fair: 'Fair', strong: 'Strong' };
    return map[this.getPasswordStrength()];
  }

  get passwordStrengthWidth(): string {
    const map = { weak: '33%', fair: '66%', strong: '100%' };
    return map[this.getPasswordStrength()];
  }

  // ════════════════════════════════════════════════════════════════
  // Lifecycle
  // ════════════════════════════════════════════════════════════════
  ngOnDestroy(): void {
    this.clearResendTimer();
  }
}