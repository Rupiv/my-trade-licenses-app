import { CommonModule } from '@angular/common';
import { Component, OnDestroy, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPasswordComponent implements OnDestroy {

  // ─── Step Control ──────────────────────────────────────────────
  // Steps: 1 = Email, 2 = OTP, 3 = Reset Password, 4 = Success
  currentStep: number = 1;

  // ─── Step 1: Email ─────────────────────────────────────────────
  email: string = '';

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

  constructor(private router: Router, private http: HttpClient) {}

  // ════════════════════════════════════════════════════════════════
  // STEP 1 — Send OTP
  // ════════════════════════════════════════════════════════════════
  sendOtp(): void {
    if (!this.email || !this.isValidEmail(this.email)) return;

    this.isLoading = true;

    this.http.post('https://pickitover.com/api/api/Auth/forgot-password/send-otp', {
      login: this.email
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentStep = 2;
        this.startResendCooldown();
      },
      error: (err) => {
        this.isLoading = false;
        this.otpError = err?.error?.message || 'Failed to send OTP. Please try again.';
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
  onOtpKeyUp(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Handle paste: spread digits across boxes
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      digits.forEach((d, i) => {
        if (i < this.otpDigits.length) this.otpDigits[i] = d;
      });
      // Focus the last filled box
      const lastIndex = Math.min(digits.length - 1, this.otpDigits.length - 1);
      this.focusOtpBox(lastIndex);
      return;
    }

    // Only allow single digit
    if (!/^\d$/.test(value)) {
      this.otpDigits[index] = '';
      return;
    }

    this.otpDigits[index] = value;

    // Move to next box
    if (index < this.otpDigits.length - 1) {
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

    this.isLoading = true;
    this.otpError = '';

    this.http.post('https://pickitover.com/api/api/Auth/forgot-password/verify-otp', {
      mobileNo: this.email,
      otp: this.otpValue
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentStep = 3;
      },
      error: (err) => {
        this.isLoading = false;
        this.otpError = err?.error?.message || 'Invalid OTP. Please try again.';
        this.otpDigits = ['', '', '', '', '', ''];
        this.focusOtpBox(0);
      }
    });
  }

  /** Resend OTP and restart cooldown */
  resendOtp(): void {
    if (this.resendCooldown > 0) return;

    this.otpDigits = ['', '', '', '', '', ''];
    this.otpError = '';

    this.http.post('https://pickitover.com/api/api/Auth/forgot-password/send-otp', {
      login: this.email
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

  /** Submit the new password */
  resetPassword(): void {
    if (
      !this.newPassword ||
      this.newPassword.length < 8 ||
      this.newPassword !== this.confirmPassword
    ) return;

    this.isLoading = true;

    this.http.post('https://pickitover.com/api/api/Auth/forgot-password/reset-password', {
      login: this.email,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentStep = 4;
      },
      error: (err) => {
        this.isLoading = false;
        // Show error near confirm password or a general message
        this.otpError = err?.error?.message || 'Failed to reset password. Please try again.';
      }
    });
  }

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