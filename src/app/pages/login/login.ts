import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
isLogin = true;
  showPassword = false;

  email = '';
  password = '';
  name = '';
  phone = '';

  constructor(private router: Router) {}

  toggleMode() {
    this.isLogin = !this.isLogin;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.isLogin) {
      alert('Login Successful\nWelcome to GBA Trade License Portal');
      this.router.navigate(['/trader/dashboard']);
    } else {
      alert('Registration Successful\nPlease check your email to verify your account');
    }
  }
}
