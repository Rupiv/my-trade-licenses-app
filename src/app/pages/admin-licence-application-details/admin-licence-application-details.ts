import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
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
import { ApplicationFullDetails } from '../../shared/components/application-full-details/application-full-details';

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
  imports: [CommonModule, RouterModule, GoogleMapsModule, FormsModule, ApplicationFullDetails],
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

  // GBA mapping
  private readonly gbaUrl = '/api/api/gba';
  gbaLocation: any = null;
  gbaCandidates: any[] = [];
  gbaCorporations: any[] = [];
  gbaZones: any[] = [];
  gbaWards: any[] = [];
  selectedCorporationId: number | null = null;
  selectedZoneId: number | null = null;
  selectedWardId: number | null = null;
  gbaLoading = false;
  gbaSaving = false;

  constructor(
    private route: ActivatedRoute,
    private portalAdminService: PortalAdminService,
    private inspectionService: InspectionService,
    private tokenService: TokenService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
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
            if (this.normalizeRole(this.role) === 'admin') {
              this.loadGbaLocation(this.details.tradeLicenceID);
            }
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
        this.restoreChecklistFromTimeline();
        this.cdr.detectChanges();
      },
      error: () => {
        this.timelineLoading = false;
        this.timelineError = 'Unable to load timeline.';
        this.cdr.detectChanges();
      }
    });
  }

  private restoreChecklistFromTimeline(): void {
    for (let i = this.timeline.length - 1; i >= 0; i--) {
      const entry = this.timeline[i];
      const ids = (entry as any).actionReasonIds || (entry as any).ActionReasonIds || '';
      const parts = ids.split(',').map((s: string) => s.trim());
      if (parts.length === this.inspectionChecklist.length && parts.every((p: string) => p === '0' || p === '1')) {
        this.inspectionChecklist.forEach((item, idx) => {
          item.checked = parts[idx] === '1';
        });
        break;
      }
    }
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
      currentStatus: currentStatusID,
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

  normalizeRole(role: string | null | undefined): string {
    return (role ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  }

  get isZoneApproverRole(): boolean {
    const normalized = this.normalizeRole(this.role);
    return normalized === 'zoneapprover' || normalized === 'zonalapprover' || normalized === 'medicalofficerofhealth';
  }

  get canShowReviewActions(): boolean {
    if (this.isZoneApproverRole) {
      return true;
    }
    return this.canForwardToSenior;
  }

  // ─── GBA Location Mapping ───────────────────────────
  loadGbaLocation(tradeLicenceId: number): void {
    this.gbaLoading = true;
    this.http.get<any>(`${this.gbaUrl}/licence/${tradeLicenceId}`).subscribe({
      next: (res) => {
        this.gbaLocation = res?.location ?? null;
        this.gbaCandidates = res?.candidates ?? [];
        this.gbaLoading = false;
        if (this.gbaLocation) {
          this.selectedCorporationId = this.gbaLocation.corporationID ?? null;
          const wardId = this.gbaLocation.gbaWardID ?? this.gbaLocation.suggestedGbaWardID;
          this.selectedWardId = wardId ?? null;
        }
        this.loadGbaCorporations();
        this.cdr.detectChanges();
      },
      error: () => {
        this.gbaLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadGbaCorporations(): void {
    this.http.get<any[]>(`${this.gbaUrl}/corporations`).subscribe({
      next: (data) => {
        this.gbaCorporations = data ?? [];
        if (this.selectedCorporationId) {
          this.onCorporationChange(false);
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  onCorporationChange(resetWard = true): void {
    this.gbaZones = [];
    this.gbaWards = [];
    if (resetWard) {
      this.selectedZoneId = null;
      this.selectedWardId = null;
    }
    if (!this.selectedCorporationId) return;

    this.http.get<any[]>(`${this.gbaUrl}/corporations/${this.selectedCorporationId}/zones`).subscribe({
      next: (data) => {
        this.gbaZones = data ?? [];
        if (this.selectedZoneId || !resetWard) {
          this.onZoneChange(resetWard);
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  onZoneChange(resetWard = true): void {
    this.gbaWards = [];
    if (resetWard) {
      this.selectedWardId = null;
    }
    if (!this.selectedCorporationId) return;

    let params = new HttpParams().set('corporationId', this.selectedCorporationId);
    if (this.selectedZoneId) {
      params = params.set('zoneId', this.selectedZoneId);
    }
    this.http.get<any[]>(`${this.gbaUrl}/wards`, { params }).subscribe({
      next: (data) => {
        this.gbaWards = data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  saveGbaMapping(): void {
    if (!this.selectedWardId || !this.details?.tradeLicenceID) {
      this.notificationService.show('Please select a ward before saving', 'warning');
      return;
    }
    this.gbaSaving = true;
    this.http.put<any>(`${this.gbaUrl}/licence/${this.details.tradeLicenceID}/assign`, {
      gbaWardID: this.selectedWardId
    }).subscribe({
      next: () => {
        this.gbaSaving = false;
        this.notificationService.show('GBA location mapped successfully', 'success');
        this.loadGbaLocation(this.details!.tradeLicenceID);
      },
      error: (err) => {
        this.gbaSaving = false;
        const msg = err?.error?.message || err?.error?.Message || 'Failed to save GBA mapping';
        this.notificationService.show(msg, 'error');
        this.cdr.detectChanges();
      }
    });
  }
}
