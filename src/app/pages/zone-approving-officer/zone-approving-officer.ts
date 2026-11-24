import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { TokenService } from '../../core/services/token.service';
import { NotificationService } from '../../shared/components/notification/notification.service';
import {
  ZoneApproverApplication,
  ZoneApproverApplicationsResponse,
  ZoneApprovingOfficerService
} from './zone-approving-officer.service';

interface ZoneOption {
  id: number;
  name: string;
}

interface WardOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-zone-approving-officer',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './zone-approving-officer.html',
  styleUrl: './zone-approving-officer.css'
})
export class ZoneApprovingOfficer implements OnDestroy {
  private parallaxX = 0;
  private parallaxY = 0;
  applications: ZoneApproverApplication[] = [];
  filteredApplications: ZoneApproverApplication[] = [];
  pageApplications: ZoneApproverApplication[] = [];

  // Full zone/ward list for this officer (from /lookup), independent of the loaded page
  zoneOptions: ZoneOption[] = [];
  wardOptions: WardOption[] = [];
  visibleStatuses: string[] = [];
  statusOptions: string[] = [];

  selectedZoneId: number | null = null;
  selectedWardId: number | null = null;
  selectedStatus = '';
  searchText = '';

  pageNumber = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50];
  totalRecords = 0;
  totalPages = 0;
  pages: number[] = [];
  isLoading = false;

  private filterTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly zoneApprovingOfficerService: ZoneApprovingOfficerService,
    private readonly tokenService: TokenService,
    private readonly notificationService: NotificationService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLookup();
    this.loadZoneApproverApplications();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.filterTimer) {
      clearTimeout(this.filterTimer);
    }
  }

  private loadLookup(): void {
    const loginId = this.tokenService.getUserId();
    if (!loginId) {
      return;
    }

    const sub = this.zoneApprovingOfficerService.getZoneApproverLookup(loginId).subscribe({
      next: (res: any) => {
        const rawZones = res?.zones ?? res?.Zones ?? [];
        const rawWards = res?.wards ?? res?.Wards ?? [];

        this.zoneOptions = rawZones
          .map((z: any) => ({
            id: Number(z?.zoneID ?? z?.ZoneID ?? z?.gbaZoneID ?? z?.GbaZoneID),
            name: String(z?.zoneName ?? z?.ZoneName ?? '').trim()
          }))
          .filter((z: ZoneOption) => Number.isFinite(z.id) && z.id > 0 && !!z.name);

        this.wardOptions = rawWards
          .map((w: any) => ({
            id: Number(w?.wardID ?? w?.WardID ?? w?.gbaWardID ?? w?.GbaWardID),
            name: String(w?.wardName ?? w?.WardName ?? '').trim()
          }))
          .filter((w: WardOption) => Number.isFinite(w.id) && w.id > 0 && !!w.name);

        if (this.selectedZoneId && !this.zoneOptions.some((z) => z.id === this.selectedZoneId)) {
          this.selectedZoneId = null;
        }
        if (this.selectedWardId && !this.wardOptions.some((w) => w.id === this.selectedWardId)) {
          this.selectedWardId = null;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        // Filter dropdowns stay empty; the application list itself still loads.
      }
    });

    this.subscriptions.add(sub);
  }

  loadZoneApproverApplications(): void {
    const loginId = this.tokenService.getUserId();
    if (!loginId) {
      this.notificationService.show('Invalid login id', 'warning');
      return;
    }

    this.isLoading = true;
    const currentRequest = ++this.requestId;

    const sub = this.zoneApprovingOfficerService
      .getZoneApproverApplications(loginId, this.pageNumber, this.pageSize, {
        mohId: this.selectedZoneId,
        wardId: this.selectedWardId,
        applicationNumber: this.searchText.trim() || null
      })
      .subscribe({
        next: (response: ZoneApproverApplicationsResponse) => {
          if (currentRequest !== this.requestId) {
            return;
          }

          this.applications = response?.data ?? response?.Data ?? [];
          this.totalRecords = Number(response?.totalRecords ?? response?.TotalRecords ?? 0);
          this.pageNumber = Number(response?.pageNumber ?? response?.PageNumber ?? this.pageNumber);
          this.pageSize = Number(response?.pageSize ?? response?.PageSize ?? this.pageSize);
          this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
          this.visibleStatuses = response?.visibleStatuses ?? response?.VisibleStatuses ?? [];

          this.statusOptions = this.buildStatusOptions();
          if (this.selectedStatus && !this.statusOptions.includes(this.selectedStatus)) {
            this.selectedStatus = '';
          }

          this.applyLocalFilters();
          this.generatePages();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          if (currentRequest !== this.requestId) {
            return;
          }

          this.applications = [];
          this.filteredApplications = [];
          this.pageApplications = [];
          this.totalRecords = 0;
          this.totalPages = 0;
          this.visibleStatuses = [];
          this.statusOptions = [];
          this.pages = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });

    this.subscriptions.add(sub);
  }

  onZoneChanged(): void {
    this.selectedWardId = null;
    this.pageNumber = 1;
    this.loadZoneApproverApplications();
  }

  onWardChanged(): void {
    this.pageNumber = 1;
    this.loadZoneApproverApplications();
  }

  onStatusChanged(): void {
    this.applyLocalFilters();
  }

  onSearchChanged(): void {
    if (this.filterTimer) {
      clearTimeout(this.filterTimer);
    }

    this.filterTimer = setTimeout(() => {
      this.pageNumber = 1;
      this.loadZoneApproverApplications();
    }, 300);
  }

  onOpenApplicationDetails(application: ZoneApproverApplication): void {
    if (!application.licenceApplicationID) {
      return;
    }
    this.router.navigate(
      ['/zone-approver/licence-applications', application.licenceApplicationID],
      { queryParams: { from: 'zone-approver' } }
    );
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }
    this.pageNumber = page;
    this.loadZoneApproverApplications();
  }

  onPageSizeChanged(value: number): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed === this.pageSize) {
      return;
    }
    this.pageSize = parsed;
    this.pageNumber = 1;
    this.loadZoneApproverApplications();
  }

  private generatePages(): void {
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.pageNumber - 2);
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    this.pages = [];

    for (let page = startPage; page <= endPage; page++) {
      this.pages.push(page);
    }
  }

  private applyLocalFilters(): void {
    // Zone/Ward/search are already applied server-side (loadZoneApproverApplications).
    // Status has no server filter param here, so it's applied client-side on the loaded page.
    const selectedStatus = this.selectedStatus.trim().toLowerCase();

    this.filteredApplications = !selectedStatus
      ? this.applications
      : this.applications.filter(
          (app) => (app.licenceApplicationStatusName || '').toLowerCase() === selectedStatus
        );

    this.pageApplications = this.filteredApplications;
  }

  private buildStatusOptions(): string[] {
    if (this.visibleStatuses.length > 0) {
      return [...this.visibleStatuses];
    }
    return Array.from(
      new Set(this.applications.map((app) => app.licenceApplicationStatusName).filter(Boolean))
    ).sort();
  }

  getStatusBadgeClass(statusName: string): string {
    const normalized = statusName?.trim().toUpperCase() ?? '';

    if (normalized === 'APPROVED') {
      return 'badge text-bg-success';
    }
    if (normalized === 'REJECTED') {
      return 'badge text-bg-danger';
    }
    if (normalized === 'OBJECTION') {
      return 'badge text-bg-warning text-dark';
    }
    if (normalized === 'INSPECTED') {
      return 'badge text-bg-info';
    }
    return 'badge text-bg-secondary';
  }

  get showingFrom(): number {
    if (!this.displayTotalRecords) {
      return 0;
    }
    return (this.pageNumber - 1) * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min((this.pageNumber - 1) * this.pageSize + this.pageApplications.length, this.displayTotalRecords);
  }

  get displayTotalRecords(): number {
    // Zone/Ward/search are server-side (totalRecords already reflects them); only Status is local.
    return this.selectedStatus.trim() ? this.filteredApplications.length : this.totalRecords;
  }

  onParallaxMove(event: MouseEvent): void {
    const host = event.currentTarget as HTMLElement | null;
    if (!host) {
      return;
    }
    const rect = host.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    this.parallaxX = Math.max(-1, Math.min(1, x));
    this.parallaxY = Math.max(-1, Math.min(1, y));
  }

  resetParallax(): void {
    this.parallaxX = 0;
    this.parallaxY = 0;
  }

  layerTransform(depth: number): string {
    return `translate3d(${this.parallaxX * depth}px, ${this.parallaxY * depth}px, 0)`;
  }
}
