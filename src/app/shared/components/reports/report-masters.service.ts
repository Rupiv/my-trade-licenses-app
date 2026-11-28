import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

/** A row of GET /financial-years (FinancialYearDto, camelCase; note the DB spelling "finanical"). */
export interface ReportFinancialYear {
  id: number;
  label: string;
}

/** A row of GET /gba/corporations. */
export interface ReportCorporation {
  id: number;
  name: string;
}

/**
 * Master data the report filters need (financial years, GBA corporations).
 * Both GETs are open to every signed-in staff role.
 */
@Injectable({ providedIn: 'root' })
export class ReportMastersService {
  private readonly baseUrl = '/api/api'; // proxy through Angular in dev

  constructor(private http: HttpClient) {}

  getFinancialYears(): Observable<ReportFinancialYear[]> {
    return this.http.get<any[]>(`${this.baseUrl}/financial-years`).pipe(
      map(rows => (rows ?? [])
        .map(r => ({
          id: Number(pickValue(r, ['finanicalYearID', 'FinanicalYearID', 'financialYearID', 'FinancialYearID'])),
          label: String(pickValue(r, ['financialYear', 'FinancialYear']) ?? '')
        }))
        .filter(fy => Number.isFinite(fy.id) && fy.id > 0))
    );
  }

  getCorporations(): Observable<ReportCorporation[]> {
    return this.http.get<any[]>(`${this.baseUrl}/gba/corporations`).pipe(
      map(rows => (rows ?? [])
        .map(r => ({
          id: Number(pickValue(r, ['corporationID', 'CorporationID', 'corporationId', 'CorporationId'])),
          name: String(pickValue(r, ['corporationName', 'CorporationName']) ?? '')
        }))
        .filter(c => Number.isFinite(c.id) && c.id > 0))
    );
  }
}

/**
 * Report procedures return Dapper rows whose keys keep the SQL column casing, so a value may arrive
 * as "TotalDemand" or "totalDemand". Returns the first key present (case-insensitive fallback).
 */
export function pickValue(row: any, keys: string[]): any {
  if (!row || typeof row !== 'object') return undefined;
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  const lower = new Map(Object.keys(row).map(k => [k.toLowerCase(), k]));
  for (const k of keys) {
    const actual = lower.get(k.toLowerCase());
    if (actual !== undefined && row[actual] !== undefined && row[actual] !== null) return row[actual];
  }
  return undefined;
}

export function pickNumber(row: any, keys: string[]): number {
  const n = Number(pickValue(row, keys));
  return Number.isFinite(n) ? n : 0;
}

export function pickString(row: any, keys: string[]): string {
  const v = pickValue(row, keys);
  return v === undefined || v === null ? '' : String(v);
}

/**
 * The financial year in progress (April–March), matched against the master's label
 * (e.g. "2025-2026", "2025-26", "2025–2026"). Falls back to the highest id.
 */
export function defaultFinancialYearId(years: ReportFinancialYear[], today = new Date()): number | null {
  if (!years.length) return null;
  const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const current = years.find(fy => fy.label.trim().startsWith(String(startYear)));
  if (current) return current.id;
  return years.reduce((a, b) => (b.id > a.id ? b : a)).id;
}

/** Message shown when a report request fails (403: the API explains why, e.g. admin-only reports). */
export function reportErrorMessage(err: any): { message: string; type: 'warning' | 'error' } {
  const message = err?.error?.message || err?.error?.Message ||
    (err?.status === 403 ? 'This report is not available for your role.' : 'Unable to load the report. Please try again.');
  return { message, type: err?.status === 403 ? 'warning' : 'error' };
}
