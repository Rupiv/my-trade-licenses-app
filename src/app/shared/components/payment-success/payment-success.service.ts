import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentSuccessService {

  private baseUrl = 'https://pickitover.com/api/api/';

  constructor(private http: HttpClient) {}

  // ✅ NEW: Decrypt payment params via backend
  decryptPayment(data: string, key: string, iv: string): Observable<any> {
    return this.http.get(`${this.baseUrl}payment/decrypt-payment`, {
      params: { data, key, iv }
    });
  }

  saveApplicationToTradeLicense(licensesApplicationNumber: number) {
    return this.http.post(
      `${this.baseUrl}/trade-licence/${licensesApplicationNumber}/submit`, {}
    );
  }

  saveApplicationToLicensesApp(licensesApplicationNumber: number) {
    return this.http.post(
      `${this.baseUrl}/licence-application/submit/${licensesApplicationNumber}`, {}
    );
  }

  saveApplicationToTradeLicenseWithPayment(licensesApplicationNumber: number) {
    return this.http.post(
      `${this.baseUrl}/licence-application/payment-success/${licensesApplicationNumber}`, {}
    );
  }

  getLicenceApplicationById(licenceApplicationID: number) {
    return this.http.get<any>(
      `${this.baseUrl}/licence-application/${licenceApplicationID}`
    );
  }
}