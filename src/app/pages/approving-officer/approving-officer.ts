import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApprovingOfficerService } from './approving-officer.service';
import { ApprovedApplications, AllApprovedApplication } from '../../core/models/trade-licenses-details.model';
import { TokenService } from '../../core/services/token.service';
import { NotificationService } from '../../shared/components/notification/notification.service';

interface ZoneOption {
  id: number;
  name: string;
}

interface WardOption {
  id: number;
  name: string;
  zoneId: number | null;
}

@Component({
  selector: 'app-approving-officer',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './approving-officer.html',
  styleUrl: './approving-officer.css',
})
export class ApprovingOfficer implements OnDestroy {
  private readonly fixedStatusOptions: string[] = ['APPLIED', 'OBJECTION', 'REJECTED'];
  private bootstrapTimer: ReturnType<typeof setTimeout> | null = null;
  private parallaxX = 0;
  private parallaxY = 0;

  applications: AllApprovedApplication[] = [];
  filteredApplications: AllApprovedApplication[] = [];
  pageApplications: AllApprovedApplication[] = [];

  zoneOptions: ZoneOption[] = [];
  wardOptions: WardOption[] = [];
  statusOptions: string[] = [];
  visibleStatuses: string[] = [];

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
  private routeStatusId: number | null = null;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly approvingofficerService: ApprovingOfficerService,
    private readonly cdr: ChangeDetectorRef,
    private readonly tokenservice: TokenService,
    private readonly notificationservice: NotificationService
  ) {}

  ngOnInit(): void {
    this.readRouteFilters();
    this.bootstrapInitialLoad();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.filterTimer) {
      clearTimeout(this.filterTimer);
    }
    if (this.bootstrapTimer) {
      clearTimeout(this.bootstrapTimer);
      this.bootstrapTimer = null;
    }
  }

  onInspectionClick(applicationNo: number): void {
    if (!applicationNo) {
      return;
    }
    // Admin opens this queue from /admin/workflows; /approver/** is guarded to approvers,
    // so admin uses the admin application view instead.
    if (this.normalizeRole(this.tokenservice.getRole()) === 'admin') {
      this.router.navigate(['/admin/licence-applications', applicationNo]);
      return;
    }
    this.router.navigate(['/approver/inspection', applicationNo]);
  }

  /**
   * The approver API validates applicationNumber against ^[a-zA-Z0-9\-\/]*$ (max 50) and answers
   * 400 otherwise, so only such text is sent; anything else (e.g. a name with a space) is
   * matched on the loaded page.
   */
  get serverSearchText(): string {
    const text = this.searchText.trim();
    return text.length <= 50 && /^[a-zA-Z0-9\-\/]+$/.test(text) ? text : '';
  }

  /** Wards of the selected zone (GBA lookups carry ZoneID; others list one zone's wards only). */
  get filteredWardOptions(): WardOption[] {
    if (!this.selectedZoneId) {
      return this.wardOptions;
    }
    return this.wardOptions.filter((w) => w.zoneId === null || w.zoneId === this.selectedZoneId);
  }

  private normalizeRole(role: string | null | undefined): string {
    return (role ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  }

  loadAppliedApproverApplications(): void {
    this.isLoading = true;
    const loginId = this.resolveLoginId();
    if (!loginId) {
      this.notificationservice.show('Invalid login id', 'warning');
      this.isLoading = false;
      return;
    }

    // Also called from the debounced search timer: zoneless CD needs a nudge to show the spinner
    this.cdr.markForCheck();
    const currentRequest = ++this.requestId;
    const requestBody: Record<string, unknown> = {
      loginId,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    };

    if (this.selectedZoneId) {
      requestBody['mohId'] = this.selectedZoneId;
    }
    if (this.selectedWardId) {
      requestBody['wardId'] = this.selectedWardId;
    }
    if (this.serverSearchText) {
      requestBody['applicationNumber'] = this.serverSearchText;
    }

    const sub = this.approvingofficerService
      .getAppliedApproverApplications(requestBody as {
        loginId: number;
        mohId?: number;
        wardId?: number;
        licenceApplicationId?: number;
        applicationNumber?: string;
        pageNumber: number;
        pageSize: number;
      })
      .subscribe({
        next: (res: ApprovedApplications) => {
          if (currentRequest !== this.requestId) {
            return;
          }

          this.applications = res?.data ?? [];
          this.totalRecords = Number(res?.totalRecords ?? 0);
          this.pageNumber = Number(res?.pageNumber ?? this.pageNumber);
          this.pageSize = Number(res?.pageSize ?? this.pageSize);
          this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));

          this.visibleStatuses = this.buildVisibleStatuses(res?.status);
          this.statusOptions = this.buildStatusOptions();
          if (this.routeStatusId && !this.selectedStatus) {
            this.selectedStatus = this.mapStatusIdToName(this.routeStatusId);
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
          this.statusOptions = [];
          this.visibleStatuses = [];
          this.pages = [];
          this.isLoading = false;
          this.notificationservice.show('Unable to load the applications. Please try again.', 'error');
          this.cdr.detectChanges();
        }
      });

    this.subscriptions.add(sub);
  }

  onZoneChanged(): void {
    this.selectedWardId = null;
    this.pageNumber = 1;
    // Zone is a server filter (mohId), like Ward; filtering only the loaded page missed rows
    this.loadAppliedApproverApplications();
  }

  onWardChanged(): void {
    this.pageNumber = 1;
    this.loadAppliedApproverApplications();
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
      this.loadAppliedApproverApplications();
    }, 300);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }
    this.pageNumber = page;
    this.loadAppliedApproverApplications();
  }

  onPageSizeChanged(value: number): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed === this.pageSize) {
      return;
    }
    this.pageSize = parsed;
    this.pageNumber = 1;
    this.loadAppliedApproverApplications();
  }

  getStatusBadgeClass(statusName: string): string {
    const normalized = statusName?.trim().toUpperCase() ?? '';
    if (normalized.includes('APPLIED')) return 'status-badge applied';
    if (normalized.includes('OBJECTION')) return 'status-badge objection';
    if (normalized.includes('REJECT')) return 'status-badge rejected';
    if (normalized.includes('INSPECT')) return 'status-badge inspected';
    if (normalized.includes('APPROVE')) return 'status-badge approved';
    return 'status-badge neutral';
  }

  get showingTo(): number {
    return Math.min(
      (this.pageNumber - 1) * this.pageSize + this.pageApplications.length,
      this.displayTotalRecords
    );
  }

  get showingFrom(): number {
    if (!this.displayTotalRecords) {
      return 0;
    }
    return (this.pageNumber - 1) * this.pageSize + 1;
  }

  get displayTotalRecords(): number {
    // Zone / Ward / application-number search are server-side (totalRecords reflects them);
    // Status and free-text search are matched on the loaded page only.
    const hasLocalFilter = Boolean(this.hasLocalSearch || this.selectedStatus.trim());
    return hasLocalFilter ? this.filteredApplications.length : this.totalRecords;
  }

  private get hasLocalSearch(): boolean {
    return !!this.searchText.trim() && !this.serverSearchText;
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

  private loadLookup(): void {
    const loginId = this.resolveLoginId();
    if (!loginId) {
      return;
    }

    const sub = this.approvingofficerService.getApproverLookup(loginId).subscribe({
      next: (res) => {
        const payload = res as any;
        const rawZones = payload?.zones ?? payload?.Zones ?? [];
        const rawWards = payload?.wards ?? payload?.Wards ?? [];

        this.zoneOptions = rawZones
          .map((z: any) => ({
            id: Number(z?.zoneID ?? z?.ZoneID),
            name: String(z?.zoneName ?? z?.ZoneName ?? '').trim()
          }))
          .filter((z: ZoneOption) => Number.isFinite(z.id) && z.id > 0 && !!z.name);

        this.wardOptions = rawWards
          .map((w: any) => ({
            id: Number(w?.wardID ?? w?.WardID),
            name: String(w?.wardName ?? w?.WardName ?? '').trim(),
            zoneId: Number(w?.zoneID ?? w?.ZoneID) || null
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
        // Without this handler the failure reached the global ErrorHandler ("ERROR [object Object]")
        // and the Zone / Ward filters silently stayed empty.
        this.zoneOptions = [];
        this.wardOptions = [];
        this.notificationservice.show('Unable to load the zone and ward filters. Please refresh the page.', 'error');
        this.cdr.detectChanges();
      }
    });

    this.subscriptions.add(sub);
  }

  private applyLocalFilters(): void {
    // Zone / Ward / application-number search were already applied by the API.
    const search = this.hasLocalSearch ? this.searchText.trim().toLowerCase() : '';
    const selectedStatus = this.selectedStatus.trim().toLowerCase();

    this.filteredApplications = this.applications.filter((app) => {
      const matchesStatus =
        !selectedStatus ||
        (app.licenceApplicationStatusName || '').toLowerCase().includes(selectedStatus);
      const matchesSearch =
        !search ||
        (app.applicationNumber || '').toLowerCase().includes(search) ||
        (app.applicantName || '').toLowerCase().includes(search) ||
        (app.tradeName || '').toLowerCase().includes(search) ||
        (app.mobileNumber || '').toLowerCase().includes(search) ||
        (app.wardName || '').toLowerCase().includes(search) ||
        (app.licenceApplicationStatusName || '').toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });

    this.pageApplications = this.filteredApplications;
  }

  private buildVisibleStatuses(statusValue: string | null | undefined): string[] {
    if (!statusValue?.trim()) {
      return [...this.fixedStatusOptions];
    }

    const allowed = new Set(this.fixedStatusOptions);
    const parsed = statusValue
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => allowed.has(value));

    return parsed.length ? parsed : [...this.fixedStatusOptions];
  }

  private buildStatusOptions(): string[] {
    return [...this.fixedStatusOptions];
  }

  private generatePages(): void {
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.pageNumber - 2);
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    this.pages = [];
    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
  }

  private readRouteFilters(): void {
    const rawStatusId = this.route.snapshot.queryParamMap.get('statusId');
    const parsed = Number(rawStatusId);
    if (Number.isFinite(parsed) && parsed > 0) {
      this.routeStatusId = parsed;
    }
  }

  private mapStatusIdToName(statusId: number): string {
    if (statusId === 2) return 'APPLIED';
    if (statusId === 5) return 'OBJECTION';
    if (statusId === 4 || statusId === 6) return 'REJECTED';
    return '';
  }

  private resolveLoginId(): number | null {
    const decoded = this.tokenservice.getDecodedToken() as any;
    const candidates = [
      decoded?.loginID,
      decoded?.loginId,
      decoded?.LoginID,
      decoded?.sub,
      this.tokenservice.getEffectiveUserId(),
      this.tokenservice.getUserId(),
      this.tokenservice.getTraderUserId()
    ];
    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return null;
  }

  private bootstrapInitialLoad(attempt = 0): void {
    const loginId = this.resolveLoginId();
    if (loginId) {
      this.loadLookup();
      this.loadAppliedApproverApplications();
      return;
    }

    if (attempt >= 10) {
      this.notificationservice.show('Unable to resolve login id. Please sign in again.', 'warning');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.bootstrapTimer = setTimeout(() => this.bootstrapInitialLoad(attempt + 1), 300);
  }
}
