import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TradeLicenseApplication } from '../../core/models/new-trade-licenses.model';
import { AppliedLicensesResponse, LicenceApplicationDetails } from '../../core/models/trade-licenses-details.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TradeLicensesService {

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

  getAppliedLicensesApplications(loginId: number): Observable<AppliedLicensesResponse> {
    return this.get<AppliedLicensesResponse>(
      `/trade-licence/user/${loginId}/applications`
    );
  }

  /** Paid but not submitted (payment redirect failed): run the submission steps again. */
  completeSubmission(licenceApplicationID: number): Observable<{ submitted: boolean; applicationNumber?: string }> {
    return this.http.post<{ submitted: boolean; applicationNumber?: string }>(
      `${this.baseUrl}/licence-application-view/${licenceApplicationID}/complete-submission`, {}
    );
  }

  downloadGeneratedCertificate(licenceApplicationID: number): Observable<Blob> {
    return this.http.get(
      // the dashboard lists draft ids; the API maps them to the submitted application
      `${this.baseUrl}/licence/certificate/generated/${licenceApplicationID}/download?draft=true`,
      {
        responseType: 'blob'
      }
    );
  }
}

