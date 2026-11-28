import { ChangeDetectorRef, Component, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { LoaderService } from '../../shared/components/loader/loader.service';
import { SeniorApprovingOfficerService } from './senior-approving-officer.service';
import { TokenService } from '../../core/services/token.service';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InspectionSubmittedApplication, SeniorApprovedApplications } from './senior-approving-officer.model';

interface ZoneOption {
  id: number;
  name: string;
}

interface WardOption {
  id: number;
  name: string;
  zoneId: number | null;
}

// Statuses the senior-approver queue returns (TradeLicenceSeniorApproverController: 5, 6, 3, 4).
export const SENIOR_STATUS_BY_ID: Record<number, string> = {
  5: 'OBJECTION',
  6: 'FORWARDED',
  3: 'APPROVED',
  4: 'REJECTED'
};
const DEFAULT_SENIOR_STATUSES = ['OBJECTION', 'FORWARDED', 'APPROVED', 'REJECTED'];

@Component({
  selector: 'app-senior-approving-officer',
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './senior-approving-officer.html',
  styleUrl: './senior-approving-officer.css',
  standalone: true
})
export class SeniorApprovingOfficer implements OnDestroy {
    private parallaxX = 0;
    private parallaxY = 0;

    selectedApplication: number | null = null;
    pageNumber = 1;
    pageSize = 10;
    totalRecords = 0;
    totalPages = 0;
    pages: number[] = [];
    isLoading = false;

    // Full zone/ward list for this officer (from /lookup), independent of the loaded page
    zoneOptions: ZoneOption[] = [];
    wardOptions: WardOption[] = [];
    selectedZoneId: number | null = null;
    selectedWardId: number | null = null;

    // Search is sent to the API (applicationNumber). Status is filtered on the loaded page, as on
    // the approver / zone approver queues (the senior-approver API has no status parameter).
    searchText = '';
    selectedStatus = '';
    statusOptions: string[] = [...DEFAULT_SENIOR_STATUSES];
    private searchTimer: ReturnType<typeof setTimeout> | null = null;
    private requestId = 0;

  constructor(
    private notificationservice: NotificationService,
    private loaderservice: LoaderService,
    private seniorapprovingofficerService: SeniorApprovingOfficerService,
    private tokenservice: TokenService,
    private cdr:ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
     @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Dashboard links pass ?statusId= (e.g. 5 = OBJECTION)
    const routeStatus = SENIOR_STATUS_BY_ID[Number(this.route.snapshot.queryParamMap.get('statusId'))];
    if (routeStatus) {
      this.selectedStatus = routeStatus;
    }
    this.loadLookup();
    this.loadSubmittedInspectionApplications();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  // Health Officer reminder: flag applications still pending past day 45 of the
  // escalation ladder (15 / 30 / 45 days shared across Health Supervisor, Medical Officer
  // of Health and Health Officer, all measured from applicationSubmitDate).
  readonly pendingReminderDays = 45;

  daysPending(app: InspectionSubmittedApplication): number {
    const submitted = new Date(app?.applicationSubmitDate as any).getTime();
    if (Number.isNaN(submitted)) return 0;
    return Math.max(0, Math.floor((Date.now() - submitted) / 86400000));
  }

  isOverdue(app: InspectionSubmittedApplication): boolean {
    return this.daysPending(app) > this.pendingReminderDays;
  }

  get overdueCount(): number {
    return this.submittedInspectionApplications.filter(app => this.isOverdue(app)).length;
  }

  private loadLookup(): void {
    const loginId = this.resolveLoginId();
    if (!loginId) {
      return;
    }

    this.seniorapprovingofficerService.getSeniorApproverLookup(loginId).subscribe({
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
        // Filter dropdowns stay empty; the application list itself still loads.
      }
    });
  }

  /** Wards of the selected zone (GBA lookups carry ZoneID; the non-GBA lookup is one zone only). */
  get filteredWardOptions(): WardOption[] {
    if (!this.selectedZoneId) {
      return this.wardOptions;
    }
    return this.wardOptions.filter((w) => w.zoneId === null || w.zoneId === this.selectedZoneId);
  }

  onZoneChanged(): void {
    this.selectedWardId = null;
    this.pageNumber = 1;
    this.loadSubmittedInspectionApplications();
  }

  onWardChanged(): void {
    this.pageNumber = 1;
    this.loadSubmittedInspectionApplications();
  }

  onSearchChanged(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      this.pageNumber = 1;
      this.loadSubmittedInspectionApplications();
    }, 300);
  }

  onStatusChanged(): void {
    this.applyLocalFilters();
  }

  selectRow(applicationNo: number) {
    this.selectedApplication = applicationNo;
  }

  onInspectionClick(applicationNo: number) {
    if (!applicationNo) {
      return;
    }
    this.selectedApplication = applicationNo;
    // Admin opens this queue from /admin/workflows; /senior-approver/** is guarded to senior
    // approvers, so admin uses the admin application view instead.
    if (this.isAdmin) {
      this.router.navigate(['/admin/licence-applications', applicationNo]);
      return;
    }
    this.router.navigate(['/senior-approver/inspection', applicationNo]);
  }

  private get isAdmin(): boolean {
    return (this.tokenservice.getRole() ?? '').toLowerCase().replace(/[\s_-]+/g, '') === 'admin';
  }

  // One API page of the senior-approver queue
  applications: InspectionSubmittedApplication[] = [];
  // Rows shown in the grid (the loaded page after the Status filter)
  submittedInspectionApplications: InspectionSubmittedApplication[] = [];

  loadSubmittedInspectionApplications() {
    this.isLoading = true;
    const loginId = this.resolveLoginId();
    if(!loginId){
      this.notificationservice.show('Invalid Login ID', 'error');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }
    // Also called from the debounced search timer: zoneless CD needs a nudge to show the spinner
    this.cdr.markForCheck();
    const currentRequest = ++this.requestId;
    this.seniorapprovingofficerService.getSubmittedInspectionApplications(loginId, this.pageNumber, this.pageSize, {
      mohId: this.selectedZoneId,
      wardId: this.selectedWardId,
      applicationNumber: this.searchText.trim() || null
    }).subscribe({
      next: (response: SeniorApprovedApplications) => {
        if (currentRequest !== this.requestId) {
          return;
        }
        this.applications = response?.data ?? response?.Data ?? [];
        const visible = response?.visibleStatuses ?? response?.VisibleStatuses ?? [];
        this.statusOptions = visible.length ? [...visible] : [...DEFAULT_SENIOR_STATUSES];
        this.totalRecords = Number(response?.totalRecords ?? response?.TotalRecords ?? 0);
        this.pageNumber = Number(response?.pageNumber ?? response?.PageNumber ?? this.pageNumber);
        this.pageSize = Number(response?.pageSize ?? response?.PageSize ?? this.pageSize);
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
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
        this.submittedInspectionApplications = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.pages = [];
        this.isLoading = false;
        this.notificationservice.show('Unable to load the applications. Please try again.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  private applyLocalFilters(): void {
    const selected = this.normalizeStatus(this.selectedStatus);
    this.submittedInspectionApplications = !selected
      ? this.applications
      : this.applications.filter((app) => {
          const status = this.normalizeStatus(app.licenceApplicationStatusName);
          // Master_LicenceProcess may name it FORWARD while VisibleStatuses says FORWARDED
          return !!status && (status.startsWith(selected) || selected.startsWith(status));
        });
  }

  private normalizeStatus(value: string | null | undefined): string {
    return (value ?? '').trim().toUpperCase();
  }

  //For pages
  generatePages() {
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.pageNumber - 2);
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    this.pages = [];
    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
  }

  //OnPageChangeEvent
  changePage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }

    this.pageNumber = page;
    this.loadSubmittedInspectionApplications();
  }

  // Status is a page-level filter, so with it the count is the filtered page (as on the sibling queues)
  get displayTotalRecords(): number {
    return this.selectedStatus.trim() ? this.submittedInspectionApplications.length : this.totalRecords;
  }

  //Showing details for user
  get showingTo(): number {
    if (!this.submittedInspectionApplications.length) {
      return 0;
    }
    return (this.pageNumber - 1) * this.pageSize + this.submittedInspectionApplications.length;
  }

  //showing from details for user
  get showingFrom(): number {
    if (!this.submittedInspectionApplications.length) {
      return 0;
    }
    return (this.pageNumber - 1) * this.pageSize + 1;
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

}
