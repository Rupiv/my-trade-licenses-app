import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  ApplicationView,
  ViewLicensesApplicationService,
} from '../../../pages/view-licenses-application/view-licenses-application.service';

/**
 * Read-only "Full Application Details" for officer screens (inspector, zone approver, senior
 * approver, admin): applicant, address, GBA corporation / zone / ward, trades + fees, every
 * payment and the progress history. Loads by the SUBMITTED application id. It only displays
 * data - the page's own actions (Inspected / Forward / Approve ...) are not touched.
 */
@Component({
  selector: 'app-application-full-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './application-full-details.html',
  styleUrl: './application-full-details.css',
})
export class ApplicationFullDetails implements OnChanges {
  /** Submitted (Licence_Application) id of the application. */
  @Input() licenceApplicationId: number | null | undefined;

  loading = false;
  errorMessage = '';
  view: ApplicationView | null = null;
  private loadedId: number | null = null;

  constructor(
    private readonly viewService: ViewLicensesApplicationService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    const id = Number(this.licenceApplicationId);
    if (!id || id === this.loadedId) return;
    this.loadedId = id;
    this.loading = true;
    this.errorMessage = '';
    this.viewService.getSubmittedApplication(id).subscribe({
      next: (res) => {
        this.view = res;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load the full application details.';
        this.cdr.markForCheck();
      },
    });
  }

  /** Header overlaid with the licence record's applicant / address / ward / MOH. */
  get app(): any {
    const base = this.view?.application ?? {};
    const master = this.view?.master ?? {};
    const filled = Object.fromEntries(
      Object.entries(master).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );
    return { ...base, ...filled };
  }

  get statusName(): string {
    return (this.view?.final?.statusName || this.app.licenceApplicationStatusName || '—').trim();
  }

  get address(): string {
    const a = this.app;
    return [a.doorNumber, a.address1, a.address2, a.address3, a.street, a.pincode]
      .map((x) => String(x ?? '').trim())
      .filter((x) => x)
      .join(', ');
  }

  timelineStep(t: any): { name: string; remarks: string; by: string; on: string | null } {
    return {
      name: t.licenceProcessName ?? t.LicenceProcessName ?? t.status ?? t.Status ?? '—',
      remarks: t.remarks ?? t.Remarks ?? '',
      by: t.updatedByUser ?? t.UpdatedByUser ?? '',
      on: t.entryDate ?? t.EntryDate ?? null,
    };
  }

  paymentBadge(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS') return 'bg-success';
    if (s === 'INITIATED' || s === 'PENDING') return 'bg-warning text-dark';
    return 'bg-danger';
  }
}
