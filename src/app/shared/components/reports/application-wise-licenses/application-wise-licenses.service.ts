import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/** Filters of GET /trade-licence/admin/applications and /trade-licence/admin/dashboard. */
export interface ApplicationReportQuery {
  corporationId?: number | null;
  zoneId?: number | null;
  wardId?: number | null;
  applicationNumber?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationWiseLicensesService {

  private baseUrl = '/api/api'; // proxy through Angular in dev

  /** The API caps pageSize at 100 (TradeLicenceAdminController.GetApplications). */
  static readonly MAX_PAGE_SIZE = 100;

  constructor(private http: HttpClient) {}

  private filterParams(query: ApplicationReportQuery, params = new HttpParams()): HttpParams {
    if (query.corporationId) params = params.set('corporationId', query.corporationId);
    if (query.zoneId) params = params.set('zoneId', query.zoneId);
    if (query.wardId) params = params.set('wardId', query.wardId);
    const appNo = query.applicationNumber?.trim();
    if (appNo) params = params.set('applicationNumber', appNo);
    return params;
  }

  getApplications<T>(query: ApplicationReportQuery, pageNumber: number, pageSize: number): Observable<T> {
    const params = this.filterParams(query, new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', Math.min(pageSize, ApplicationWiseLicensesService.MAX_PAGE_SIZE)));
    return this.http.get<T>(`${this.baseUrl}/trade-licence/admin/applications`, { params });
  }

  /** Status counts for the same scope (the dashboard action has no application-number filter). */
  getDashboard(query: ApplicationReportQuery): Observable<any> {
    const params = this.filterParams({ ...query, applicationNumber: null });
    return this.http.get<any>(`${this.baseUrl}/trade-licence/admin/dashboard`, { params });
  }

  getZones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/bbmp-zones`);
  }

  /** All BBMP wards (wardID, wardName, zoneID); the page narrows them to the selected zone. */
  getWards(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/bbmp-wards`);
  }
}
