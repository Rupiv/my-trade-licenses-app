import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CreateAccountService {

  private baseUrl = 'https://pickitover.com/api/api/'; // 👈 change to your backend

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
    // return this.http.post<any>(
    //   `${this.baseUrl}/sms/otp/send`,
    //   {
    //     mobileNo: phone
    //   },
    //   {
    //     headers: { 'Content-Type': 'application/json' }
    //   }
    // );
    return of({
      isMock: true,
      mobileNo: phone,
      Message: 'OTP sent successfully (sample OTP: 123456)'
    });
  }

  verifyOtp(phone: string, otp: string) {
    // return this.http.post<any>(
    //   `${this.baseUrl}/sms/otp/verify`,
    //   {
    //     mobileNo: phone,
    //     otp: otp
    //   },
    //   {
    //     headers: { 'Content-Type': 'application/json' }
    //   }
    // );
    const isValid = otp === '123456';
    return of({
      isMock: true,
      mobileNo: phone,
      isValid,
      Message: isValid ? 'OTP verified' : 'Invalid OTP'
    });
  }

  getUserLoginDetails(phone : string){
    return this.http.post<any>(
      `${this.baseUrl}/Auth/login-USER`,
      { mobileNumber: phone }
    );
  }
}

