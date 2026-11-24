import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CreateAccountService {

  private baseUrl = '/api/api'; // proxy through Angular in dev

  constructor(private http: HttpClient) {}

  get<T>(url: string) {
    return this.http.get<T>(`${this.baseUrl}${url}`);
  }

  post<T>(url: string, body: any) {
    return this.http.post<T>(`${this.baseUrl}${url}`, body);
  }

  put<T>(url: string, body: any) {
    return this.http.put<T>(`${this.baseUrl}${url}`, body);
  }
  
  sendOtp(phone: string) {
    return this.http.post<any>(
      `${this.baseUrl}/sms/otp/send`,
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
      `${this.baseUrl}/sms/otp/verify`,
      {
        mobileNo: phone,
        otp: otp
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  getUserLoginDetails(phone : string){
    return this.http.post<any>(
      `${this.baseUrl}/Auth/login-USER`,
      { mobileNumber: phone }
    );
  }
}

