import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TokenService } from './token.service';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private api: ApiService,
    private tokenService: TokenService
  ) {}

  login(payload: any) {
    return this.api.post<any>('/Auth/login', payload).pipe(
      tap(res => {
        this.tokenService.setToken(res.accessToken); // JWT token
      })
    );
  }
  // For user login
  userlogin(payload: any) {
    return this.api.post<any>('/Auth/login-USER', payload).pipe(
      tap(res => {
        this.tokenService.setToken(res.accessToken); // JWT token
      })
    );
  }
  getUserRole(): string {
    const token = this.tokenService.getToken();
    if (!token) return '';

    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  }

  getUserloginRole(): string {
    const token = this.tokenService.getToken();
    if (!token) return '';

    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.designation ;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    sessionStorage.clear();
  }

  isLoggedIn(): boolean {
    const token = this.tokenService.getToken();

    if (!token) return false;

    return !this.isTokenExpired(token);
  }

  getToken(): string | null {
    return this.tokenService.getToken(); // FIXED
  }

  isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    if (!payload.exp) {
      return true;
    }

    const expiryTime = payload.exp * 1000; // seconds → ms
    const currentTime = Date.now();

    return currentTime > expiryTime;

  } catch (error) {
    console.error('Invalid token', error);
    return true;
  }
}
}
