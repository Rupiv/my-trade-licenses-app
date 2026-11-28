import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RevenueCollectionQuery, RevenueCollectionResponse } from './revenue-collection.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RevenueCollectionService {

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

  /** GET /reports/revenue-collection?corporationId=&fromDate=&toDate= (usp_Report_RevenueCollection). */
  getRevenueCollection(query: RevenueCollectionQuery = {}): Observable<RevenueCollectionResponse> {
    let params = new HttpParams();
    if (query.corporationId) params = params.set('corporationId', query.corporationId);
    if (query.fromDate) params = params.set('fromDate', query.fromDate);
    if (query.toDate) params = params.set('toDate', query.toDate);
    return this.http.get<RevenueCollectionResponse>(`${this.baseUrl}/reports/revenue-collection`, { params });
  }
}

