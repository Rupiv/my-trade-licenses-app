import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GbaCorporation, MLCConstituency, Ward, Zones } from '../../core/models/new-trade-licenses.model';

export interface AdminApplication {
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
  zoneID: number;
  zoneName: string;
  mohID: number;
  mohName: string;
  wardID: number;
  wardName: string;
  loginID: number;
  // GBA (present once GBA_StoredProcedure_Updates.sql has run)
  corporationID?: number | null;
  corporationName?: string | null;
  gbaWardName?: string | null;
  locationStatus?: 'CONFIRMED' | 'DERIVED' | 'UNMAPPED' | null;
}

export interface AdminApplicationsResponse {
  role?: string;
  Role?: string;
  mode?: string;
  Mode?: string;
  totalRecords?: number;
  TotalRecords?: number;
  pageNumber?: number;
  PageNumber?: number;
  pageSize?: number;
  PageSize?: number;
  totalPages?: number;
  TotalPages?: number;
  data?: AdminApplication[];
  Data?: AdminApplication[];
}

export interface AdminApplicationsQuery {
  corporationId?: number | null;
  zoneId?: number | null;
  mohId?: number | null;
  wardId?: number | null;
  licenceApplicationId?: number | null;
  applicationNumber?: string | null;
  pageNumber: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminApplicationsService {
  private readonly baseUrl = '/api/api';

  constructor(private readonly http: HttpClient) {}

  getAdminApplications(
    query: AdminApplicationsQuery
  ): Observable<AdminApplicationsResponse> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber.toString())
      .set('pageSize', query.pageSize.toString());

    if (query.corporationId) {
      params = params.set('corporationId', query.corporationId.toString());
    }
    if (query.zoneId) {
      params = params.set('zoneId', query.zoneId.toString());
    }
    if (query.mohId) {
      params = params.set('mohId', query.mohId.toString());
    }
    if (query.wardId) {
      params = params.set('wardId', query.wardId.toString());
    }
    if (query.licenceApplicationId) {
      params = params.set('licenceApplicationId', query.licenceApplicationId.toString());
    }
    if (query.applicationNumber?.trim()) {
      params = params.set('applicationNumber', query.applicationNumber.trim());
    }

    return this.http.get<AdminApplicationsResponse>(
      `${this.baseUrl}/trade-licence/admin/applications`,
      { params }
    );
  }

  getZones(): Observable<Zones[]> {
    return this.http.get<Zones[]>(`${this.baseUrl}/bbmp-zones`);
  }

  getCorporations(): Observable<GbaCorporation[]> {
    return this.http.get<GbaCorporation[]>(`${this.baseUrl}/gba/corporations`);
  }

  getMohs(): Observable<MLCConstituency[]> {
    return this.http.get<MLCConstituency[]>(`${this.baseUrl}/master-moh`);
  }

  getWardsByConstituency(constituencyId: number): Observable<Ward[]> {
    return this.http.get<Ward[]>(
      `${this.baseUrl}/bbmp-wards/by-constituency/${constituencyId}`
    );
  }
}

