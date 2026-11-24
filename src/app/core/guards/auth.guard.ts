import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  // canActivate(): boolean {

  //   if (this.auth.isLoggedIn()) {
  //     return true;
  //   }

  //   this.router.navigate(['/login']);
  //   return false;
  // }
  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {

    const token = this.auth.getToken(); // use service

    // Keep where the user was going (e.g. payment-success coming back from the gateway
    // after the session expired) so login can send them back there.
    if (!token || this.auth.isTokenExpired(token)) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    return true;
  }
}
