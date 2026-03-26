import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object,
  private router: Router) {}
  private tokenTimer: any;
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  } 
  private TOKEN_KEY = 'access_token';

  setToken(token: string) {
    if (this.isBrowser()) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  getToken(): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  // 🔥 Decode JWT
  getDecodedToken(): any {
    const token = this.getToken();
    if (!token) return null;

    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }

  // 🔥 Get UserId as NUMBER
  // getUserId(): number | null {
  //   const decoded = this.getDecodedToken();
  //   return decoded?.sub ? Number(decoded.sub) : null;
  // }

  // getRole(): string {
  //   const decoded: any = this.getDecodedToken();
  //   return decoded?.unique_name ?? '';
  // }
  getUserId(): number | null {
    const decoded: any = this.getDecodedToken();
    return decoded?.sub !== undefined ? Number(decoded.sub) : null;
  }

  getRole(): string {
    const decoded: any = this.getDecodedToken();
    return decoded?.designation ?? '';
  }


  getUserRole(): string {
    const decoded = this.getDecodedToken();
    return decoded?.designation ?? '';
  }

  getEffectiveRole(): string {
    const systemRole = this.getRole();
    const tradeRole = this.getUserRole();

    // Priority: System roles first
    if (systemRole) {
      return systemRole; // admin, approver, senior-approver
    }

    // Otherwise Trade role
    if (tradeRole) {
      return tradeRole; // TRADE_OWNER
    }

    return '';
  }
  //string FullName,
  //string MobileNumber,
  //string? EmailID
  getUserFullName(): string {
    const decoded = this.getDecodedToken();
    return decoded?.unique_name ?? '';
  }

  getUserEmail(): string {
    const decoded = this.getDecodedToken();
    // Email is NOT present in token
    return '';
  }

  getUserMobile(): string {
    const decoded = this.getDecodedToken();
    return decoded?.mobile ?? '';
  }

  getTraderUserId(): number | null {
    const decoded = this.getDecodedToken();
    return decoded?.loginID ? Number(decoded.loginID) : null;
  }

  getEffectiveUserId(): number | null {
    const decoded: any = this.getDecodedToken();
    if (!decoded) return null;

    // Priority: System users (Admin, Approver, SeniorApprover)
    if (decoded.sub) {
      return Number(decoded.sub);
    }

    // Trade users (Trader / Trade Owner)
    if (decoded.loginID) {
      return Number(decoded.loginID);
    }

    return null;
  }

  getTokenExpiry(): number | null {
    const token = this.getToken();
    if (!token) return null;

    const decoded: any = jwtDecode(token);
    return decoded.exp * 1000; // convert to ms
  }
  startTokenTimer() {
    if (this.tokenTimer) {
      clearTimeout(this.tokenTimer); 
    }
    const expiry = this.getTokenExpiry();
    if (!expiry) return;
    const timeout = expiry - Date.now();
    if (timeout > 0) {
      this.tokenTimer = setTimeout(() => {
        this.logout();
      }, timeout);
    } else {
      this.logout();
    }
  }

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  }
  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
