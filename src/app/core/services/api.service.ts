import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = '/api/api'; // proxy through Angular in dev

  constructor(private http: HttpClient) {}

  private buildUrl(url: string): string {
    const normalizedBase = this.baseUrl.replace(/\/+$/, '');
    const normalizedPath = url.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
  }

  get<T>(url: string) {
    return this.http.get<T>(this.buildUrl(url));
  }

  post<T>(url: string, body: any) {
    return this.http.post<T>(this.buildUrl(url), body);
  }

  put<T>(url: string, body: any) {
    return this.http.put<T>(this.buildUrl(url), body);
  }
}
