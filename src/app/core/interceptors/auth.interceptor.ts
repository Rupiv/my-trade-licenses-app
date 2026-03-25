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

        if (error.status === 401) {
          // 🔥 AUTO LOGOUT WHEN TOKEN EXPIRES
          this.tokenService.logout();
        }

        return throwError(() => error);
      })
    );
  }

}

