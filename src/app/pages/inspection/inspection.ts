import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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

interface InspectionPhoto {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-inspection',
  imports: [CommonModule, RouterModule, FormsModule, GoogleMapsModule],
  templateUrl: './inspection.html',
  styleUrl: './inspection.css',
})
export class Inspection {
  applicationNo!: string;
  role = '';
  get isSeniorApprover(): boolean {
    return this.role === 'SeniorApprover' || this.role === 'SENIOR_APPROVER';
  }

  // Mock inspection data (later replace with API)
  inspectionChecklist = [
    { label: 'Trade name board displayed', checked: false },
    { label: 'Fire safety compliance', checked: false },
    { label: 'Waste disposal arrangement', checked: false },
    { label: 'Health & hygiene maintained', checked: false }
  ];

  remarks: string = '';
  isSubmitting = false;
  timeline: LicenceProcessTimelineItem[] = [];
  timelineLoading = false;
  timelineError = '';
  private setSubmitting(value: boolean) {
    // Defer to avoid ExpressionChangedAfterItHasBeenChecked in dev mode.
    setTimeout(() => {
      this.isSubmitting = value;
      this.cdr.detectChanges();
    }, 0);
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

  ngOnInit(): void {
    this.applicationNo = this.activeroute.snapshot.paramMap.get('applicationNo')!;
    this.role = this.tokenservice.getRole();
    this.loadAppliedApproverApplicatiosn();
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

  loadAppliedApproverApplicatiosn(): void{
    this.loaderservice.show();
    const loginId = this.tokenservice.getUserId();
    if(!loginId){
      this.notificationservice.show('Invalid login id', 'warning');
      this.loaderservice.hide();
      return;
    }
    const appNo = Number(this.applicationNo);
    if (isNaN(appNo)) {
      console.error('Invalid application number');
      this.loaderservice.hide();
      return;
    }
    const source$ = this.isSeniorApprover
      ? this.inspectionservice.getSeniorApproverApplications(loginId, appNo, this.pageNumber, this.pageSize)
      : this.inspectionservice.getAppliedApproverApplications(loginId, appNo, this.pageNumber, this.pageSize);

    source$.subscribe({
      next: (res: ApprovedApplications) => {
        if (res.data && res.data.length > 0) {
          this.licenceApplicationDetails = res.data[0];
          this.loadLocationDetailsDetails();
          this.loadDocumentDetails();
          this.loadTimeline();
          console.log(this.licenceApplicationDetails);
        }
        this.totalRecords = res.totalRecords;
        this.loaderservice.hide();
        this.cdr.detectChanges();
      },
      error: () => { 
        this.licenceApplicationDetails = null;
        this.loaderservice.hide();
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
        console.error('Error fetching location details:', err);
      }
    });
  }

  //To Load document details in the document tab
  LicensesApplicationDocuments: LicensesApplicationDocument[] = [];
  loadDocumentDetails() {
    this.inspectionservice.getDocumentDetails(Number(this.applicationNo)).subscribe({
      next: (res) => {
        this.LicensesApplicationDocuments = res;
        console.log('Document details loaded:', this.LicensesApplicationDocuments);
        console.log('Document details loaded:', res);
        console.log(this.applicationNo);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching document details:', err);
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

  loadTradeType(){
    //this.inspectionservice.getTradeTypeById().subscribe({
  }
  //#endregions

  saveDraft() {
    console.log('Draft saved', {
      applicationNo: this.applicationNo,
      checklist: this.inspectionChecklist,
      remarks: this.remarks
    });
  }

  submitInspection() {
    console.log('Inspection submitted', {
      applicationNo: this.applicationNo,
      checklist: this.inspectionChecklist,
      remarks: this.remarks
    });

    const playload = {
      licenceApplicationID: Number(this.applicationNo),
      licenceProcessID: 3, //APPROVED
      remarks: this.remarks,
      actionReasonIds: '1'
    };
    if(!this.remarks){
      this.notificationservice.show('Please enter remarks before submitting inspection', 'warning');
      return;
    }
    //inspectionPhotos: this.inspectionChecklist.filter(item => item.checked).map(item => item.label)
    this.notificationservice.show('Inspection submitted successfully', 'success');
    this.router.navigate(['/approver/approving-officer']);
    // this.inspectionservice.submitInspection(playload).subscribe({
    //   next: (res) => {
        
    //   },
    //   error: (err) => {
    //     this.notificationservice.show('Error submitting inspection', 'error');
    //   }
    // });
  }

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
        this.cdr.detectChanges();
      },
      error: () => {
        this.timelineLoading = false;
        this.timelineError = 'Unable to load timeline.';
        this.cdr.detectChanges();
      }
    });
  }

  submitProcessAction(licenceProcessID: number, currentStatusID?: number) {
    if (this.isSubmitting) {
      return;
    }

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
      currentStatusID ||
      this.licenceApplicationDetails?.licenceApplicationStatusID;
    if (!resolvedCurrentStatusID) {
      this.notificationservice.show('Current status is not loaded. Please refresh and try again.', 'warning');
      return;
    }

    const remarks = this.remarks?.trim() ?? '';
    if (!remarks) {
      this.notificationservice.show('Please enter remarks before submitting action', 'warning');
      return;
    }

    this.setSubmitting(true);

    const payload = {
      licenceApplicationID,
      loginID: loginId,
      licenceProcessID,
      currentStatus: String(resolvedCurrentStatusID),
      remarks,
      actionReasonIds: ''
    };

    console.log('[Inspection] submitProcessAction payload:', payload);

    this.inspectionservice
      .submitLicenceProcessAction(payload)
      .subscribe({
        next: () => {
          this.setSubmitting(false);
          this.notificationservice.show('Status updated successfully', 'success');
          this.router.navigate([this.getBackRoute()]);
        },
        error: (error) => {
          this.setSubmitting(false);
          console.error('[Inspection] submitProcessAction API error:', error);
          console.error('[Inspection] failed payload:', payload);
          const message = this.extractApiErrorMessage(error);
          this.notificationservice.show(message, 'error');
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

      // Size validation (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Each photo must be less than 5MB');
        continue;
      }

      const reader = new FileReader();

      reader.onload = () => {
        this.inspectionPhotos = [
          ...this.inspectionPhotos,
          {
            file: file,
            preview: reader.result as string
          }
        ];
      };

      reader.readAsDataURL(file);
    }

    // Reset input
    input.value = '';
  }

  removePhoto(index: number) {
    this.inspectionPhotos.splice(index, 1);
  }

}
