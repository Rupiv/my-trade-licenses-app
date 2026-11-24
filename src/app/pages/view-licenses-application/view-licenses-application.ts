import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GoogleMapsModule } from '@angular/google-maps';
import { ApplicationView, ViewLicensesApplicationService } from './view-licenses-application.service';
import { NotificationService } from '../../shared/components/notification/notification.service';

@Component({
  selector: 'app-view-licenses-application',
  imports: [CommonModule, FormsModule, RouterModule, GoogleMapsModule],
  templateUrl: './view-licenses-application.html',
  styleUrl: './view-licenses-application.css',
})
export class ViewLicensesApplication {
  licenceApplicationId = '';
  loading = true;
  errorMessage = '';
  view: ApplicationView | null = null;

  mapCenter: google.maps.LatLngLiteral | null = null;
  mapOptions: google.maps.MapOptions = { disableDefaultUI: true, draggable: false, zoomControl: true };
  markerOptions: google.maps.MarkerOptions = { draggable: false };

  constructor(
    private route: ActivatedRoute,
    private viewService: ViewLicensesApplicationService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.licenceApplicationId = this.route.snapshot.paramMap.get('licensesApplicationId') ?? '';
    const id = Number(this.licenceApplicationId);
    if (!id) {
      this.loading = false;
      this.errorMessage = 'Invalid application.';
      return;
    }

    this.viewService.getApplication(id).subscribe({
      next: (res) => {
        this.view = res;
        const lat = Number(res?.geo?.Latitude);
        const lng = Number(res?.geo?.Longitude);
        this.mapCenter = lat && lng ? { lat, lng } : null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err?.status === 403 ? 'You can only view your own applications.'
          : err?.status === 404 ? 'Application not found.'
          : 'Unable to load application details.';
        this.cdr.detectChanges();
      },
    });
  }

  /** Application header, overlaid with the licence record's applicant / address / ward / MOH. */
  get app(): any {
    const base = this.view?.application ?? {};
    const master = this.view?.master ?? {};
    const filled = Object.fromEntries(
      Object.entries(master).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );
    return { ...base, ...filled };
  }

  submitting = false;

  completeSubmission(): void {
    const id = Number(this.licenceApplicationId);
    if (!id || this.submitting) return;
    this.submitting = true;
    this.viewService.completeSubmission(id).subscribe({
      next: (res) => {
        this.notificationService.show(
          `Application submitted${res?.applicationNumber ? ' (No. ' + res.applicationNumber + ')' : ''}. It is now with the inspecting officer.`,
          'success'
        );
        this.submitting = false;
        this.ngOnInit();
      },
      error: (err) => {
        this.submitting = false;
        this.notificationService.show(
          err?.error?.message || err?.error?.Message || 'Could not complete the submission. Please try again.',
          'warning'
        );
        this.cdr.detectChanges();
      },
    });
  }

  get applicationNo(): string {
    return this.view?.final?.applicationNumber
      || this.app.newApplicationNumber || this.app.applicationNumber || this.licenceApplicationId;
  }

  /** Live status: the submitted application's, otherwise the draft's (ENTERED / APPLIED). */
  get statusName(): string {
    return (this.view?.final?.statusName || this.app.licenceApplicationStatusName || '—').trim();
  }

  get submittedOn(): string | null {
    return this.view?.final?.applicationSubmitDate || this.app.applicationSubmitDate || this.app.applicationEntryDate || null;
  }

  /** Timeline rows come straight from the procedure; read the usual column names defensively. */
  timelineStep(t: any): { name: string; remarks: string; by: string; on: string | null } {
    return {
      name: t.licenceProcessName ?? t.LicenceProcessName ?? t.status ?? t.Status ?? '—',
      remarks: t.remarks ?? t.Remarks ?? '',
      by: t.updatedByUser ?? t.UpdatedByUser ?? '',
      on: t.entryDate ?? t.EntryDate ?? null,
    };
  }

  get address(): string {
    const a = this.app;
    return [a.doorNumber, a.address1, a.address2, a.address3, a.street, a.pincode]
      .map((x) => String(x ?? '').trim())
      .filter((x) => x)
      .join(', ');
  }

  get isSubmitted(): boolean {
    return !!this.view?.final || Number(this.app.licenceApplicationStatusID) > 1;
  }

  get isApproved(): boolean {
    return this.statusName.toUpperCase() === 'APPROVED';
  }

  paymentBadge(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS') return 'bg-success';
    if (s === 'INITIATED' || s === 'PENDING') return 'bg-warning text-dark';
    return 'bg-danger';
  }

  openDocument(doc: { ApplicationDocumentID: number; documentName: string }): void {
    this.viewService.downloadDocument(doc.ApplicationDocumentID).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const popup = window.open(url, '_blank');
        if (!popup) {
          this.notificationService.show('Please allow popups to view the document', 'warning');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: () => this.notificationService.show('Unable to open document', 'error'),
    });
  }
}
