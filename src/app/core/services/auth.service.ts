import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TokenService } from './token.service';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = '/api/api';

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {}

  login(payload: any) {
    return this.http.post<any>(`${this.baseUrl}/Auth/login`, payload).pipe(
      tap(res => {
        if (res.success && res.accessToken) {
          this.tokenService.setToken(res.accessToken);
          this.tokenService.startTokenTimer(); // auto-logout at expiry for this session too
        }
      })
    );
  }
  // For user login
  userlogin(payload: any) {
    return this.http.post<any>(`${this.baseUrl}/Auth/login-user`, payload).pipe(
      tap(res => {
        if (res.success && res.accessToken) {
          this.tokenService.setToken(res.accessToken);
          this.tokenService.startTokenTimer(); // auto-logout at expiry for this session too
        }
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
    // draft id is not per user: the next trader on this browser must not get it
    localStorage.removeItem('draftLicenceApplicationId');
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
    //console.error('Invalid token', error);
    return true;
  }
}
}
