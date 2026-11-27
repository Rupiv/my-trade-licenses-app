import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Designation {
  userDesignationID: number;
  userDesignationName: string;
  isActive: string;
}

export interface OfficeType {
  officeTypeID: number;
  officeTypeName: string;
  isActive: string;
}

export interface OfficeDetail {
  officeDetailsID: number;
  officeName: string;
  officeID: number;
  officeTypeID: number;
  branchAddress: string | null;
  contactPerson: string | null;
  emailID: string | null;
  contactNO: string | null;
  officeTypeName?: string;
}

@Injectable({ providedIn: 'root' })
export class MasterOfficeDesignationService {
  private readonly base = '/api/api';

  constructor(private http: HttpClient) {}

  // ─── Designations ───
  getDesignations(): Observable<Designation[]> {
    return this.http.get<Designation[]>(`${this.base}/designations`);
  }

  createDesignation(name: string): Observable<any> {
    return this.http.post(`${this.base}/designations`, { userDesignationName: name, isActive: true });
  }

  updateDesignation(id: number, name: string, isActive: boolean): Observable<any> {
    return this.http.put(`${this.base}/designations/${id}`, { userDesignationName: name, isActive });
  }

  deleteDesignation(id: number): Observable<any> {
    return this.http.delete(`${this.base}/designations/${id}`);
  }

  // ─── Office Types ───
  getOfficeTypes(pageNumber = 1, pageSize = 100): Observable<any> {
    return this.http.get(`${this.base}/office-types?pageNumber=${pageNumber}&pageSize=${pageSize}`);
  }

  createOfficeType(name: string): Observable<any> {
    return this.http.post(`${this.base}/office-types`, { officeTypeName: name, isActive: true });
  }

  updateOfficeType(id: number, name: string, isActive: boolean): Observable<any> {
    return this.http.put(`${this.base}/office-types/${id}`, { officeTypeName: name, isActive });
  }

  deleteOfficeType(id: number): Observable<any> {
    return this.http.delete(`${this.base}/office-types/${id}`);
  }

  // ─── Office Details ───
  getOfficeDetails(): Observable<OfficeDetail[]> {
    return this.http.get<OfficeDetail[]>(`${this.base}/office-details/api/getall`);
  }

  createOfficeDetail(payload: Partial<OfficeDetail>): Observable<any> {
    return this.http.post(`${this.base}/office-details`, payload);
  }

  updateOfficeDetail(id: number, payload: Partial<OfficeDetail>): Observable<any> {
    return this.http.put(`${this.base}/office-details/${id}`, payload);
  }

  deleteOfficeDetail(id: number): Observable<any> {
    return this.http.delete(`${this.base}/office-details/${id}`);
  }
}
