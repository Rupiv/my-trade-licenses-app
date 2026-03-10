import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { TokenService } from '../../core/services/token.service';
import {
  LicenceApplicationByLoginItem,
  LicenceApplicationByLoginResponse,
  TrackApplicationService
} from './track-application.service';
import { LicenceProcessTimelineItem } from '../inspection/inspection.service';
import { NotificationService } from '../../shared/components/notification/notification.service';

type SearchResult = 'found' | 'not_found' | null;

interface TrackTimelineStep {
  label: string;
  date: string;
  completed: boolean;
  current: boolean;
  remarks: string;
  updatedBy: string;
}

interface TrackApplicationData {
  id: string;
  tradeName: string;
  type: string;
  applicantName: string;
  submittedOn: string;
  address: string;
  currentStatusLabel: string;
  timeline: TrackTimelineStep[];
}

@Component({
  selector: 'app-track-application',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './track-application.html',
  styleUrls: ['./track-application.css'],
})
export class TrackApplication {
  isUser = false;

  applicationId = '';
  searchResult: SearchResult = null;
  loading = false;
  applicationsLoading = false;
  applicationData: TrackApplicationData | null = null;
  searchError = '';
  loadError = '';
  pageNumber = 1;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 0;

  applications: LicenceApplicationByLoginItem[] = [];
  filteredApplications: LicenceApplicationByLoginItem[] = [];
  selectedApplication: LicenceApplicationByLoginItem | null = null;

  constructor(
    private tokenservice: TokenService,
    private trackApplicationService: TrackApplicationService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    const role = this.tokenservice.getUserRole();
    if (role == 'TRADE_OWNER') {
      this.isUser = true;
    }
    this.loadUserApplications();
  }

  onSearch() {
    if (this.applicationsLoading) {
      return;
    }

    if (!this.applications.length) {
      return;
    }

    this.filterApplications(this.applicationId.trim());
  }

  onSelectApplication(app: LicenceApplicationByLoginItem): void {
    this.selectedApplication = app;
    this.applicationData = this.mapApplicationData(app);
    this.searchResult = 'found';
    this.searchError = '';
    this.loading = true;

    this.trackApplicationService
      .getLicenceProcessTimeline(app.licenceApplicationID)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (timeline) => {
          if (this.applicationData) {
            this.applicationData.timeline = this.mapTimeline(timeline);
          }
        },
        error: () => {
          this.searchError = 'Unable to load timeline details.';
        }
      });
  }

  resetSearch() {
    this.searchResult = null;
    this.applicationId = '';
    this.applicationData = null;
    this.loading = false;
    this.searchError = '';
    this.loadError = '';
    this.selectedApplication = null;
    this.filteredApplications = [...this.applications];
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }
    this.pageNumber = page;
    this.loadUserApplications(this.applicationId.trim());
  }

  get currentTimelineStep(): TrackTimelineStep | null {
    if (!this.applicationData?.timeline?.length) {
      return null;
    }
    return (
      this.applicationData.timeline.find((step) => step.current) ??
      this.applicationData.timeline[this.applicationData.timeline.length - 1]
    );
  }

  get canDownloadCertificate(): boolean {
    const status = (
      this.selectedApplication?.licenceApplicationStatusName ||
      this.selectedApplication?.currentStatusDescription ||
      ''
    )
      .trim()
      .toUpperCase();

    return status === 'APPROVED';
  }

  downloadCertificateFromTrack(): void {
    const app = this.selectedApplication;
    if (!app?.licenceApplicationID) {
      this.notificationService.show('Invalid application selected.', 'warning');
      return;
    }

    if (!this.canDownloadCertificate) {
      this.notificationService.show('Certificate can be downloaded only after approval.', 'warning');
      return;
    }

    this.loading = true;
    this.trackApplicationService
      .downloadGeneratedCertificate(app.licenceApplicationID)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (blob) => {
          const appNo = (app.applicationNumber || app.licenceApplicationID.toString())
            .replace(/[^a-z0-9-_]/gi, '_');
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Licence_${appNo}.pdf`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        },
        error: () => {
          this.notificationService.show('Generated licence not found for this application.', 'warning');
        }
      });
  }

  private loadUserApplications(searchText?: string): void {
    const loginId = this.resolveLoginId();
    if (!loginId) {
      this.notificationService.show('Invalid login id', 'warning');
      return;
    }

    this.applicationsLoading = true;
    this.loadError = '';

    this.trackApplicationService
      .getLicenceApplicationsByLogin(loginId, this.pageNumber, this.pageSize)
      .pipe(finalize(() => (this.applicationsLoading = false)))
      .subscribe({
      next: (response) => {
        const normalizedResponse = this.normalizePagedResponse(response);
        this.applications = normalizedResponse.data;
        this.totalRecords = Number(normalizedResponse.totalRecords ?? 0);
        this.pageNumber = Number(normalizedResponse.pageNumber ?? this.pageNumber);
        this.pageSize = Math.max(1, Number(normalizedResponse.pageSize ?? this.pageSize));
        this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
        this.filteredApplications = [...this.applications];

        try {
          this.filterApplications(searchText ?? this.applicationId.trim());
        } catch {
          this.searchResult = 'not_found';
          this.loadError = 'Unable to process applications list. Please try again.';
          this.filteredApplications = [];
        }
      },
      error: () => {
        this.searchResult = 'not_found';
        this.loadError = 'Unable to auto-load applications. Please check API/server and try again.';
      }
    });
  }

  private filterApplications(query: string): void {
    const normalized = query.toLowerCase();
    this.applicationData = null;
    this.searchResult = null;
    this.searchError = '';

    this.filteredApplications = !normalized
      ? [...this.applications]
      : this.applications.filter((app) =>
          this.toSearchable(app.applicationNumber).includes(normalized) ||
          this.toSearchable(app.licenceApplicationID).includes(normalized) ||
          this.toSearchable(app.tradeLicenceID).includes(normalized) ||
          this.toSearchable(app.tradeName).includes(normalized)
        );

    if (this.filteredApplications.length === 0) {
      this.searchResult = 'not_found';
      return;
    }

    if (!normalized) {
      if (this.filteredApplications.length === 1) {
        this.onSelectApplication(this.filteredApplications[0]);
      }
      return;
    }

    if (this.filteredApplications.length === 1) {
      this.onSelectApplication(this.filteredApplications[0]);
    }
  }

  private resolveLoginId(): number | null {
    const decoded = this.tokenservice.getDecodedToken() as any;
    const candidates = [
      this.tokenservice.getEffectiveUserId(),
      this.tokenservice.getUserId(),
      this.tokenservice.getTraderUserId(),
      decoded?.userID,
      decoded?.userId,
      decoded?.UserID,
      decoded?.loginID,
      decoded?.loginId,
      decoded?.sub
    ];

    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return null;
  }

  private mapApplicationData(app: LicenceApplicationByLoginItem): TrackApplicationData {
    const addressParts = [app.doorNumber, app.address1, app.address2, app.address3]
      .filter((part) => (part || '').toString().trim().length > 0)
      .map((part) => String(part).trim());

    return {
      id: app.applicationNumber || String(app.licenceApplicationID),
      tradeName: app.tradeName || '-',
      type: '-',
      applicantName: app.applicantName || '-',
      submittedOn: app.applicationSubmitDate,
      address: addressParts.length ? addressParts.join(', ') : '-',
      currentStatusLabel:
        app.licenceApplicationStatusName ||
        app.currentStatusDescription ||
        '-',
      timeline: []
    };
  }

  private mapTimeline(items: LicenceProcessTimelineItem[]): TrackTimelineStep[] {
    if (!items?.length) {
      return [];
    }

    const normalized = [...items].sort(
      (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );
    const lastIndex = normalized.length - 1;

    return normalized.map((item, index) => ({
      label: item.licenceProcessName || item.status || 'Updated',
      date: item.entryDate,
      completed: index < lastIndex,
      current: index === lastIndex,
      remarks: item.remarks || '-',
      updatedBy: item.updatedByUser || (item.loginID ? `Login ID: ${item.loginID}` : '-')
    }));
  }

  private normalizePagedResponse(response: any): LicenceApplicationByLoginResponse {
    const data = response?.data ?? response?.['Data'];
    return {
      totalRecords: Number(response?.totalRecords ?? response?.['TotalRecords'] ?? 0),
      pageNumber: Number(response?.pageNumber ?? response?.['PageNumber'] ?? this.pageNumber),
      pageSize: Number(response?.pageSize ?? response?.['PageSize'] ?? this.pageSize),
      data: Array.isArray(data) ? (data as LicenceApplicationByLoginItem[]) : []
    };
  }

  private toSearchable(value: unknown): string {
    return String(value ?? '').toLowerCase();
  }
}
