import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AssemblyConstituency, LicenseDocuments, MLCConstituency, RoadWidthDetails, TradeLicenseApplicationDetails, TradeLicensesFee, TradeMajor, TradeMinor, TradeSub, TradeType, Ward, ZoneClassification, Zones } from '../../core/models/new-trade-licenses.model';
import { platform } from 'os';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NewLicensesService {

  private baseUrl = 'https://pickitover.com/api/api/'; // 👈 change to your backend

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

  getTradeMajors() {
    return this.get<TradeMajor[]>('/master/trade-major');
  }

  getTradeMinorsByMajor(majorId: number) {
    return this.get<TradeMinor[]>(`/master/trade-minor/by-major/${majorId}`);
  }

  getTradeSubsByMinor(minorId: number) {
    return this.get<TradeSub[]>(`/master/trade-sub/by-minor/${minorId}`);
  }

  getTradeTypes(){
    return this.get<TradeType[]>('/trade-type');
  }

  getMLAConstituency(){
    return this.get<MLCConstituency[]>('/master-moh');
  }

  getWardsByMLAConstituency(mlaId: number) {
    return this.get<Ward[]>(`/bbmp-wards/by-constituency/${mlaId}`);
  }

  getZones(){
    return this.get<Zones[]>('/bbmp-zones');
  }
getLicenceApplicationById(id: number) {
  return this.http.get<any>(
    `${this.baseUrl}/licence-application/${id}`
  );
}

getDraftByLogin(loginId: number) {
  return this.http.get<any>(
    `${this.baseUrl}/licence-application/by-login/${loginId}`
  );
}

  getZoneClassification(){
    return this.get<ZoneClassification[]>('/trade-zonal-classification');
  }

  sendOtp(phone: string) {
    // return this.http.post<any>(
    //   `${this.baseUrl}/sms/otp/send`,
    //   {
    //     mobileNo: phone
    //   },
    //   {
    //     headers: { 'Content-Type': 'application/json' }
    //   }
    // );
    return of({
      isMock: true,
      mobileNo: phone,
      Message: 'OTP sent successfully (sample OTP: 123456)'
    });
  }

  verifyOtp(phone: string, otp: string) {
    // return this.http.post<any>(
    //   `${this.baseUrl}/sms/otp/verify`,
    //   {
    //     mobileNo: phone,
    //     otp: otp
    //   },
    //   {
    //     headers: { 'Content-Type': 'application/json' }
    //   }
    // );
    const isValid = otp === '123456';
    return of({
      isMock: true,
      mobileNo: phone,
      isValid,
      Message: isValid ? 'OTP verified' : 'Invalid OTP'
    });
  }

  saveDraftLicence(payload: any) {
    return this.post<any>('licence-application/draft', payload);
  }

  submitTradeLicence(payload: any) {
    return this.post<any>('trade-licence', payload);
  }

  getRoadWidth(payload: any) {
    return this.http.post<any>(this.buildUrl('/geolocation/fetch-road'), payload);
  }

  getLicensesFee(tradeSubId: number) {
    return this.get<TradeLicensesFee>(`/trade-licence-fees/by-trade-sub/${tradeSubId}`);
  }

  saveOrUpdateDocument(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/licence-documents/save-update`,formData);
  }

  getDocumentsByLicensesApplicationId(licenceApplicationID: number): Observable<LicenseDocuments[]> {
    return this.http.get<LicenseDocuments[]>(
      `${this.baseUrl}/licence-documents/by-application/${licenceApplicationID}`
    );
  }

  saveLocationDetails(payload: any){
    return this.http.post<any>(`${this.baseUrl}/geolocation/confirm-save`, payload);
  }

  paymentIntiate(payload: any){
    return this.http.post<any>(`${this.baseUrl}/payment/initiate`, payload);
  }

  saveTradeDetailTemp(payload: {
    licenceApplicationID: number;
    tradeSubID: number;
    tradeFee: number;
  }) {
    return this.http.post<any>(`${this.baseUrl}/licence-trade-details/temp`, payload);
  }
}

