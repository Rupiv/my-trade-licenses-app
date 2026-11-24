import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { TokenService } from '../services/token.service';

@Injectable({
  providedIn: 'root'
})

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

    constructor(
        private router: Router,
        private tokenService: TokenService
    ) {}

    private normalizeRole(role: string | null | undefined): string {
        return (role ?? '').toLowerCase().replace(/[\s_-]+/g, '');
    }

    canActivate(route: ActivatedRouteSnapshot): boolean {
        const expectedRoles = (route.data['roles'] ?? []) as string[];
        const userRole = this.normalizeRole(
            this.tokenService.getEffectiveRole() ||
            this.tokenService.getUserRole() ||
            this.tokenService.getRole()
        );

        const normalizedExpectedRoles = expectedRoles.map(role => this.normalizeRole(role));

        if (!userRole || !normalizedExpectedRoles.includes(userRole)) {
            this.router.navigate(['/login']);
            return false;
        }

        return true;
    }
}

