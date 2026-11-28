import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { LoaderService } from '../../shared/components/loader/loader.service';
import { InspectionService } from './inspection.service';
import { AllApprovedApplication, ApprovedApplications, LicenceApplicationModel, TradeLicensesApplicationDetails } from '../../core/models/trade-licenses-details.model';
import { AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TokenService } from '../../core/services/token.service';
import { GoogleMapsModule } from '@angular/google-maps';
import { LocationDetails, LicensesApplicationDocument } from './inspection.model';
import { LicenceProcessTimelineItem } from './inspection.service';
import { stampPdfWithUploadDetails } from '../../shared/utils/pdf-stamp.util';
import { ApplicationFullDetails } from '../../shared/components/application-full-details/application-full-details';

interface InspectionPhoto {
  file: File;
  preview: string;
}

// Same rules as LicenceActionRequest.Remarks (LicenceProcessController / submit-action):
// required, max 500 chars, letters / digits / spaces and - . , ( ) only.
export const REMARKS_MAX_LENGTH = 500;
const REMARKS_PATTERN = /^[a-zA-Z0-9\s\-.,()]+$/;

export function validateRemarks(remarks: string): string | null {
  if (!remarks) {
    return 'Please enter remarks before submitting action';
  }
  if (remarks.length > REMARKS_MAX_LENGTH) {
    return `Remarks must be ${REMARKS_MAX_LENGTH} characters or fewer`;
  }
  if (!REMARKS_PATTERN.test(remarks)) {
    return 'Remarks may only contain letters, numbers, spaces and - . , ( )';
  }
  return null;
}

@Component({
  selector: 'app-inspection',
  imports: [CommonModule, RouterModule, FormsModule, GoogleMapsModule, ApplicationFullDetails],
  templateUrl: './inspection.html',
  styleUrl: './inspection.css',
})
export class Inspection implements OnDestroy {
  applicationNo!: string;
  role = '';
  get isSeniorApprover(): boolean {
    const normalized = this.normalizeRole(this.role);
    return normalized === 'seniorapprover' || normalized === 'seniorapprovingofficer' || normalized === 'healthofficer';
  }

  /**
   * Inspection checklist. Saved with the workflow action as actionReasonIds "1,0,1,1" (one flag
   * per item, in this order) and restored from the timeline; keep the order stable.
   */
  inspectionChecklist = [
    { label: 'Trade name board displayed', checked: false },
    { label: 'Fire safety compliance', checked: false },
    { label: 'Waste disposal arrangement', checked: false },
    { label: 'Health & hygiene maintained', checked: false }
  ];

  readonly remarksMaxLength = REMARKS_MAX_LENGTH;
  remarks: string = '';
  isSubmitting = false;
  // True when the application is not in this officer's queue (or failed to load)
  applicationNotFound = false;
  documentsLoaded = false;
  timeline: LicenceProcessTimelineItem[] = [];
  timelineLoading = false;
  timelineError = '';
  private setSubmitting(value: boolean) {
    // Set synchronously so a second click cannot start a duplicate submission; markForCheck
    // re-renders after the async (photo upload / HTTP) callbacks in zoneless mode.
    this.isSubmitting = value;
    this.cdr.markForCheck();
  }

  constructor(
    private activeroute: ActivatedRoute,
    private router: Router,
    private notificationservice: NotificationService,
    private loaderservice: LoaderService,
    private inspectionservice: InspectionService,
    private tokenservice: TokenService,
    private cdr:ChangeDetectorRef,
     @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private normalizeRole(role: string | null | undefined): string {
    return (role ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  }

  ngOnInit(): void {
    this.applicationNo = this.activeroute.snapshot.paramMap.get('applicationNo')!;
    this.role = this.tokenservice.getRole();
    this.loadAppliedApproverApplicatiosn();
    this.loadSavedInspectionPhotos();
  }

  //#region To load Map

  //#endregion

//#region Pageload details when approver clicks on application ID
  licenceApplicationDetails: AllApprovedApplication | null = null;
  locationDetails: any;
  pageNumber = 1;
  pageSize = 10;
  totalRecords = 0;
  totalPages = 0;

  loadAppliedApproverApplicatiosn(): void {
  this.loaderservice.show();

  const loginId = this.tokenservice.getUserId();
  if (!loginId) {
    this.notificationservice.show('Invalid login id', 'warning');
    this.loaderservice.hide();
    return;
  }

  const appNo = Number(this.applicationNo);
  if (!appNo || isNaN(appNo)) {
    this.applicationNotFound = true;
    this.notificationservice.show('Invalid application number', 'warning');
    this.loaderservice.hide();
    return;
  }

  // ✅ Create request object instead of passing params
  const request = {
    loginId: loginId,
    licenceApplicationId: appNo,
    pageNumber: this.pageNumber,
    pageSize: this.pageSize
  };

  const source$ = this.isSeniorApprover
    ? this.inspectionservice.getSeniorApproverApplications(request)
    : this.inspectionservice.getAppliedApproverApplications(request);

  source$.subscribe({
    next: (res: ApprovedApplications) => {
      const rows = res?.data ?? (res as any)?.Data ?? [];
      if (rows.length > 0) {
        this.licenceApplicationDetails = rows[0];
        this.applicationNotFound = false;
        this.loadLocationDetailsDetails();
        this.loadDocumentDetails();
        this.loadTimeline();
      } else {
        this.licenceApplicationDetails = null;
        this.applicationNotFound = true;
        this.notificationservice.show('This application is not in your queue.', 'warning');
      }

      this.totalRecords = Number(res?.totalRecords ?? (res as any)?.TotalRecords ?? 0);
      this.loaderservice.hide();
      this.cdr.detectChanges();
    },
    error: () => {
      this.licenceApplicationDetails = null;
      this.applicationNotFound = true;
      this.loaderservice.hide();
      this.notificationservice.show('Unable to load the application. Please try again.', 'error');
      this.cdr.detectChanges();
    }
  });
}

  //For Map
  loadlocationDetails: LocationDetails | null = null;
  locationName: string = 'Not Available';
  mapCenter!: google.maps.LatLngLiteral;

  mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    draggable: false,
    zoomControl: false
  };

  markerOptions: google.maps.MarkerOptions = {
    draggable: false
  };

  loadLocationDetailsDetails() {
    // Example API response
    this.inspectionservice.getgeolocationByLicensesAppId(Number(this.applicationNo)).subscribe({
      next: (res) => {
        this.loadlocationDetails = res;
        this.mapCenter = {
          lat: Number(res.latitude),
          lng: Number(res.longitude)
        };

        // Optional but safe
        this.cdr.detectChanges();
      },
      error: (err) => {
        //console.error('Error fetching location details:', err);
      }
    });
  }

  //To Load document details in the document tab
  LicensesApplicationDocuments: LicensesApplicationDocument[] = [];
  loadDocumentDetails() {
    this.inspectionservice.getDocumentDetails(Number(this.applicationNo)).subscribe({
      next: (res) => {
        this.LicensesApplicationDocuments = Array.isArray(res) ? res : [];
        this.documentsLoaded = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.LicensesApplicationDocuments = [];
        this.documentsLoaded = true;
        this.notificationservice.show('Unable to load the application documents.', 'error');
        this.cdr.detectChanges();
      }
    });
  }
  //To Download document
  downloadDocument(doc: LicensesApplicationDocument) {
    const documentId = doc?.ApplicationDocumentID;
    if (!documentId) {
      this.notificationservice.show('Invalid document', 'warning');
      return;
    }

    this.inspectionservice.getDocumentDetailsById(documentId).subscribe({
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
          this.notificationservice.show('Opened original file (timestamp stamp supports PDF only)', 'warning');
        }
      },
      error: (err) => {
        console.error(err);
        this.notificationservice.show('Unable to download document', 'error');
      }
    });
  }

  private openBlobInNewTab(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    const popup = window.open(url, '_blank');
    if (!popup) {
      this.notificationservice.show('Please allow popups to view document', 'warning');
    }
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  }



  /*loadApplicationDetailsByLicensesId(licenceApplicationID: number){
    if(!licenceApplicationID){
      this.notificationservice.show('Something went wrong please check with the application Id', 'warning');
      return;
    }
    this.inspectionservice.getlicenceApplicationDetails(licenceApplicationID).subscribe({
      next: async(res)=>{
        console.log(res);
        this.licenceApplicationDetails = res;
        await this.loadtradeLicenceApplicationDetails(this.licenceApplicationDetails.tradeLicenceID);
      },
      error:(err)=>{

      }
    });
  }

  loadtradeLicenceApplicationDetails(tradeLicensesId : number) : Promise<void> {
    return new Promise((resolve, reject) => {
      if(!tradeLicensesId){
        this.notificationservice.show('Something went wrong please check with the application Id', 'warning');
        return;
      }
      this.inspectionservice.gettradelicenceApplicationDetails(tradeLicensesId).subscribe({
        next:(res)=>{
          this.tradeLicenceApplicationDetails = res;
        },
        error:(err)=>{

        }
      });
    });
  }

  loadlicensesApplicationLocationDetailsById(licenceApplicationID: number){
    if(!licenceApplicationID){
      this.notificationservice.show('Something went wrong please check with the application Id', 'warning');
      return;
    }
    this.inspectionservice.getgeolocationByLicensesAppId(licenceApplicationID).subscribe({
      next:(res)=>{
        this.locationDetails = res;
      },
      error:(err)=>{

      }
    });
  }*/

  //#endregions

  cancel() {
    this.notificationservice.show('Inspection cancelled', 'info');
    this.router.navigate([this.getBackRoute()]);
  }

  loadTimeline() {
    const appId = Number(this.applicationNo);
    if (!appId || Number.isNaN(appId)) {
      return;
    }
    this.timelineLoading = true;
    this.timelineError = '';
    this.inspectionservice.getLicenceProcessTimeline(appId).subscribe({
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
      const ids = entry.actionReasonIds || entry.ActionReasonIds || '';
      const parts = ids.split(',').map(s => s.trim());
      if (parts.length === this.inspectionChecklist.length && parts.every(p => p === '0' || p === '1')) {
        this.inspectionChecklist.forEach((item, idx) => {
          item.checked = parts[idx] === '1';
        });
        break;
      }
    }
  }

  submitProcessAction(licenceProcessID: number, currentStatusID?: number) {
    if (this.isSubmitting) return;

    const loginId = this.tokenservice.getUserId();
    if (!loginId) {
      this.notificationservice.show('Invalid login id', 'warning');
      return;
    }

    const licenceApplicationID =
      this.licenceApplicationDetails?.licenceApplicationID ?? Number(this.applicationNo);
    if (!licenceApplicationID || Number.isNaN(licenceApplicationID)) {
      this.notificationservice.show('Invalid licence application id', 'warning');
      return;
    }

    const resolvedCurrentStatusID =
      currentStatusID ?? this.licenceApplicationDetails?.licenceApplicationStatusID;
    if (!resolvedCurrentStatusID) {
      this.notificationservice.show('Current status is not loaded. Please refresh and try again.', 'warning');
      return;
    }

    const remarks = this.remarks?.trim() ?? '';
    const remarksError = validateRemarks(remarks);
    if (remarksError) {
      this.notificationservice.show(remarksError, 'warning');
      return;
    }

    this.setSubmitting(true);

    // 👇 Upload photos first, then submit the process action
    this.uploadPhotos()
      .then((uploaded) => {
        if (uploaded) {
          // Uploaded now: a retry after a failed action must not upload them again
          this.inspectionPhotos = [];
          this.loadSavedInspectionPhotos();
        }
        // Checklist is stored with the action as "1,0,1,1" (one flag per item, in order)
        const checklistEncoded = this.inspectionChecklist.map(item => item.checked ? '1' : '0').join(',');
        const payload = {
          licenceApplicationID,
          loginID: loginId,
          licenceProcessID,
          currentStatus: resolvedCurrentStatusID,
          remarks,
          actionReasonIds: checklistEncoded
        };

        //console.log('[Inspection] submitProcessAction payload:', payload);

        this.inspectionservice.submitLicenceProcessAction(payload).subscribe({
          next: () => {
            this.setSubmitting(false);
            this.notificationservice.show('Status updated successfully', 'success');
            this.router.navigate([this.getBackRoute()]);
          },
          error: (error) => {
            this.setSubmitting(false);
            //console.error('[Inspection] submitProcessAction API error:', error);
            const message = this.extractApiErrorMessage(error);
            this.notificationservice.show(message, 'error');
          }
        });
      })
      .catch((err) => {
        this.setSubmitting(false);
        //console.error('[Inspection] Photo upload failed:', err);
        // API answers with a plain-text reason (e.g. "Only JPG, PNG or WEBP photos are allowed")
        const reason = typeof err?.error === 'string' ? err.error : (err?.error?.message || err?.error?.Message);
        this.notificationservice.show(
          reason ? `Failed to upload inspection photos: ${reason}` : 'Failed to upload inspection photos',
          'error'
        );
      });
  }

  private extractApiErrorMessage(error: any): string {
    // e.g. BadRequest("Invalid Remarks") answers with a plain-text body
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error.trim();
    }
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
      'Failed to update status'
    );
  }

  private getBackRoute(): string {
    return this.isSeniorApprover
      ? '/senior-approver/senior-approving-officer'
      : '/approver/approving-officer';
  }

  /* =========================
     CAMERA / FILE UPLOAD
  ========================= */
  inspectionPhotos: InspectionPhoto[] = [];

  onPhotosSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];

      if (file.size > 5 * 1024 * 1024) {
        this.notificationservice.show('Each photo must be less than 5MB', 'warning');
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.inspectionPhotos = [
          ...this.inspectionPhotos,
          { file, preview: reader.result as string }
        ];
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  /** Uploads the newly added photos; resolves true when something was uploaded. */
  private uploadPhotos(): Promise<boolean> {
    if (this.inspectionPhotos.length === 0) return Promise.resolve(false);

    const licenceApplicationID =
      this.licenceApplicationDetails?.licenceApplicationID ?? Number(this.applicationNo);

    const uploads = this.inspectionPhotos.map(photo => {
      const formData = new FormData();
      formData.append('LicenceApplicationID', String(licenceApplicationID));
      formData.append('DocumentID', '10'); // Inspection photo document type
      formData.append('file', photo.file, photo.file.name);
      return firstValueFrom(this.inspectionservice.saveDocument(formData));
    });

    return Promise.all(uploads).then(() => true);
  }

  removePhoto(index: number) {
    this.inspectionPhotos = this.inspectionPhotos.filter((_, i) => i !== index);
  }

  ngOnDestroy(): void {
    this.revokeSavedPhotoUrls();
  }

  private revokeSavedPhotoUrls(): void {
    for (const item of this.savedInspectionPhotoUrls) {
      URL.revokeObjectURL(item.blobUrl);
    }
    this.savedInspectionPhotoUrls = [];
  }

  //To Load Existing photos for inspection (if any) - This can be used when approver wants to edit the inspection details after saving as draft. Currently not implemented in backend, so commented out.
  savedInspectionPhotoUrls: { doc: LicensesApplicationDocument; blobUrl: string }[] = [];
  loadSavedInspectionPhotos() {
    const appId = this.licenceApplicationDetails?.licenceApplicationID ?? Number(this.applicationNo);
    if (!appId || Number.isNaN(appId)) {
      return;
    }
    this.inspectionservice.getDocumentDetails(appId).subscribe({
      next: (docs) => {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const photoDocs = (Array.isArray(docs) ? docs : []).filter(
          d => d?.DocumentID === 10 && imageExtensions.includes(String(d?.FileExtension ?? '').toLowerCase())
        );

        // Load each image as a blob so it actually displays
        this.revokeSavedPhotoUrls();
        photoDocs.forEach(doc => {
          this.inspectionservice.getDocumentDetailsById(doc.ApplicationDocumentID).subscribe({
            next: (blob: Blob) => {
              const url = URL.createObjectURL(blob);
              this.savedInspectionPhotoUrls = [
                ...this.savedInspectionPhotoUrls,
                { doc, blobUrl: url }
              ];
              this.cdr.detectChanges();
            },
            error: (err) => {
              //console.error('Failed to load photo blob:', err)
            }
          });
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        //console.error('Error loading inspection photos:', err)
      }
    });
  }
}
