import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GbaCorporation, GbaWard, GbaZone, Zones } from '../../core/models/new-trade-licenses.model';

/* ======================================================
   MODELS
====================================================== */

export interface LoginMasterRequest {
  id?: number;
  login: string;
  password: string;
  officeDetailsID: number;       // ✅ confirmed in Swagger body
  userDesignationID: number;     // ✅ confirmed in Swagger body
  sakalaDO_Code: string;         // ✅ confirmed in Swagger body
  mobileNo: string;              // ✅ lowercase 'mobileNo' as Swagger shows
  updatedBy: number;             // ✅ confirmed in Swagger body
  // ⚠️ zoneID intentionally omitted — not in Swagger PUT body
}

export interface LoginMaster {
  id?: number;
  loginId?: number;
  loginID: number;
  login: string;
  password: string;
  zoneID: number;
  officeDetailsID: number;
  userDesignationID: number;
  sakalaDO_Code: string;
  MobileNo: string;
  isActive: string;
  entryDate?: string;
  updatedDate?: string;
  updatedBy?: number;
  officeName?: string;
  userDesignationName?: string;
}

export interface PagedResponse<T> {
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  data: T[];
}

export interface OfficeDetail {
  officeID: number;
  officeName: string;
}

/** One active GBA assignment row of a user (ward / zone are null for a wider assignment) */
export interface UserJurisdiction {
  loginID: number;
  corporationID: number;
  corporationName: string;
  gbaZoneID: number | null;
  zoneName: string | null;
  gbaWardID: number | null;
  wardNo: number | null;
  wardName: string | null;
}

export interface UserJurisdictionRequest {
  corporationID: number | null;   // null = remove GBA assignment
  gbaZoneID: number | null;
  gbaWardIDs: number[];
}

export interface UserDesignation {
  userDesignationId: number;
  userDesignationName: string;
  isActive: string;
}

/* ======================================================
   SERVICE
====================================================== */

@Injectable({ providedIn: 'root' })
export class UsersRolesService {

  // ✅ Confirmed from Swagger: real base is /api/api
  private readonly baseUrl = '/api/api';

  // No leading slash — baseUrl already has no trailing slash
  private readonly loginMasterUrl = `${this.baseUrl}/login-master`;
  private readonly searchUrl      = `${this.loginMasterUrl}/search`;
  private readonly officeUrl      = `${this.baseUrl}/office-details/api/getall`;
  private readonly designationUrl = `${this.baseUrl}/office-details/api/get-all-user-designation`;
  private readonly zonesUrl       = `${this.baseUrl}/bbmp-zones`;
  private readonly gbaUrl         = `${this.baseUrl}/gba`;

  constructor(private readonly http: HttpClient) {}

  /* ─── GET (paginated) ────────────────────────────────
     GET /api/login-master?pageNumber=1&pageSize=10
  ──────────────────────────────────────────────────── */
  getUsers(pageNumber: number, pageSize: number): Observable<PagedResponse<LoginMaster>> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    return this.http.get<PagedResponse<LoginMaster>>(this.loginMasterUrl, { params });
  }

  /* ─── SEARCH (paginated) ─────────────────────────────
     GET /api/login-master/search?q=abc&pageNumber=1&pageSize=10
  ──────────────────────────────────────────────────── */
  searchUsers(query: string, pageNumber: number, pageSize: number): Observable<PagedResponse<LoginMaster>> {
    const params = new HttpParams()
      .set('q', query)
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    return this.http.get<PagedResponse<LoginMaster>>(this.searchUrl, { params });
  }

  /* ─── GET BY ID ──────────────────────────────────────
     GET /api/login-master/{id}
  ──────────────────────────────────────────────────── */
  getUserById(id: number): Observable<LoginMaster> {
    return this.http.get<LoginMaster>(`${this.loginMasterUrl}/${id}`);
  }

  /* ─── INSERT ─────────────────────────────────────────
     POST /api/login-master
  ──────────────────────────────────────────────────── */
  addUser(payload: LoginMasterRequest): Observable<any> {
    return this.http.post<any>(this.loginMasterUrl, payload);
  }

  /* ─── UPDATE ─────────────────────────────────────────
     PUT /api/login-master/{id}
     ✅ FIXED URL: was hitting /api/api//login-master/{id}
  ──────────────────────────────────────────────────── */
  updateUser(id: number, payload: LoginMasterRequest): Observable<any> {
    return this.http.put<any>(`${this.loginMasterUrl}/${id}`, payload);
  }

  /* ─── DELETE ─────────────────────────────────────────
     DELETE /api/login-master/{id}?updatedBy=1
     ✅ FIXED URL: was hitting /api/api//login-master/{id}
  ──────────────────────────────────────────────────── */
  deleteUser(id: number, updatedBy: number): Observable<any> {
    const params = new HttpParams().set('updatedBy', updatedBy);
    return this.http.delete<any>(`${this.loginMasterUrl}/${id}`, { params });
  }

  /* ─── DROPDOWNS ──────────────────────────────────────*/
  getOfficeDetails(): Observable<OfficeDetail[]> {
    return this.http.get<OfficeDetail[]>(this.officeUrl);
  }

  getUserDesignations(): Observable<UserDesignation[]> {
    return this.http.get<UserDesignation[]>(this.designationUrl);
  }

  getZones(): Observable<Zones[]> {
    return this.http.get<Zones[]>(this.zonesUrl);
  }

  /* ─── GBA JURISDICTION (Corporation / Zone / Wards) ──
     Saved separately from login-master, so the existing user flow is unchanged.
  ──────────────────────────────────────────────────── */
  getCorporations(): Observable<GbaCorporation[]> {
    return this.http.get<GbaCorporation[]>(`${this.gbaUrl}/corporations`);
  }

  getGbaZones(corporationId: number): Observable<GbaZone[]> {
    return this.http.get<GbaZone[]>(`${this.gbaUrl}/corporations/${corporationId}/zones`);
  }

  getGbaWards(corporationId: number, zoneId?: number | null): Observable<GbaWard[]> {
    let params = new HttpParams().set('corporationId', corporationId);
    if (zoneId) params = params.set('zoneId', zoneId);
    return this.http.get<GbaWard[]>(`${this.gbaUrl}/wards`, { params });
  }

  getUserJurisdiction(loginId: number): Observable<UserJurisdiction[]> {
    return this.http.get<UserJurisdiction[]>(`${this.gbaUrl}/user-jurisdiction/${loginId}`);
  }

  getUserJurisdictions(loginIds: number[]): Observable<UserJurisdiction[]> {
    const params = new HttpParams().set('loginIds', loginIds.join(','));
    return this.http.get<UserJurisdiction[]>(`${this.gbaUrl}/user-jurisdiction`, { params });
  }

  saveUserJurisdiction(loginId: number, req: UserJurisdictionRequest): Observable<any> {
    return this.http.put<any>(`${this.gbaUrl}/user-jurisdiction/${loginId}`, req);
  }
}
