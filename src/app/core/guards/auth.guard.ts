import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  // canActivate(): boolean {

  //   if (this.auth.isLoggedIn()) {
  //     return true;
  //   }

  //   this.router.navigate(['/login']);
  //   return false;
  // }
  canActivate(): boolean {

    const token = this.auth.getToken(); // use service

    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (!token || this.auth.isTokenExpired(token)) {
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
}
