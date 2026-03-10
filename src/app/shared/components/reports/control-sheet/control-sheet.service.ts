import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ControlSheetResponse } from './control-sheet.model';

@Injectable({
  providedIn: 'root'
})
export class ControlSheetService {

  private baseUrl = 'https://pickitover.com/api/api/'; // 👈 change to your backend

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

  
  getControlSheet(financialYearID: number): Observable<ControlSheetResponse> {
    return this.http.get<ControlSheetResponse>(
      `${this.baseUrl}reports/control-sheet?financialYearID=${financialYearID}`
    );
  }
}

