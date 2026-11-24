import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { GbaCorporation } from '../models/new-trade-licenses.model';
import { CorporationTemplate, findCorporationTemplate } from '../config/corporation-templates.config';

/** A configured template together with the corporation row it matched in the GBA master. */
export interface ResolvedCorporationTemplate extends CorporationTemplate {
  /** From GET /gba/corporations; null if the master could not be loaded. */
  corporationID: number | null;
}

/**
 * Resolves an application's corporation to its document template. Corporation IDs come from the
 * GBA master (GET /gba/corporations), never from constants.
 */
@Injectable({ providedIn: 'root' })
export class CorporationTemplateService {
  private corporations$?: Observable<GbaCorporation[]>;

  constructor(private readonly api: ApiService) {}

  /** GBA corporation master, loaded once per session. An empty list if the call fails. */
  getCorporations(): Observable<GbaCorporation[]> {
    if (!this.corporations$) {
      this.corporations$ = this.api.get<GbaCorporation[]>('/gba/corporations').pipe(
        map((rows) => rows ?? []),
        catchError(() => of([] as GbaCorporation[])),
        shareReplay(1)
      );
    }
    return this.corporations$;
  }

  /**
   * Template for a corporation name (or code). Emits null when the application has no GBA
   * corporation, so callers fall back to the legacy BBMP certificate.
   */
  resolve(corporationName: string | null | undefined): Observable<ResolvedCorporationTemplate | null> {
    const template = findCorporationTemplate(corporationName);
    if (!template) {
      return of(null);
    }
    return this.getCorporations().pipe(
      map((rows) => {
        const match = rows.find((r) => findCorporationTemplate(r.corporationName)?.key === template.key);
        return { ...template, corporationID: match?.corporationID ?? null };
      })
    );
  }
}
