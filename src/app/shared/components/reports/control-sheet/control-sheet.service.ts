import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ControlSheetResponse } from './control-sheet.model';

@Injectable({
  providedIn: 'root'
})
export class ControlSheetService {

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

  /** GET /reports/control-sheet?financialYearID= (usp_Report_ControlSheet). */
  getControlSheet(financialYearID: number | null): Observable<ControlSheetResponse> {
    let params = new HttpParams();
    if (financialYearID) params = params.set('financialYearID', financialYearID);
    return this.http.get<ControlSheetResponse>(`${this.baseUrl}/reports/control-sheet`, { params });
  }
}
