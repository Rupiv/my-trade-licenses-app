import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

    constructor(private router: Router) {}

    canActivate(route: ActivatedRouteSnapshot): boolean {

        const expectedRoles = route.data['roles'];
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (!user || !expectedRoles.includes(user.role)) {
        this.router.navigate(['/login']);
        return false;
        }

        return true;
    }
}

