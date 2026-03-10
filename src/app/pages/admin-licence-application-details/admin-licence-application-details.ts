import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { GoogleMapsModule } from '@angular/google-maps';
import { FormsModule } from '@angular/forms';
import { PortalAdminService } from '../portal-admin/portal-admin.service';
import { InspectionService } from '../inspection/inspection.service';
import { LocationDetails } from '../inspection/inspection.model';
import { TokenService } from '../../core/services/token.service';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { LicenceProcessTimelineItem } from '../inspection/inspection.service';
import { LicensesApplicationDocument } from '../inspection/inspection.model';
import { stampPdfWithUploadDetails } from '../../shared/utils/pdf-stamp.util';

interface AdminApplicationDetails {
  licenceApplicationID: number;
  applicationNumber: string;
  applicationSubmitDate: string;
  licenceApplicationStatusID: number;
  licenceApplicationStatusName: string;
  tradeLicenceID: number;
  applicantName: string;
  tradeName: string;
  mobileNumber: string;
  emailID: string;
  zoneID: number;
  zoneName: string;
  mohID: number;
  mohName: string;
  wardID: number;
  wardName: string;
  loginID: number;
}

@Component({
  selector: 'app-admin-licence-application-details',
  standalone: true,
  imports: [CommonModule, RouterModule, GoogleMapsModule, FormsModule],
  templateUrl: './admin-licence-application-details.html',
  styleUrl: './admin-licence-application-details.css',
})
export class AdminLicenceApplicationDetails {
  loading = true;
  errorMessage = '';
  details: AdminApplicationDetails | null = null;
  applicationNo = '';
  timeline: LicenceProcessTimelineItem[] = [];
  timelineLoading = false;
  timelineError = '';
  documents: LicensesApplicationDocument[] = [];
  documentsLoading = false;
  documentsError = '';
  savedInspectionPhotoUrls: { doc: LicensesApplicationDocument; blobUrl: string }[] = [];
  inspectionPhotosLoading = false;

  inspectionChecklist = [
    { label: 'Trade name board displayed', checked: false },
    { label: 'Fire safety compliance', checked: false },
    { label: 'Waste disposal arrangement', checked: false },
    { label: 'Health & hygiene maintained', checked: false }
  ];

  remarks = '';
  isSubmitting = false;
  role = '';

  loadlocationDetails: LocationDetails | null = null;
  mapCenter: google.maps.LatLngLiteral = { lat: 0, lng: 0 };

  mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    draggable: false,
    zoomControl: true
  };

  markerOptions: google.maps.MarkerOptions = {
    draggable: false
  };

  constructor(
    private route: ActivatedRoute,
    private portalAdminService: PortalAdminService,
    private inspectionService: InspectionService,
    private tokenService: TokenService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.role = this.tokenService.getUserRole();
    const idParam = this.route.snapshot.paramMap.get('licenceApplicationId') ?? '';
    const id = Number(idParam);
    if (!id) {
      this.loading = false;
      this.errorMessage = 'Invalid application id.';
      return;
    }

    this.loadSavedInspectionPhotos(id);

    this.portalAdminService
      .getAdminApplications({
        licenceApplicationId: id,
        pageNumber: 1,
        pageSize: 10
      })
      .subscribe({
        next: (response) => {
          const data = response?.data ?? [];
          this.details = data?.[0] ?? null;
          this.applicationNo = this.details?.applicationNumber ?? idParam;
          this.loading = false;
          if (!this.details) {
            this.errorMessage = 'Application not found.';
          } else {
            this.loadDocumentDetails(this.details.licenceApplicationID);
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Unable to load application details.';
          this.cdr.detectChanges();
        }
      });

    this.inspectionService.getgeolocationByLicensesAppId(id).subscribe({
      next: (res) => {
        this.loadlocationDetails = res;
        this.mapCenter = {
          lat: this.loadlocationDetails?.latitude || 0,
          lng: this.loadlocationDetails?.longitude || 0
        };
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadlocationDetails = null;
        this.cdr.detectChanges();
      }
    });

    this.timelineLoading = true;
    this.timelineError = '';
    this.inspectionService.getLicenceProcessTimeline(id).subscribe({
      next: (items) => {
        this.timeline = items || [];
        this.timelineLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.timelineLoading = false;
        this.timelineError = 'Unable to load timeline.';
        this.cdr.detectChanges();
      }
    });
  }

  downloadDocument(): void {
    return;
  }

  private loadDocumentDetails(licenceApplicationID: number): void {
    this.documentsLoading = true;
    this.documentsError = '';
    this.documents = [];

    this.inspectionService.getDocumentDetails(licenceApplicationID).subscribe({
      next: (res) => {
        this.documents = res ?? [];
        this.documentsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.documentsLoading = false;
        this.documentsError = 'Unable to load documents.';
        this.cdr.detectChanges();
      }
    });
  }

  openOrDownloadDocument(doc: LicensesApplicationDocument): void {
    const applicationDocumentId = doc?.ApplicationDocumentID;
    if (!applicationDocumentId) {
      return;
    }

    this.inspectionService.getDocumentDetailsById(applicationDocumentId).subscribe({
      next: async (res: Blob) => {
        const sourceBlob = res instanceof Blob ? res : new Blob([res]);
        try {
          const stampedBlob = await stampPdfWithUploadDetails(sourceBlob, {
            fileName: doc.documentName,
            uploadedOn: doc.EntryDate
          });
          this.openBlobInNewTab(stampedBlob);
        } catch (e) {
          console.error('Failed to stamp PDF', e);
          this.openBlobInNewTab(sourceBlob);
          this.notificationService.show('Opened original file (timestamp stamp supports PDF only)', 'warning');
        }
      },
      error: () => {
        this.notificationService.show('Unable to download document', 'error');
      }
    });
  }

  private loadSavedInspectionPhotos(licenceApplicationID: number): void {
    this.inspectionPhotosLoading = true;
    this.savedInspectionPhotoUrls = [];

    this.inspectionService.getDocumentDetails(licenceApplicationID).subscribe({
      next: (docs) => {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const photoDocs = (docs ?? []).filter(
          (doc) => doc.DocumentID === 10 && imageExtensions.includes((doc.FileExtension || '').toLowerCase())
        );

        if (photoDocs.length === 0) {
          this.inspectionPhotosLoading = false;
          this.cdr.detectChanges();
          return;
        }

        let pending = photoDocs.length;
        photoDocs.forEach((doc) => {
          this.inspectionService.getDocumentDetailsById(doc.ApplicationDocumentID).subscribe({
            next: (blob: Blob) => {
              const url = URL.createObjectURL(blob);
              this.savedInspectionPhotoUrls = [...this.savedInspectionPhotoUrls, { doc, blobUrl: url }];
              pending--;
              if (pending === 0) {
                this.inspectionPhotosLoading = false;
              }
              this.cdr.detectChanges();
            },
            error: () => {
              pending--;
              if (pending === 0) {
                this.inspectionPhotosLoading = false;
              }
              this.cdr.detectChanges();
            }
          });
        });
      },
      error: () => {
        this.inspectionPhotosLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private openBlobInNewTab(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    const popup = window.open(url, '_blank');
    if (!popup) {
      this.notificationService.show('Please allow popups to view document', 'warning');
    }
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  }

  submitAdminAction(licenceProcessID: number, successMessage: string): void {
    if (this.isSubmitting) {
      return;
    }

    const loginID = this.tokenService.getUserId();
    const licenceApplicationID = this.details?.licenceApplicationID;
    const currentStatusID = this.details?.licenceApplicationStatusID;
    if (!loginID || !licenceApplicationID) {
      this.notificationService.show('Unable to submit action', 'warning');
      return;
    }
    if (!currentStatusID) {
      this.notificationService.show('Current status not available', 'warning');
      return;
    }
    if (this.canShowReviewActions && !this.remarks?.trim()) {
      this.notificationService.show('Please enter remarks before submitting action', 'warning');
      return;
    }

    this.isSubmitting = true;
    this.inspectionService.submitLicenceProcessAction({
      licenceApplicationID,
      loginID,
      licenceProcessID,
      currentStatus: String(currentStatusID),
      remarks: this.remarks.trim(),
      actionReasonIds: ''
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.notificationService.show(successMessage, 'success');
      },
      error: (error) => {
        this.isSubmitting = false;
        const message = this.extractApiErrorMessage(error);
        this.notificationService.show(message, 'error');
      }
    });
  }

  private extractApiErrorMessage(error: any): string {
    const errors = error?.error?.errors;
    if (errors && typeof errors === 'object') {
      const firstKey = Object.keys(errors)[0];
      const firstValue = firstKey ? errors[firstKey] : null;
      if (Array.isArray(firstValue) && firstValue.length > 0) {
        return String(firstValue[0]);
      }
    }

    return (
      error?.error?.Message ||
      error?.error?.message ||
      error?.error?.detail ||
      error?.error?.title ||
      'Failed to submit action'
    );
  }

  get canForwardToSenior(): boolean {
    const status = this.details?.licenceApplicationStatusName?.trim().toUpperCase() ?? '';
    return status.includes('INSPECT');
  }

  private normalizeRole(role: string | null | undefined): string {
    return (role ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  }

  get isZoneApproverRole(): boolean {
    const normalized = this.normalizeRole(this.role);
    return normalized === 'zoneapprover' || normalized === 'zonalapprover';
  }

  get canShowReviewActions(): boolean {
    if (this.isZoneApproverRole) {
      return true;
    }
    return this.canForwardToSenior;
  }
}
