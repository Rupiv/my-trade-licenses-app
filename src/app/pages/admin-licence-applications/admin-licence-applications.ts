import { CommonModule } from '@angular/common';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminApplicationFiltersComponent, AdminApplicationFilterState } from './components/admin-application-filters/admin-application-filters';
import { AdminApplicationTableComponent } from './components/admin-application-table/admin-application-table';
import { AdminApplication, AdminApplicationsService } from './admin-applications.service';
import { GbaCorporation, MLCConstituency, Ward, Zones } from '../../core/models/new-trade-licenses.model';

@Component({
  selector: 'app-admin-licence-applications',
  imports: [CommonModule, AdminApplicationFiltersComponent, AdminApplicationTableComponent],
  templateUrl: './admin-licence-applications.html',
  styleUrl: './admin-licence-applications.css',
})
export class AdminLicenceApplications implements OnDestroy {
  isLoadingApplications = false;
  /** Rows shown in the table (the loaded page, narrowed by the status filter). */
  applications: AdminApplication[] = [];
  /** The page exactly as the server returned it. */
  private pageApplications: AdminApplication[] = [];
  zones: Zones[] = [];
  mohs: MLCConstituency[] = [];
  filteredMohs: MLCConstituency[] = [];
  wards: Ward[] = [];

  corporations: GbaCorporation[] = [];
  selectedCorporationId: number | null = null;
  selectedZoneId: number | null = null;
  selectedMohId: number | null = null;
  selectedWardId: number | null = null;
  selectedStatus = '';
  searchText = '';
  statusOptions: string[] = [];

  totalRecords = 0;
  pageNumber = 1;
  pageSize = 10;

  private filterTimer: ReturnType<typeof setTimeout> | null = null;
  private requestId = 0;
  private readonly subscriptions = new Subscription();
  private readonly notifier = inject(NotificationService);

  constructor(
    private readonly adminApplicationsService: AdminApplicationsService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef
  ) {}

  /** App runs zoneless: data set in an async callback is only drawn after this (or a user click). */
  private refreshView(): void {
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.readRouteFilters();
    this.loadFilterMasters();
    this.loadAdminApplications();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.filterTimer) {
      clearTimeout(this.filterTimer);
    }
  }

  onFiltersChanged(filterState: AdminApplicationFilterState): void {
    const zoneChanged = this.selectedZoneId !== filterState.zoneId;
    const mohChanged = this.selectedMohId !== filterState.mohId;
    const wardChanged = this.selectedWardId !== filterState.wardId;
    const corporationChanged = this.selectedCorporationId !== filterState.corporationId;

    this.selectedCorporationId = filterState.corporationId;
    this.selectedZoneId = filterState.zoneId;
    this.selectedStatus = filterState.status;
    this.filteredMohs = this.selectedZoneId
      ? this.mohs.filter((moh) => moh.zoneID === this.selectedZoneId)
      : [...this.mohs];

    const hasSelectedMoh = this.filteredMohs.some((moh) => moh.mohID === filterState.mohId);
    if (!hasSelectedMoh && filterState.mohId !== null) {
      this.selectedMohId = null;
      this.selectedWardId = null;
      this.wards = [];
    } else {
      this.selectedMohId = filterState.mohId;
      this.selectedWardId = filterState.wardId;
    }

    if (mohChanged || zoneChanged) {
      this.selectedWardId = null;
      this.loadWardsForSelectedMoh();
    }

    if (corporationChanged || zoneChanged || mohChanged || wardChanged) {
      this.pageNumber = 1;
      this.loadAdminApplications();
      return;
    }

    this.applyStatusFilterOnly();
  }

  onSearchChanged(value: string): void {
    this.searchText = value;
    this.pageNumber = 1;

    if (this.filterTimer) {
      clearTimeout(this.filterTimer);
    }
    this.filterTimer = setTimeout(() => {
      this.loadAdminApplications();
    }, 350);
  }

  onPageChanged(page: number): void {
    this.pageNumber = page;
    this.loadAdminApplications();
  }

  onPageSizeChanged(pageSize: number): void {
    this.pageSize = pageSize;
    this.pageNumber = 1;
    this.loadAdminApplications();
  }

  onViewApplication(application: AdminApplication): void {
    if (!application.applicationNumber) {
      return;
    }
    const appNo = encodeURIComponent(application.applicationNumber);
    const licenceApplicationId = application.licenceApplicationID;
    this.router.navigate(['/admin/licence-certificate', appNo], {
      queryParams: { from: 'admin', licenceApplicationId }
    });
  }

  onOpenApplicationDetails(application: AdminApplication): void {
    if (!application.licenceApplicationID) {
      return;
    }
    this.router.navigate(['/admin/licence-applications', application.licenceApplicationID]);
  }

  private loadAdminApplications(): void {
    this.isLoadingApplications = true;
    // May run from the search debounce timer (zoneless: nothing redraws a timer callback by itself)
    this.refreshView();
    const currentRequest = ++this.requestId;

    const query = {
      corporationId: this.selectedCorporationId,
      zoneId: this.selectedZoneId,
      mohId: this.selectedMohId,
      wardId: this.selectedWardId,
      applicationNumber: this.searchText?.trim() || null,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    };

    const sub = this.adminApplicationsService.getAdminApplications(query).subscribe({
      next: (response) => {
        if (currentRequest !== this.requestId) {
          return;
        }

        this.pageApplications = response?.data ?? response?.Data ?? [];
        this.totalRecords = Number(response?.totalRecords ?? response?.TotalRecords ?? 0);
        this.pageNumber = Number(response?.pageNumber ?? response?.PageNumber ?? this.pageNumber);
        this.pageSize = Number(response?.pageSize ?? response?.PageSize ?? this.pageSize);
        this.buildStatusOptions();
        this.applyStatusFilterOnly();
        this.isLoadingApplications = false;
        this.refreshView();
      },
      error: (error) => {
        if (currentRequest !== this.requestId) {
          return;
        }
        if (error?.status === 403 || error?.status >= 500 || error?.status === 0) {
          this.notifier.show(
            error?.error?.message || error?.error?.Message ||
              (error?.status === 403 ? 'You are not allowed to view these applications.' : 'Unable to load applications. Please try again.'),
            error?.status === 403 ? 'warning' : 'error');
        }
        this.pageApplications = [];
        this.applications = [];
        this.buildStatusOptions();
        this.totalRecords = 0;
        this.isLoadingApplications = false;
        this.refreshView();
      }
    });

    this.subscriptions.add(sub);
  }

  // Separate from zones/MOH so the old filters keep working if the GBA masters are unavailable
  private loadCorporations(): void {
    const sub = this.adminApplicationsService.getCorporations().subscribe({
      next: (corporations) => {
        this.corporations = corporations ?? [];
        this.refreshView();
      },
      error: () => {
        this.corporations = [];
        this.refreshView();
      }
    });
    this.subscriptions.add(sub);
  }

  private loadFilterMasters(): void {
    this.loadCorporations();
    const sub = forkJoin({
      zones: this.adminApplicationsService.getZones(),
      mohs: this.adminApplicationsService.getMohs()
    }).subscribe({
      next: ({ zones, mohs }) => {
        this.zones = zones ?? [];
        this.mohs = mohs ?? [];
        this.filteredMohs = [...this.mohs];
        this.refreshView();
      },
      error: (error) => {
        //console.error('Failed to load application filters', error);
        this.zones = [];
        this.mohs = [];
        this.filteredMohs = [];
        this.refreshView();
      }
    });

    this.subscriptions.add(sub);
  }

  private loadWardsForSelectedMoh(): void {
    this.wards = [];
    const targetMohs = this.selectedMohId
      ? this.mohs.filter((moh) => moh.mohID === this.selectedMohId)
      : this.selectedZoneId
        ? this.mohs.filter((moh) => moh.zoneID === this.selectedZoneId)
        : [];

    const constituencyIds = Array.from(
      new Set(
        targetMohs
          .map((moh) => moh.constituencyID)
          .filter((id): id is number => Number.isFinite(id) && id > 0)
      )
    );

    if (!constituencyIds.length) {
      return;
    }

    const wardRequests = constituencyIds.map((id) =>
      this.adminApplicationsService.getWardsByConstituency(id)
    );

    const sub = forkJoin(wardRequests).subscribe({
      next: (wardGroups) => {
        const merged = wardGroups.flat();
        const unique = new Map<number, Ward>();
        for (const ward of merged) {
          if (!unique.has(ward.wardID)) {
            unique.set(ward.wardID, ward);
          }
        }
        this.wards = Array.from(unique.values()).sort((a, b) =>
          (a.wardName || '').localeCompare(b.wardName || '')
        );
        this.refreshView();
      },
      error: (error) => {
        //console.error('Failed to load wards', error);
        this.wards = [];
        this.refreshView();
      }
    });

    this.subscriptions.add(sub);
  }

  /**
   * The list API has no status parameter, so the status filter narrows the loaded page only.
   * Server paging/totals are left untouched (narrowing them made the pager jump to page 1 and
   * lose the other pages), and the full page is kept so changing/clearing the status restores rows.
   */
  private applyStatusFilterOnly(): void {
    const target = this.selectedStatus?.trim().toUpperCase();
    this.applications = target
      ? this.pageApplications.filter(
          (app) => (app.licenceApplicationStatusName || '').trim().toUpperCase() === target
        )
      : [...this.pageApplications];
  }

  /** True when the status filter is hiding rows of the loaded page (shown as a hint in the page). */
  get isStatusFilterPageOnly(): boolean {
    return !!this.selectedStatus?.trim();
  }

  private buildStatusOptions(): void {
    const names = this.pageApplications
      .map((app) => (app.licenceApplicationStatusName || '').trim())
      .filter((value) => !!value);
    const selected = this.selectedStatus?.trim();
    if (selected) {
      // Keep the chosen status selectable (e.g. ?status=APPROVED from the dashboard) using the
      // server's spelling when the page has it, so the <select> shows it as selected.
      const match = names.find((n) => n.toUpperCase() === selected.toUpperCase());
      if (match) {
        this.selectedStatus = match;
      } else {
        names.push(selected);
      }
    }
    this.statusOptions = Array.from(new Set(names)).sort();
  }

  private readRouteFilters(): void {
    const rawStatus = this.route.snapshot.queryParamMap.get('status');
    if (rawStatus?.trim()) {
      this.selectedStatus = rawStatus.trim().toUpperCase();
    }
  }
}
