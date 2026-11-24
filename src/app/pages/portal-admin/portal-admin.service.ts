import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PortalAdminModel } from '../../core/models/portal-admin.model';

@Injectable({
  providedIn: 'root'
})
export class PortalAdminService {

  private baseUrl = '/api/api'; // proxy through Angular in dev
  //https://pickitover.com/api/api/dashboard/application-status-count
  constructor(private http: HttpClient) {}

  //#region Getting data to load in dashboard
  getApplicationStatusCount(portalAdminId: number) {
    return this.http.get<any>(
      `${this.baseUrl}/dashboard/application-status-count/${portalAdminId}`
    );
  }
  //#endregion

  getAdminDashboard(params?: {
    zoneId?: number | null;
    mohId?: number | null;
    wardId?: number | null;
  }) {
    let httpParams = new HttpParams();
    if (params?.zoneId) httpParams = httpParams.set('zoneId', params.zoneId.toString());
    if (params?.mohId) httpParams = httpParams.set('mohId', params.mohId.toString());
    if (params?.wardId) httpParams = httpParams.set('wardId', params.wardId.toString());

    return this.http.get<{
      role?: string;
      Role?: string;
      dashboard?: Record<string, any>;
      Dashboard?: Record<string, any>;
    }>(
      `${this.baseUrl}/trade-licence/admin/dashboard`,
      { params: httpParams }
    );
  }
  
  get<T>(url: string) {
    return this.http.get<T>(`${this.baseUrl}${url}`);
  }

  post<T>(url: string, body: any) {
    return this.http.post<T>(`${this.baseUrl}${url}`, body);
  }

  put<T>(url: string, body: any) {
    return this.http.put<T>(`${this.baseUrl}${url}`, body);
  }
  
  getAdminStatusCount(url: string) {
    return this.http.get<PortalAdminModel[]>(`${this.baseUrl}${url}`);
  }

  getAdminApplications(params: {
    zoneId?: number | null;
    mohId?: number | null;
    wardId?: number | null;
    licenceApplicationId?: number | null;
    applicationNumber?: string | null;
    pageNumber?: number;
    pageSize?: number;
  }) {
    let httpParams = new HttpParams()
      .set('pageNumber', (params.pageNumber ?? 1).toString())
      .set('pageSize', (params.pageSize ?? 10).toString());

    if (params.zoneId) httpParams = httpParams.set('zoneId', params.zoneId.toString());
    if (params.mohId) httpParams = httpParams.set('mohId', params.mohId.toString());
    if (params.wardId) httpParams = httpParams.set('wardId', params.wardId.toString());
    if (params.licenceApplicationId) {
      httpParams = httpParams.set(
        'licenceApplicationId',
        params.licenceApplicationId.toString()
      );
    }
    if (params.applicationNumber) {
      httpParams = httpParams.set('applicationNumber', params.applicationNumber);
    }

    return this.http.get<any>(
      `${this.baseUrl}/trade-licence/admin/applications`,
      { params: httpParams }
    );
  }
}

