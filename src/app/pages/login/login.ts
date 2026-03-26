import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { signal } from '@angular/core';
import { LoginService } from './login.service';
import { Console } from 'console';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterModule, FormsModule], //CreateAccount
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  isLogin = false;
  isUserLogin = false;
  showPassword = false;
  email = '';
  password = '';
  mobileNumber = '';
  

  otp: string = '';
  isVerifyingOtp = false;
  isotpSent = false;
  isOtpLoading = signal(false);
  otpCooldown = signal(20);
  otpTimer: any;
  otpSub?: Subscription;
  constructor(private router: Router, private auth: AuthService, 
    private tokenService: TokenService,
    private notificationService: NotificationService,
    private loginService: LoginService) {}

  private normalizeRole(role: string | null | undefined): string {
    return (role ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
  onSubmit() {
    if (this.isUserLogin) {
    // USER LOGIN (OTP)
    if (!this.mobileNumber) {
      this.notificationService.show('Please enter mobile number', 'warning');
      return;
    }

    if (!this.otp) {
      this.notificationService.show('Please enter OTP', 'warning');
      return;
    }
    const payload = {
        mobileNumber: this.mobileNumber
      };
      
    this.auth.userlogin(payload).subscribe({
    next: () => {
        // Extract UserId from JWT
        const role = this.tokenService.getUserRole();
        console.log(role);
        if(role == 'TRADE_OWNER'){
          this.router.navigate(['/trader']);
        }
      },
      error: (err) => {
        //console.log(err);
        this.notificationService.show('Invalid credentials', 'warning');
      }
    });
  }else{
      const payload = {
        usernameOrPhone: this.email,
        password: this.password
      };

      this.auth.login(payload).subscribe({
        next: (res) => {
            const role = this.normalizeRole(this.tokenService.getUserRole());
            console.log('Login role:', role);
            const decoded = this.tokenService.getDecodedToken();
            console.log('Full decoded token:', decoded);
            if (role === 'admin') {
              this.router.navigate(['/admin']);
            } else if (role === 'trader' || role === 'tradeowner') {
              this.router.navigate(['/trader']);
            } else if (role === 'approver' || role === 'approvingofficer') {
              this.router.navigate(['/approver']);
            } else if (role === 'seniorapprover' || role === 'seniorapprovingofficer') {
              this.router.navigate(['/senior-approver']);
            } else if (role === 'zoneapprover' || role === 'zonalapprover') {
              this.router.navigate(['/zone-approver']);
            } else {
              this.notificationService.show('Invalid credentials', 'warning');
              return;
            }
          },
          error: (err) => {
            this.notificationService.show('Invalid credentials', 'warning');
          }
        }) ;
      }
    }

  //Otp sending
  onClicksendOTP() {
    //if (isOtpLoading) return;

    // validations
    if (!this.mobileNumber) {
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
    // Allow digits only 
    this.otp = this.otp.replace(/\D/g, ''); 

    // Auto verify when 6 digits entered 
    if (this.otp.length === 6 && !this.isVerifyingOtp) {
      this.verifyOtpAutomatically(); 
      this.isVerifyingOtp = true;
    }
  }
}


