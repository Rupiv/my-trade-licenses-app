import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SeniorApprovedApplications, SeniorApproverDashboardResponse } from './senior-approving-officer.model';

@Injectable({
  providedIn: 'root'
})
export class SeniorApprovingOfficerService {

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

  getSubmittedInspectionApplications(
    loginId: number,
    pageNumber: number,
    pageSize: number,
    filters?: {
      mohId?: number | null;
      wardId?: number | null;
      licenceApplicationId?: number | null;
      applicationNumber?: string | null;
    }
  ) {
    let params = new HttpParams()
      .set('loginId', loginId.toString())
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (filters?.mohId) {
      params = params.set('mohId', filters.mohId.toString());
    }
    if (filters?.wardId) {
      params = params.set('wardId', filters.wardId.toString());
    }
    if (filters?.licenceApplicationId) {
      params = params.set('licenceApplicationId', filters.licenceApplicationId.toString());
    }
    if (filters?.applicationNumber?.trim()) {
      params = params.set('applicationNumber', filters.applicationNumber.trim());
    }

    return this.http.get<SeniorApprovedApplications>(
      `${this.baseUrl}/trade-licence/senior-approver/applications`,
      { params }
    );
  }

  getSeniorApproverLookup(loginId: number) {
    const params = new HttpParams().set('loginId', loginId.toString());
    return this.http.get<any>(`${this.baseUrl}/trade-licence/senior-approver/lookup`, { params });
  }

  getSeniorApproverDashboard(loginId: number, mohId?: number | null, wardId?: number | null) {
    let params = new HttpParams().set('loginId', loginId.toString());

    if (mohId) {
      params = params.set('mohId', mohId.toString());
    }
    if (wardId) {
      params = params.set('wardId', wardId.toString());
    }

    return this.http.get<SeniorApproverDashboardResponse>(
      `${this.baseUrl}/trade-licence/senior-approver/dashboard`,
      { params }
    );
  }
}

