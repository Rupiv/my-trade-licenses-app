import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private baseUrl = '/api/api'; // proxy through Angular in dev

  constructor(private http: HttpClient) {}

  private buildUrl(url: string): string {
    const normalizedBase = this.baseUrl.replace(/\/+$/, '');
    const normalizedPath = url.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
  }

  get<T>(url: string) {
    return this.http.get<T>(this.buildUrl(url));
  }

  post<T>(url: string, body: any) {
    return this.http.post<T>(this.buildUrl(url), body);
  }

  put<T>(url: string, body: any) {
    return this.http.put<T>(this.buildUrl(url), body);
  }

  sendOtp(phone: string) {
    return this.http.post<any>(
      this.buildUrl('/sms/otp/send'),
      {
        mobileNo: phone
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  verifyOtp(phone: string, otp: string) {
    return this.http.post<any>(
      this.buildUrl('/sms/otp/verify'),
      {
        mobileNo: phone,
        otp: otp
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
