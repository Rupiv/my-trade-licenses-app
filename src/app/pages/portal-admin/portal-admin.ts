import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { PortalAdminService } from './portal-admin.service';
import { TokenService } from '../../core/services/token.service';

interface AdminDashboardCounts {
  Entered: number;
  Applied: number;
  Approved: number;
  Rejected: number;
  Objection: number;
  Forwarded: number;
  Inspected: number;
  GrandTotal: number;
}

@Component({
  selector: 'app-portal-admin',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './portal-admin.html',
  styleUrl: './portal-admin.css',
})
export class PortalAdmin {
  userId: number | null = null;
  isLoading = false;
  loadError = '';
  lastUpdated = new Date();
  private parallaxX = 0;
  private parallaxY = 0;

  dashboard: AdminDashboardCounts = {
    Entered: 0,
    Applied: 0,
    Approved: 0,
    Rejected: 0,
    Objection: 0,
    Forwarded: 0,
    Inspected: 0,
    GrandTotal: 0
  };

  constructor(
    private portalAdminService: PortalAdminService,
    private tokenService: TokenService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.tokenService.getUserId();
    if (id !== null) {
      this.userId = id;
      this.dashboardDataLoad();
    }
  }

  dashboardDataLoad(): void {
    if (this.userId === null) return;
    this.isLoading = true;
    this.loadError = '';

    this.portalAdminService.getAdminDashboard().subscribe({
      next: (response) => {
        const dashboard = response?.dashboard ?? response?.Dashboard ?? {};

        this.dashboard = {
          Entered: this.pickNumber(dashboard, ['Entered', 'entered', 'TotalEntered', 'totalEntered']),
          Applied: this.pickNumber(dashboard, ['Applied', 'applied', 'TotalApplied', 'totalApplied']),
          Approved: this.pickNumber(dashboard, ['Approved', 'approved', 'TotalApproved', 'totalApproved']),
          Rejected: this.pickNumber(dashboard, ['Rejected', 'rejected', 'TotalRejected', 'totalRejected']),
          Objection: this.pickNumber(dashboard, ['Objection', 'objection', 'TotalObjection', 'totalObjection']),
          Forwarded: this.pickNumber(dashboard, ['Forwarded', 'forwarded', 'TotalForwarded', 'totalForwarded']),
          Inspected: this.pickNumber(dashboard, ['Inspected', 'inspected', 'TotalInspected', 'totalInspected']),
          GrandTotal: this.pickNumber(dashboard, ['GrandTotal', 'grandTotal', 'Total', 'total'])
        };

        this.lastUpdated = new Date();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        //console.error('Failed to load admin dashboard', err);
        this.loadError = 'Dashboard service is unavailable. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
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

  get mixGradient(): string {
    const applied = this.percent(this.dashboard.Applied);
    const approved = this.percent(this.dashboard.Approved);
    const rejected = this.percent(this.dashboard.Rejected);
    const objection = this.percent(this.dashboard.Objection);
    const forwarded = this.percent(this.dashboard.Forwarded);
    const inspected = this.percent(this.dashboard.Inspected);

    const s1 = applied;
    const s2 = s1 + approved;
    const s3 = s2 + rejected;
    const s4 = s3 + objection;
    const s5 = s4 + forwarded;
    const s6 = Math.min(100, s5 + inspected);

    return `conic-gradient(
      #2563eb 0% ${s1}%,
      #16a34a ${s1}% ${s2}%,
      #ef4444 ${s2}% ${s3}%,
      #f59e0b ${s3}% ${s4}%,
      #7c3aed ${s4}% ${s5}%,
      #0891b2 ${s5}% ${s6}%,
      #cbd5e1 ${s6}% 100%
    )`;
  }

  get decisionBars(): Array<{ label: string; value: number; percent: number; tone: string }> {
    return [
      { label: 'Applied', value: this.dashboard.Applied, percent: this.percent(this.dashboard.Applied), tone: 'applied' },
      { label: 'Approved', value: this.dashboard.Approved, percent: this.percent(this.dashboard.Approved), tone: 'approved' },
      { label: 'Rejected', value: this.dashboard.Rejected, percent: this.percent(this.dashboard.Rejected), tone: 'rejected' },
      { label: 'Objection', value: this.dashboard.Objection, percent: this.percent(this.dashboard.Objection), tone: 'objection' },
      { label: 'Forwarded', value: this.dashboard.Forwarded, percent: this.percent(this.dashboard.Forwarded), tone: 'forwarded' },
      { label: 'Inspected', value: this.dashboard.Inspected, percent: this.percent(this.dashboard.Inspected), tone: 'inspected' }
    ];
  }

  private percent(value: number): number {
    if (!this.dashboard.GrandTotal) {
      return 0;
    }
    return (value / this.dashboard.GrandTotal) * 100;
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
}
