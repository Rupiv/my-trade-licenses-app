import { Injectable, computed, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { getRoleHomeRoute } from '../utils/role-home';

/** A router target: path plus optional query params / fragment. */
export interface PortalLink {
  link: string;
  queryParams?: Record<string, string>;
  fragment?: string;
}

/**
 * Signed-in state for the public pages (Home, Help & Support) and the links that depend on it.
 *
 * Call `refresh()` from `afterNextRender`: the server render has no token, so reading the session
 * during the first render would make the hydrated DOM differ from the server HTML.
 */
@Injectable({ providedIn: 'root' })
export class PortalSessionService {
  /** Dashboard of the signed-in user's role; null when signed out, expired or role unmapped. */
  private readonly roleHomeState = signal<string | null>(null);

  readonly roleHome = this.roleHomeState.asReadonly();
  readonly isSignedIn = computed(() => this.roleHomeState() !== null);
  readonly isTrader = computed(() => this.roleHomeState() === '/trader');
  readonly dashboardLink = computed(() => this.roleHomeState() ?? '/login');

  /** "Apply for New License": registration for visitors, the new-licence form for a signed-in trader. */
  readonly applyLink = computed<PortalLink>(() =>
    this.isTrader()
      ? { link: '/trader/new-licenses' }
      : this.isSignedIn()
        ? { link: this.dashboardLink() }
        : { link: '/create-account' }
  );
  readonly trackLink = computed<PortalLink>(() => this.traderLink('track-application'));
  /** The trader dashboard ("My Licenses": applications, payments, certificates). */
  readonly myLicencesLink = computed<PortalLink>(() => this.traderLink('trader-licenses'));

  constructor(
    private auth: AuthService,
    private tokenService: TokenService
  ) {}

  /** Reads the stored session; an expired token counts as signed out. */
  refresh(): void {
    if (!this.auth.isLoggedIn()) {
      this.roleHomeState.set(null);
      return;
    }
    const role =
      this.tokenService.getEffectiveRole() ||
      this.tokenService.getUserRole() ||
      this.tokenService.getRole();
    this.roleHomeState.set(getRoleHomeRoute(role));
  }

  signOut(): void {
    this.auth.logout();
    this.refresh();
  }

  /**
   * A trader page: opened directly for a signed-in trader; other signed-in roles go to their own
   * dashboard; visitors go to the OTP login, which returns them to the page afterwards.
   */
  traderLink(page: string): PortalLink {
    const target = `/trader/${page}`;
    if (this.isTrader()) {
      return { link: target };
    }
    if (this.isSignedIn()) {
      return { link: this.dashboardLink() };
    }
    return { link: '/login', queryParams: { mode: 'user', returnUrl: target } };
  }
}
