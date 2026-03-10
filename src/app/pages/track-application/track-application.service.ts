import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';
import { LicenceProcessTimelineItem } from '../inspection/inspection.service';

export interface LicenceApplicationByLoginItem {
  licenceApplicationID: number;
  applicationNumber: string | null;
  tradeLicenceID: number;
  applicantName: string;
  tradeName: string;
  applicationSubmitDate: string;
  licenceApplicationStatusName: string;
  currentStatusDescription: string;
  doorNumber?: string | null;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
}

export interface LicenceApplicationByLoginResponse {
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  data: LicenceApplicationByLoginItem[];
}

interface LicenceProcessTimelineResponse {
  success?: boolean;
  licenceApplicationID?: number;
  timeline?: LicenceProcessTimelineItem[];
}

@Injectable({
  providedIn: 'root'
})
export class TrackApplicationService {

  private baseUrl = 'https://pickitover.com/api/api/'; // primary backend

  constructor(private http: HttpClient) {}

  private buildUrl(url: string): string {
    const normalizedBase = this.baseUrl.replace(/\/+$/, '');
    const normalizedPath = url.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
  }

  get<T>(url: string) {
    return this.http.get<T>(this.buildUrl(url)).pipe(timeout(10000));
  }

  post<T>(url: string, body: any) {
    return this.http.post<T>(this.buildUrl(url), body);
  }

  put<T>(url: string, body: any) {
    return this.http.put<T>(this.buildUrl(url), body);
  }

  getLicenceApplicationsByLogin(
    loginId: number,
    pageNumber: number,
    pageSize: number
  ): Observable<LicenceApplicationByLoginResponse> {
    return this.get<LicenceApplicationByLoginResponse>(
      `/licence-application/by-login/${loginId}?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
  }

  getLicenceProcessTimeline(licenceApplicationID: number) {
    return this.http
      .get<LicenceProcessTimelineItem[] | LicenceProcessTimelineResponse>(
        this.buildUrl(`/master/licence-process/application/${licenceApplicationID}/timeline`)
      )
      .pipe(
        timeout(10000),
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }
          return response?.timeline ?? [];
        })
      );
  }

  downloadGeneratedCertificate(licenceApplicationID: number): Observable<Blob> {
    return this.http.get(
      this.buildUrl(`/licence/certificate/generated/${licenceApplicationID}/download`),
      { responseType: 'blob' }
    ).pipe(timeout(15000));
  }
}


