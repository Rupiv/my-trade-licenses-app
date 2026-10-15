import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Everything about one application (Licence_Application_Temp id) for the trader's View page. */
export interface ApplicationView {
  application: any;          // header, applicant, address, status, old ward / MOH
  /** Applicant / address / ward / MOH from the licence record (final once submitted) */
  master: any | null;
  /** Paid, but never submitted to the officers (payment redirect failed) */
  awaitingSubmission: boolean;
  /** The submitted application (Licence_Application): its status is the live one. Null while a draft. */
  final: {
    licenceApplicationID: number;
    applicationNumber: string | null;
    applicationSubmitDate: string | null;
    acknowledgementNumber: string | null;
    licenceApplicationStatusID: number;
    statusName: string | null;
  } | null;
  /** Workflow history of the submitted application (raw rows from usp_Licence_SubmitAction GET) */
  timeline: any[];
  extra: {
    zoneName: string | null;
    wardNo: string | null;
    zonalClassificationName: string | null;
    tradeTypeName: string | null;
    landLineNumber: string | null;
    licenceNumber: string | null;
    newlicenceNumber: string | null;
  } | null;
  gba: {
    corporationName: string;
    corporationNativeName: string | null;
    zoneName: string;
    wardNo: number;
    wardName: string;
    wardNativeName: string | null;
    assemblyName: string | null;
  } | null;
  trades: {
    tradeMajorName: string;
    tradeMinorName: string;
    tradeSubName: string;
    tradeFee: number;
  }[];
  documents: {
    ApplicationDocumentID: number;
    DocumentID: number;
    documentName: string;
    FileName: string;
    EntryDate: string;
  }[];
  geo: {
    Latitude: number;
    Longitude: number;
    RoadWidthMtrs: number | null;
    RoadCategory: string | null;
  } | null;
  payments: {
    txnId: string;
    amount: number;
    status: string;
    paidOn: string;
    bankRefNo: string | null;
    gatewayTxnId: string | null;
    mode: string | null;
    message: string | null;
  }[];
  fees: {
    totalTradeFee: number;
    paymentStatus: string;
    amountPaid: number | null;
  };
}

@Injectable({ providedIn: 'root' })
export class ViewLicensesApplicationService {
  private readonly baseUrl = '/api/api';

  constructor(private readonly http: HttpClient) {}

  getApplication(licenceApplicationId: number): Observable<ApplicationView> {
    return this.http.get<ApplicationView>(`${this.baseUrl}/licence-application-view/${licenceApplicationId}`);
  }

  /** Same full view by the SUBMITTED application id (officer screens). */
  getSubmittedApplication(licenceApplicationId: number): Observable<ApplicationView> {
    return this.http.get<ApplicationView>(`${this.baseUrl}/licence-application-view/submitted/${licenceApplicationId}`);
  }

  completeSubmission(licenceApplicationId: number): Observable<{ submitted: boolean; applicationNumber?: string }> {
    return this.http.post<{ submitted: boolean; applicationNumber?: string }>(
      `${this.baseUrl}/licence-application-view/${licenceApplicationId}/complete-submission`, {}
    );
  }

  downloadDocument(applicationDocumentId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/licence-documents/download/${applicationDocumentId}`, {
      responseType: 'blob',
    });
  }
}
