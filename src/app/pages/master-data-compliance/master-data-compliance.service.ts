import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MLCConstituency, TradeMajor, TradeMinor, TradeSub, TradeType, Ward, ZoneClassification, Zones } from '../../core/models/new-trade-licenses.model';

@Injectable({
  providedIn: 'root'
})
export class MasterDataComplianceService {

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
  getTradeMajors() {
    return this.get<TradeMajor[]>('/master/trade-major');
  }
  createMajorTrade(payload: any) {
    return this.http.post(`${this.baseUrl}master/trade-major`, payload);
  }
  updateMajorTrade(id: number, payload: any) {
    return this.http.put(`${this.baseUrl}master/trade-major/${id}`, payload);
  }

  getTradeMinorsByMajor(majorId: number) {
    return this.get<TradeMinor[]>(`/master/trade-minor/by-major/${majorId}`);
  }
  createMinorTrade(payload: any) {
    return this.http.post(`${this.baseUrl}master/trade-minor`, payload);
  }
  updateMinorTrade(id: number, payload: any) {
    return this.http.put(`${this.baseUrl}master/trade-minor/${id}`, payload);
  }

  getTradeSubsByMinor(minorId: number) {
    return this.get<TradeSub[]>(`/master/trade-sub/by-minor/${minorId}`);
  }
  createSubTrade(payload: any) {
    return this.http.post(`${this.baseUrl}master/trade-sub`, payload);
  }
  updateSubTrade(id: number, payload: any) {
    return this.http.put(`${this.baseUrl}master/trade-sub/${id}`, payload);
  }

  getTradeTypes(){
    return this.get<TradeType[]>('/trade-type');
  }
  createTradeType(payload: any) {
    return this.http.post(`${this.baseUrl}trade-type`, payload);
  }
  updateTradeType(id: number, payload: any) {
    return this.http.put(`${this.baseUrl}trade-type/${id}`, payload);
  }

  getMLAConstituency(){
    return this.get<MLCConstituency[]>('/master-moh');
  }
  createMLA(payload: any) {
    return this.http.post(`${this.baseUrl}master-moh`, payload);
  }
  updateMLA(id: number, payload: any) {
    return this.http.put(`${this.baseUrl}master-moh/${id}`, payload);
  }

  getWardsByMLAConstituency(mlaId: number) {
    return this.get<Ward[]>(`/bbmp-wards/by-constituency/${mlaId}`);
  }
  createWard(payload: any) {
    return this.http.post(`${this.baseUrl}bbmp-wards`, payload);
  }
  updateWard(payload: any) {
    return this.http.put(`${this.baseUrl}bbmp-wards`, payload);
  }

  getZones(){
    return this.get<Zones[]>('/bbmp-zones');
  }
  createZone(payload: any) {
    return this.http.post(`${this.baseUrl}bbmp-zones`, payload);
  }
  updateZone(id: number, payload: any) {
    return this.http.put(`${this.baseUrl}bbmp-zones/${id}`, payload);
  }

  getZoneClassification(){
    return this.get<ZoneClassification[]>('/trade-zonal-classification');
  }
  createZoneClassification(payload: any) {
    return this.http.post(`${this.baseUrl}trade-zonal-classification`, payload);
  }
  updateZoneClassification(id: number, payload: any) {
    return this.http.put(`${this.baseUrl}trade-zonal-classification/${id}`, payload);
  }
}

