import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RevenueCollectionResponse } from './revenue-collection.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RevenueCollectionService {

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

  getRevenueCollection(): Observable<RevenueCollectionResponse> {
    return this.http.get<RevenueCollectionResponse>(
      `${this.baseUrl}reports/revenue-collection`
    );
  }
}

