import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private tokenService: TokenService) {}

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');
      return parsed.toString();
    } catch {
      return url.replace(/([^:]\/)\/+/g, '$1');
    }
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const normalizedUrl = this.normalizeUrl(req.url);

    if (normalizedUrl !== req.url) {
      req = req.clone({ url: normalizedUrl });
    }

    const token = this.tokenService.getToken();

    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req).pipe(
      catchError((error: any) => {

        // Only treat a 401 as "the session is dead" when the token itself is actually
        // expired - not every 401 means that (a single unrelated endpoint failing with
        // 401 must not wipe out an otherwise-valid session, e.g. mid payment-gateway flow).
        if (error.status === 401 && this.isTokenExpired(token)) {
          this.tokenService.logout();
        }

        return throwError(() => error);
      })
    );
  }

  private isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return true;
      return Date.now() > payload.exp * 1000;
    } catch {
      return true;
    }
  }

}

