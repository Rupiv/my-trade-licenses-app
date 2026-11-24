import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';

export interface ZoneApproverApplication {
  licenceApplicationID: number;
  applicationNumber: string;
  applicationSubmitDate: string;
  licenceApplicationStatusID: number;
  licenceApplicationStatusName: string;
  tradeLicenceID: number;
  applicantName: string;
  tradeName: string;
  mobileNumber: string;
  emailID: string;
  mohID: number;
  mohName: string;
  wardID: number;
  wardName: string;
  latitude: number | null;
  longitude: number | null;
  roadID: number | null;
  roadWidthMtrs: number | null;
  roadCategoryCode: string | null;
  roadCategory: string | null;
  isConfirmed: boolean;
  entryDate: string | null;
}

export interface ZoneApproverApplicationsResponse {
  role?: string;
  Role?: string;
  visibleStatuses?: string[];
  VisibleStatuses?: string[];
  loginID?: number;
  LoginID?: number;
  totalRecords?: number;
  TotalRecords?: number;
  pageNumber?: number;
  PageNumber?: number;
  pageSize?: number;
  PageSize?: number;
  data?: ZoneApproverApplication[];
  Data?: ZoneApproverApplication[];
}

export interface ZoneApproverDashboardResponse {
  role?: string;
  Role?: string;
  visibleStatuses?: string[];
  VisibleStatuses?: string[];
  dashboard?: Record<string, any>;
  Dashboard?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class ZoneApprovingOfficerService {
  private readonly baseUrl = '/api/api';

  constructor(private readonly http: HttpClient) {}

  getZoneApproverApplications(
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

    return this.http.get<ZoneApproverApplicationsResponse>(
      `${this.baseUrl}/trade-licence/zone-approver/applications`,
      { params }
    );
  }

  getZoneApproverLookup(loginId: number) {
    const params = new HttpParams().set('loginId', loginId.toString());
    return this.http.get<any>(`${this.baseUrl}/trade-licence/zone-approver/lookup`, { params });
  }

  getZoneApproverDashboard(loginId: number, mohId?: number | null, wardId?: number | null) {
    let params = new HttpParams().set('loginId', loginId.toString());

    if (mohId) {
      params = params.set('mohId', mohId.toString());
    }
    if (wardId) {
      params = params.set('wardId', wardId.toString());
    }

    return this.http.get<ZoneApproverDashboardResponse>(
      `${this.baseUrl}/trade-licence/zone-approver/dashboard`,
      { params }
    );
  }
}

