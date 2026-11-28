import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription, finalize, retry, timeout } from 'rxjs';
import { TokenService } from '../../core/services/token.service';
import { ZoneApprovingOfficerService } from '../../pages/zone-approving-officer/zone-approving-officer.service';
import { ZoneApproverApplication } from '../../pages/zone-approving-officer/zone-approving-officer.service';

interface KpiCard {
  label: string;
  value: number;
  tone: 'primary' | 'warning' | 'success' | 'danger';
}

// One row per zone, counting the statuses the zone-approver queue holds (INSPECTED / OBJECTION / REJECTED)
export interface ZoneWorkloadRow {
  zone: string;
  inspected: number;
  objections: number;
  rejected: number;
}

// The zone-workload table is built from one page of the queue (the API caps pageSize at 500)
export const ZONE_SUMMARY_PAGE_SIZE = 500;

@Component({
  selector: 'app-zoneapprover-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './zoneapprover-dashboard.html',
  styleUrl: './zoneapprover-dashboard.css'
})
export class ZoneapproverDashboard implements OnDestroy {
  isLoading = false;
  loadError = '';
  private requestSub: Subscription | null = null;
  private summarySub: Subscription | null = null;
  private bootstrapTimer: ReturnType<typeof setTimeout> | null = null;
  private parallaxX = 0;
  private parallaxY = 0;

  kpis: KpiCard[] = [
    { label: 'Inspected in Queue', value: 0, tone: 'primary' },
    { label: 'Objections Raised', value: 0, tone: 'warning' },
    { label: 'Rejected', value: 0, tone: 'danger' },
    { label: 'Grand Total', value: 0, tone: 'success' }
  ];

  zoneSummary: ZoneWorkloadRow[] = [];
  zoneSummaryLoading = false;
  zoneSummaryError = '';
  // How many queue rows the zone table covers, out of the queue total
  zoneSummaryCovered = 0;
  zoneSummaryTotal = 0;

  constructor(
    private readonly zoneApprovingOfficerService: ZoneApprovingOfficerService,
    private readonly tokenService: TokenService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.bootstrapDashboardLoad();
  }

  ngOnDestroy(): void {
    this.requestSub?.unsubscribe();
    this.requestSub = null;
    this.summarySub?.unsubscribe();
    this.summarySub = null;
    if (this.bootstrapTimer) {
      clearTimeout(this.bootstrapTimer);
      this.bootstrapTimer = null;
    }
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

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-IN').format(value || 0);
  }

  get actionQueue(): string[] {
    const inspected = this.kpis[0]?.value ?? 0;
    const objections = this.kpis[1]?.value ?? 0;
    const rejected = this.kpis[2]?.value ?? 0;
    const total = this.kpis[3]?.value ?? 0;

    return [
      `${this.formatNumber(inspected)} inspected applications in queue`,
      `${this.formatNumber(objections)} applications currently in objection`,
      `${this.formatNumber(rejected)} rejected out of ${this.formatNumber(total)} total applications`
    ];
  }

  get zoneSummaryIsPartial(): boolean {
    return this.zoneSummaryTotal > this.zoneSummaryCovered;
  }

  refresh(): void {
    const loginId = this.resolveLoginId();
    if (loginId) {
      this.loadDashboard(loginId);
    }
  }

  private bootstrapDashboardLoad(attempt = 0): void {
    const loginId = this.resolveLoginId();
    if (loginId) {
      this.loadDashboard(loginId);
      return;
    }

    if (attempt >= 10) {
      this.loadError = 'Unable to resolve login id. Please sign in again.';
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.bootstrapTimer = setTimeout(() => this.bootstrapDashboardLoad(attempt + 1), 300);
  }

  private loadDashboard(loginId: number): void {
    this.requestSub?.unsubscribe();
    this.requestSub = null;
    this.isLoading = true;
    this.loadError = '';

    // KPI counts (TradeLicenceZoneApproverController GET dashboard)
    this.requestSub = this.zoneApprovingOfficerService
      .getZoneApproverDashboard(loginId)
      .pipe(
        timeout(10000),
        retry({ count: 1, delay: 800 }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (dashboardResponse) => {
          const dashboard = dashboardResponse?.dashboard ?? dashboardResponse?.Dashboard ?? {};

          this.kpis = [
            { label: 'Inspected in Queue', value: this.pickNumber(dashboard, ['TotalInspected', 'totalInspected', 'Inspected', 'inspected']), tone: 'primary' },
            { label: 'Objections Raised', value: this.pickNumber(dashboard, ['TotalObjection', 'totalObjection', 'Objection', 'objection', 'TotalObjections', 'totalObjections']), tone: 'warning' },
            { label: 'Rejected', value: this.pickNumber(dashboard, ['TotalRejected', 'totalRejected', 'Rejected', 'rejected']), tone: 'danger' },
            { label: 'Grand Total', value: this.pickNumber(dashboard, ['GrandTotal', 'grandTotal', 'Total', 'total']), tone: 'success' }
          ];
          this.loadError = '';
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadError = 'Dashboard service is unavailable. Please try again.';
          this.cdr.detectChanges();
        }
      });

    this.loadZoneSummary(loginId);
  }

  // The dashboard API has no per-zone breakdown, so the zone table is counted from the queue itself.
  private loadZoneSummary(loginId: number): void {
    this.summarySub?.unsubscribe();
    this.zoneSummaryLoading = true;
    this.zoneSummaryError = '';

    this.summarySub = this.zoneApprovingOfficerService
      .getZoneApproverApplications(loginId, 1, ZONE_SUMMARY_PAGE_SIZE)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.zoneSummaryLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const apps: ZoneApproverApplication[] = response?.data ?? response?.Data ?? [];
          this.zoneSummary = this.aggregateZoneSummary(apps);
          this.zoneSummaryCovered = apps.length;
          this.zoneSummaryTotal = Number(response?.totalRecords ?? response?.TotalRecords ?? apps.length);
          this.cdr.detectChanges();
        },
        error: () => {
          this.zoneSummary = [];
          this.zoneSummaryCovered = 0;
          this.zoneSummaryTotal = 0;
          this.zoneSummaryError = 'Unable to load the zone workload.';
          this.cdr.detectChanges();
        }
      });
  }

  aggregateZoneSummary(apps: ZoneApproverApplication[]): ZoneWorkloadRow[] {
    const grouped = new Map<string, ZoneWorkloadRow>();

    for (const app of apps) {
      const zone = String(app?.mohName || 'Unknown Zone').trim();
      const status = String(app?.licenceApplicationStatusName || '').trim().toUpperCase();
      const current = grouped.get(zone) ?? { zone, inspected: 0, objections: 0, rejected: 0 };

      if (status.includes('OBJECTION')) {
        current.objections += 1;
      } else if (status.includes('REJECT')) {
        current.rejected += 1;
      } else if (status.includes('INSPECT')) {
        current.inspected += 1;
      }

      grouped.set(zone, current);
    }

    return Array.from(grouped.values()).sort((a, b) => a.zone.localeCompare(b.zone));
  }

  private pickNumber(source: Record<string, any>, keys: string[]): number {
    for (const key of keys) {
      const value = Number(source?.[key]);
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return 0;
  }

  private resolveLoginId(): number | null {
    const decoded = this.tokenService.getDecodedToken() as any;
    const candidates = [
      decoded?.loginID,
      decoded?.loginId,
      decoded?.LoginID,
      decoded?.sub,
      this.tokenService.getEffectiveUserId(),
      this.tokenService.getUserId(),
      this.tokenService.getTraderUserId()
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
