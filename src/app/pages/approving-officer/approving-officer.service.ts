import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TradeType } from '../../core/models/new-trade-licenses.model';
import { AllApprovedApplication, ApprovedApplications, LicenceApplicationModel } from '../../core/models/trade-licenses-details.model';

@Injectable({
  providedIn: 'root'
})
export class ApprovingOfficerService {

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

  getTradeTypes(){
    return this.get<TradeType[]>('/trade-type');
  }

  getPagedApplications(pageNumber: number, pageSize: number) {
    return this.http.get<{
      data: LicenceApplicationModel[];
      totalRecords: number;
      totalPages: number;
    }>(
      `${this.baseUrl}/licence-application/paged?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
  }

  getAppliedApproverApplications(request: {
    loginId: number;
    mohId?: number;
    wardId?: number;
    licenceApplicationId?: number;
    applicationNumber?: string;
    pageNumber: number;
    pageSize: number;
  }) {
    return this.http.post<ApprovedApplications>(
      `${this.baseUrl}/trade-licence/approver/applications`,
      request
    );
  }

  getApproverLookup(loginId: number) {
    const params = new HttpParams().set('loginId', loginId.toString());
    return this.http.get<{
      role?: string;
      mode?: string;
      loginID?: number;
      zones?: Array<{ ZoneID?: number; ZoneName?: string; zoneID?: number; zoneName?: string }>;
      wards?: Array<{ WardID?: number; WardName?: string; ZoneID?: number; zoneID?: number; wardID?: number; wardName?: string }>;
      Zones?: Array<{ ZoneID?: number; ZoneName?: string; zoneID?: number; zoneName?: string }>;
      Wards?: Array<{ WardID?: number; WardName?: string; ZoneID?: number; zoneID?: number; wardID?: number; wardName?: string }>;
    }>(`${this.baseUrl}/trade-licence/approver/lookup`, { params });
  }

  getApproverDashboard(loginId: number) {
    return this.http.get<{
      role?: string;
      mode?: string;
      loginID?: number;
      data?: {
        TotalApplied?: number;
        TotalObjection?: number;
        TotalRejected?: number;
        GrandTotal?: number;
        totalApplied?: number;
        totalObjection?: number;
        totalRejected?: number;
        grandTotal?: number;
      };
      Data?: {
        TotalApplied?: number;
        TotalObjection?: number;
        TotalRejected?: number;
        GrandTotal?: number;
        totalApplied?: number;
        totalObjection?: number;
        totalRejected?: number;
        grandTotal?: number;
      };
    }>(
      `${this.baseUrl}/trade-licence/approver/dashboard?loginId=${loginId}`
    );
  }

  //trade-licence/search?text//&pageNumber=${pageNumber}&pageSize=${pageSize}
  searchApplications(searchText: string) {
    return this.http.get<ApprovedApplications>(
      `${this.baseUrl}/trade-licence/search?text=${searchText}`
    );
  }

}

