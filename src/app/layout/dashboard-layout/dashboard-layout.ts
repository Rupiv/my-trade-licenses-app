import { Component, DestroyRef, HostListener, afterNextRender, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { normalizeRole } from '../../core/utils/role-home';

/** Below this width (Bootstrap `lg`) the sidebar becomes an off-canvas drawer. */
const MOBILE_BREAKPOINT_PX = 992;

const PORTAL_SUBTITLES: Record<string, string> = {
  admin: 'Admin Portal',
  approver: 'Approving Officer Portal',
  seniorapprover: 'Senior Approving Officer Portal',
  zoneapprover: 'Zone Approver Portal',
  trader: 'Trader Portal',
};

@Component({
  selector: 'app-dashboard-layout',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly tokenService = inject(TokenService);
  private readonly destroyRef = inject(DestroyRef);

  /** Desktop: narrow icon-only sidebar. */
  readonly isSidebarCollapsed = signal(false);
  /** Mobile: drawer open over the content. */
  readonly isMobileMenuOpen = signal(false);
  readonly isMobile = signal(false);
  readonly isWorkflowMenuOpen = signal(false);

  role = '';
  userFullName = '';
  userEmailID = '';

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => {
        this.isMobileMenuOpen.set(false);
        this.syncWorkflowMenu(e.urlAfterRedirects);
      });

    afterNextRender(() => this.updateViewport());
  }

  ngOnInit() {
    this.role = this.tokenService.getUserRole();
    this.userEmailID = this.tokenService.getUserEmail();
    this.userFullName = this.tokenService.getUserFullName();
    this.syncWorkflowMenu(this.router.url);
  }

  get normalizedRole(): string {
    return normalizeRole(this.role);
  }

  get isAdminRole(): boolean {
    return this.normalizedRole === 'admin';
  }

  get isSeniorApproverRole(): boolean {
    return this.normalizedRole === 'seniorapprover' || this.normalizedRole === 'seniorapprovingofficer';
  }

  get isApproverRole(): boolean {
    return this.normalizedRole === 'approver' || this.normalizedRole === 'approvingofficer';
  }

  get isZoneApproverRole(): boolean {
    return this.normalizedRole === 'zoneapprover' || this.normalizedRole === 'zonalapprover';
  }

  get isTradeOwnerRole(): boolean {
    return this.normalizedRole === 'tradeowner' || this.normalizedRole === 'trader';
  }

  get portalSubtitle(): string {
    if (this.isAdminRole) return PORTAL_SUBTITLES['admin'];
    if (this.isSeniorApproverRole) return PORTAL_SUBTITLES['seniorapprover'];
    if (this.isApproverRole) return PORTAL_SUBTITLES['approver'];
    if (this.isZoneApproverRole) return PORTAL_SUBTITLES['zoneapprover'];
    return PORTAL_SUBTITLES['trader'];
  }

  /** Hamburger: collapses the sidebar on desktop, opens / closes the drawer on mobile. */
  toggleSidebar(): void {
    if (this.isMobile()) {
      this.isMobileMenuOpen.update((open) => !open);
    } else {
      this.isSidebarCollapsed.update((collapsed) => !collapsed);
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleWorkflowMenu(): void {
    this.isWorkflowMenuOpen.update((open) => !open);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  @HostListener('window:resize')
  updateViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const mobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
    this.isMobile.set(mobile);
    if (!mobile) {
      this.isMobileMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isMobileMenuOpen.set(false);
  }

  /** Keeps the admin "Approval Workflows" group open while one of its pages is shown. */
  private syncWorkflowMenu(url: string): void {
    if (url.startsWith('/admin/workflows')) {
      this.isWorkflowMenuOpen.set(true);
    }
  }
}
