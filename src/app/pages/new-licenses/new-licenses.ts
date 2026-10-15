import {
  Component,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { GoogleMapsModule } from '@angular/google-maps';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GoogleMap } from '@angular/google-maps';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NewLicensesService } from './new-licenses.service';
import { TradeMajor, TradeMinor, TradeSub, TradeType, Ward, TradeLicenseApplication, TradeLicenseApplicationDetails, AssemblyConstituency, Zones, ZoneClassification, MLCConstituency, TradeLicensesFee, LicenseDocuments, RoadWidthDetails, GbaCorporation, GbaZone, GbaWard } from '../../core/models/new-trade-licenses.model';
import { initializeApplicationDetails, initializeTradeApplication } from '../../helpers/trade-license.factory';
import { Router } from '@angular/router';
import { TokenService } from '../../core/services/token.service';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { firstValueFrom, from, timer } from 'rxjs';
import { concatMap, retry, toArray } from 'rxjs/operators';
import { LoaderService } from '../../shared/components/loader/loader.service';
import { TradeLicenceStateService } from '../../shared/services/trade-licenses-service';
import { NgSelectModule } from '@ng-select/ng-select';


/* =========================
   FIX LEAFLET ICON ISSUE
========================= */
interface TradeGridItem {
  major: string;
  majorID: number;
  minor: string;
  minorID: number;
  sub: string;
  tradeSubID: number;
  rate: number;
}
declare const google: any;

@Component({
  selector: 'app-new-licenses',
  imports: [CommonModule, FormsModule, RouterModule, GoogleMapsModule, NgSelectModule],
  templateUrl: './new-licenses.html',
  styleUrl: './new-licenses.css',
})
export class NewLicenses {
  //Stepper Logic
  currentStep = 1; // 0 = Declaration
  agree = false;
 

@ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
@ViewChild(GoogleMap) googleMap!: GoogleMap;

map!: google.maps.Map;
drawingManager!: google.maps.drawing.DrawingManager;
selectedRectangle!: google.maps.Rectangle;


  infoAboutIssueRelated: any = 'For any issue related to online payments mail us to "bbmptl@gmail.com" with all transaction detail like transaction id, date of transaction, old license number.';
  infoAboutRules1: any = 'I/We………………………………………..do hereby affirm and state that the information to be furnished by me/us in the trade license new or renewal application are true and correct to the best of my/our knowledge and belief.';
  infoAboutRules2: any = 'I/We further declare that I/We am/are aware that the trade license application is specifically for the trade for which it is to be issued and does not regularize un authorized constructions, or violations  of building bye laws  and regulations and that  I/We may be prosecuted for such infringements even though I/We obtained a Trade Licence under the act.';
  infoAboutRules3: any = 'I/We further understand that the Trade Licence may be suspended or cancelled in the event it is found that the business is being run in premises that the violating existing rules and zonal regulations as per the Comprehensive Development Plan 2015 issued by Bangalore Development Authority.';
  infoAboutRules4: any = 'I/We further undertake to have no objection in revoking the Trade License in the case that there are any discrepancies/disputes/defects/falls information in any documentation that may be provided by me or stated in the application form.';
  infoAboutRules5: any = 'I/We undertake that I will not employ/engage child labour for the purpose of carrying out the trade. ';
  infoAboutRules6: any = 'I/We declare that incase of any objections/Complaints raised by immediate neighbours, I/We shall furnish all the documents and take corrective action as per the Greater Bengaluru Governance Act ,2024.';
  infoAboutRules7: any = 'I/We hereby declare that if there is any violations as pointed by the Municipal Corporation I undertake and agree to file affidavit that I have no objections to voluntarily close my trade premises.';

  //Creating a trade major list 
  tradeMajors : TradeMajor[] = [];
  tradeMinors : TradeMinor[] = [];
  tradeSubs : TradeSub[] = [];
  tradeTypes : TradeType[] = [];
  mlaConstituencies : MLCConstituency[] = [];
  wards : Ward[] = [];
  zones : Zones[] = [];

  // GBA location: Corporation -> Zone -> Ward
  gbaCorporations: GbaCorporation[] = [];
  gbaZones: GbaZone[] = [];
  gbaWards: GbaWard[] = [];
  selectedCorporation: GbaCorporation | null = null;
  selectedGbaZone: GbaZone | null = null;
  selectedGbaWard: GbaWard | null = null;
  zoneClassifications : ZoneClassification[] = [];
  tradeLicenseApplicationDetails : TradeLicenseApplicationDetails = {
    applicantName: '',
    doorNumber: '',
    address1: '',
    address2: '',
    address3: '',
    pincode: '',
    landLineNumber: '',
    mobileNumber: '',
    emailID: '',
    tradeName: '',
    zonalClassificationID: 0,
    mohID: 0,
    wardID: 0,
    propertyID: 0,
    pidNumber: '',
    khathaNumber: '',
    surveyNumber: '',
    street: '',
    gisNumber: '',
    licenceNumber: '',
    licenceCommencementDate: new Date(),
    licenceStatusID: 0,
    oldapplicationNumber: '',
    newlicenceNumber: ''
  };
  tradeLicenseApplications : TradeLicenseApplication ={
    licenceApplicationID: 0,
    newApplicationNumber: '',
    finanicalYearID: 0,
    tradeTypeID: 0,
    bescomRRNumber: '',
    gstNumber: '',
    panNumber: '',
    licenceFromDate: null as any,
    licenceToDate: null as any,
    licenceApplicationStatusID: 0,
    currentStatus: 0,
    tradeLicenceID: 0,
    mohID: 0,
    loginID: 0,
    entryOriginLoginID: 0,
    inspectingOfficerID: 0,
    licenseType: '',
    applicantRepersenting: 0,
    jathaStatus: '',
    docsSubmitted: false,
    challanNo: '',
    noOfYearsApplied: 0
  }
  tradeLicensesFee : TradeLicensesFee | null = null;

  selectedMajor: TradeMajor | null = null;
  selectedMinor: TradeMinor | null = null;
  selectedSub: TradeSub | null = null;
  selectedTradeType: TradeType | null = null;
  selectedMLAConstituency: MLCConstituency | null = null;
  selectedWard: Ward | null = null;
  selectedZone: Zones | null = null;
  selectedZoneClassification: ZoneClassification | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private newLicensesService: NewLicensesService, 
   private router: Router,
   private tokenservice : TokenService,
   private notificationservice: NotificationService,
   private loaderservice: LoaderService,
   private tradeLicenceStateService: TradeLicenceStateService,
   private cdr: ChangeDetectorRef) {}

  private debugLog(message: string, data?: any): void {
    if (data !== undefined) {
      //console.log(`[new-licenses] ${message}`, data);
      return;
    }
      //console.log(`[new-licenses] ${message}`);
  }

  private debugError(message: string, data?: any): void {
    if (data !== undefined) {
      //console.error(`[new-licenses] ${message}`, data);
      return;
    }
    ///console.error(`[new-licenses] ${message}`);
  }


  // ================= GOOGLE MAP STATE =================

marker!: google.maps.Marker;

mapCenter: google.maps.LatLngLiteral = {
  lat: 12.9716,
  lng: 77.5946
};
mapZoom = 15;
getCurrentLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      this.latitude = position.coords.latitude;
      this.longitude = position.coords.longitude;

      this.mapCenter = {
        lat: this.latitude,
        lng: this.longitude
      };

      this.mapZoom = 18;

      // 🔥 Call your existing road-width logic
    this.fetchRoadWidth(this.longitude, this.latitude);

    },
    (error) => {
      alert('Location permission denied or unavailable');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
}
autoDetectCurrentLocation() {

  if (!isPlatformBrowser(this.platformId)) return;

  if (!navigator.geolocation) {
    this.notificationservice.show(
      'Geolocation is not supported by your browser',
      'warning'
    );
    return;
  }

  this.roadWidthStatus = 'Detecting current location...';
  this.notificationservice.show(
    'Detecting current location...',
    'info'
  );

  navigator.geolocation.getCurrentPosition(
    (position) => {

      // reuse existing logic
      this.setLocation(
        position.coords.latitude,
        position.coords.longitude
      );

    },
    () => {
      this.roadWidthStatus = 'Location permission denied';
      this.notificationservice.show(
        'Location permission denied. Please search manually.',
        'warning'
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
}

  startApplication() {
    this.currentStep = 8;
  }

  /* =========================
     PREVIEW / APPLICATION FORM PDF
  ========================= */
  private formatDisplayDate(value: string | Date | null | undefined): string {
    if (!value) return '-';
    const d = new Date(value);
    return isNaN(d.getTime())
      ? '-'
      : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get previewAddress(): string {
    const d = this.tradeLicenseApplicationDetails;
    return [d.doorNumber, this.floorNumber && `Floor ${this.floorNumber}`, d.address1, d.address2, d.pincode]
      .filter(v => !!v && String(v).trim())
      .join(', ') || '-';
  }

  get previewRoadWidth(): string {
    if (!this.effectiveRoadWidthMeters) return '-';
    const source = this.roadWidthConfirmed === false ? ' (entered manually)' : '';
    return `${this.effectiveRoadWidthMeters} m / ${this.effectiveRoadWidthFeet} ft${source}`;
  }

  /** Section -> rows, shared by the Preview step and the downloadable application form. */
  get applicationSummary(): { title: string; rows: [string, string][] }[] {
    const d = this.tradeLicenseApplicationDetails;
    const a = this.tradeLicenseApplications;
    const v = (x: any) => (x === null || x === undefined || String(x).trim() === '' ? '-' : String(x));
    return [
      {
        title: 'Applicant & Trade Details',
        rows: [
          ['Applicant Representation', v(this.applicantRepresentationName)],
          ['Applicant Name', v(d.applicantName)],
          ['Trade Name', v(d.tradeName)],
          ['Trade Type', v(this.selectedTradeType?.tradeTypeName)],
          ['Mobile No.', v(d.mobileNumber)],
          ['Email', v(d.emailID)],
          ['Telephone No.', v(d.landLineNumber)],
          ['BESCOM RR No.', v(a.bescomRRNumber)],
          ['GST Number', v(a.gstNumber)],
          ['PAN Number', v(a.panNumber)],
        ],
      },
      {
        title: 'Location (GBA)',
        rows: [
          ['Corporation', v(this.selectedCorporation?.corporationName)],
          ['Zone', v(this.selectedGbaZone?.zoneName)],
          ['Ward', this.selectedGbaWard ? this.gbaWardLabel(this.selectedGbaWard) : '-'],
          ['Assembly Constituency', this.selectedGbaWard
            ? `${this.selectedGbaWard.assemblyNo} - ${this.selectedGbaWard.assemblyName}` : '-'],
          ['Trade Address', this.previewAddress],
        ],
      },
      {
        title: 'Application Details',
        rows: [
          ['Application No.', v(a.newApplicationNumber)],
          ['Date of Application', this.formatDisplayDate(this.applicationDate)],
          ['Proposed Commencement', this.formatDisplayDate(this.commencementDate)],
          ['Zone Classification', v(this.selectedZoneClassification?.zonalClassificationName)],
          ['Parking Provided', this.parkingProvided ? (this.parkingProvided === 'yes' ? 'Yes' : 'No') : '-'],
        ],
      },
      {
        title: 'Premises Location & Road Width',
        rows: [
          ['Latitude / Longitude', this.latitude != null && this.longitude != null
            ? `${this.latitude}, ${this.longitude}` : '-'],
          ['Road Type', v(this.roadWidthDetails?.roadType)],
          ['Road Category', v(this.roadWidthDetails?.roadCategory)],
          ['Road Width', this.previewRoadWidth],
        ],
      },
      {
        title: 'Power / Generator',
        rows: [
          ['Seeking Power Licence (HP)', v(this.powerHP)],
          ['Installed Generator (HP)', v(this.generatorHP)],
        ],
      },
    ];
  }

  downloadApplicationForm() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const head = { fillColor: [11, 61, 145] as [number, number, number], textColor: 255 };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Greater Bengaluru Authority', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(
      this.selectedCorporation ? `Bengaluru ${this.selectedCorporation.corporationName} City Corporation` : 'Trade Licence',
      pageWidth / 2, 22, { align: 'center' });
    doc.setFontSize(11);
    doc.text('New Trade Licence – Application Form', pageWidth / 2, 29, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleString('en-GB')}`, pageWidth - 14, 35, { align: 'right' });

    let y = 39;
    const nextY = () => ((doc as any).lastAutoTable?.finalY ?? y) + 6;

    for (const section of this.applicationSummary) {
      autoTable(doc, {
        startY: y,
        head: [[section.title, '']],
        body: section.rows,
        theme: 'grid',
        headStyles: head,
        styles: { fontSize: 9, cellPadding: 1.8 },
        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' } },
      });
      y = nextY();
    }

    autoTable(doc, {
      startY: y,
      head: [['#', 'Major Trade', 'Minor Trade', 'Sub Trade', 'Fee (Rs.)']],
      body: this.tradeGrid.length
        ? this.tradeGrid.map((t, i) => [String(i + 1), t.major, t.minor, t.sub, String(t.rate)])
        : [['-', 'No trade added', '', '', '']],
      foot: [['', '', '', 'Trade Fee Total', String(this.totalAmount)]],
      theme: 'grid',
      headStyles: head,
      footStyles: { fillColor: [235, 240, 248], textColor: 20, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 1.8 },
    });
    y = nextY();

    autoTable(doc, {
      startY: y,
      head: [['Documents Enclosed', 'File']],
      body: this.documentLabels.map(dl => [
        dl.label + (dl.required ? ' *' : ''),
        this.documentFileName(dl.key) ?? 'Not uploaded',
      ]),
      theme: 'grid',
      headStyles: head,
      styles: { fontSize: 9, cellPadding: 1.8 },
      columnStyles: { 0: { cellWidth: 90 } },
    });
    y = nextY();

    autoTable(doc, {
      startY: y,
      head: [['Fee Summary', 'Amount (Rs.)']],
      body: [
        ['Trade Fee', String(this.totalAmount)],
        ['Power Fee', String(this.powerFee)],
        ['OC Exempted Fee', String(this.ocExemptedFee)],
      ],
      foot: [['Total Payable', String(this.licenseFee)]],
      theme: 'grid',
      headStyles: head,
      footStyles: { fillColor: [220, 242, 228], textColor: 20, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 1.8 },
      columnStyles: { 0: { cellWidth: 90 } },
    });
    y = nextY();

    const declaration =
      `I/We ${this.tradeLicenseApplicationDetails.applicantName || '................'} do hereby affirm that the ` +
      'information furnished in this application is true and correct to the best of my/our knowledge and belief, ' +
      `and agree to the terms and conditions of the trade licence.${this.agree ? ' (Accepted online)' : ''}`;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Declaration by Applicant', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(declaration, pageWidth - 28), 14, y + 6);
    doc.text('Signature of Applicant', pageWidth - 14, y + 26, { align: 'right' });

    const safeName = (this.tradeLicenseApplications.newApplicationNumber
      || this.tradeLicenseApplicationDetails.tradeName || 'Application')
      .toString().replace(/[^A-Za-z0-9_-]+/g, '_');
    doc.save(`TradeLicence_ApplicationForm_${safeName}.pdf`);
  }

  private buildDraftPayloadForUpdate() {
    const fromDate = this.tradeLicenseApplications.licenceFromDate
      ? new Date(this.tradeLicenseApplications.licenceFromDate)
      : new Date(this.applicationDate);
    const toDate = this.tradeLicenseApplications.licenceToDate
      ? new Date(this.tradeLicenseApplications.licenceToDate)
      : fromDate;

    const loginId =
      this.tokenservice.getTraderUserId() ??
      this.tokenservice.getUserId() ??
      this.tokenservice.getEffectiveUserId() ??
      0;

    return {
      licenceApplicationID: this.tradeLicenseApplications.licenceApplicationID || 0,
      newApplicationNumber: this.tradeLicenseApplications.newApplicationNumber || '',
      finanicalYearID: this.tradeLicenseApplications.finanicalYearID || 0,
      tradeTypeID: this.selectedTradeType ? this.selectedTradeType.tradeTypeID : 0,
      bescomRRNumber: this.tradeLicenseApplications.bescomRRNumber || '',
      gstNumber: this.tradeLicenseApplications.gstNumber || '',
      panNumber: this.tradeLicenseApplications.panNumber || '',
      licenceFromDate: fromDate,
      licenceToDate: toDate,
      licenceApplicationStatusID: this.tradeLicenseApplications.licenceApplicationStatusID || 1,
      currentStatus: this.tradeLicenseApplications.currentStatus || 1,
      tradeLicenceID: this.tradeLicenseApplications.tradeLicenceID || 0,
      // MOH comes from the GBA ward (its mapped legacy MOH keeps approver routing unchanged)
      mohID:
        this.selectedGbaWard?.mohID ??
        this.tradeLicenseApplications.mohID ??
        0,
      loginID: loginId,
      entryOriginLoginID: this.tradeLicenseApplications.entryOriginLoginID || loginId,
      inspectingOfficerID: this.tradeLicenseApplications.inspectingOfficerID || 0,
      licenseType: this.tradeLicenseApplications.licenseType || '',
      applicantRepersenting: this.tradeLicenseApplications.applicantRepersenting || 0,
      jathaStatus: this.tradeLicenseApplications.jathaStatus || '',
      docsSubmitted: !!this.tradeLicenseApplications.docsSubmitted,
      challanNo: this.tradeLicenseApplications.challanNo || '',
      noOfYearsApplied: this.tradeLicenseApplications.noOfYearsApplied || 0
    };
  }

  private buildTradeLicencePayload() {
    return {
      applicantName: this.tradeLicenseApplicationDetails.applicantName,
      doorNumber: this.tradeLicenseApplicationDetails.doorNumber,
      address1: this.tradeLicenseApplicationDetails.address1,
      address2: this.tradeLicenseApplicationDetails.address2,
      address3: this.tradeLicenseApplicationDetails.address3,
      pincode: String(this.tradeLicenseApplicationDetails.pincode ?? '').trim(),
      landLineNumber: this.tradeLicenseApplicationDetails.landLineNumber,
      mobileNumber: this.tradeLicenseApplicationDetails.mobileNumber,
      emailID: this.tradeLicenseApplicationDetails.emailID,
      tradeName: this.tradeLicenseApplicationDetails.tradeName,

      zonalClassificationID: this.selectedZoneClassification ? this.selectedZoneClassification.zonalClassificationID : 0,
      // API fills mohID / wardID from the GBA ward; sent too so the payload stays complete
      gbaWardID: this.selectedGbaWard ? this.selectedGbaWard.gbaWardID : null,
      mohID: this.selectedGbaWard?.mohID ?? 0,
      wardID: this.selectedGbaWard?.legacyWardID ?? 0,

      propertyID: this.tradeLicenseApplicationDetails.propertyID,
      pidNumber: this.tradeLicenseApplicationDetails.pidNumber,
      khathaNumber: this.tradeLicenseApplicationDetails.khathaNumber,
      surveyNumber: this.tradeLicenseApplicationDetails.surveyNumber,
      street: this.tradeLicenseApplicationDetails.street,
      gisNumber: this.tradeLicenseApplicationDetails.gisNumber,

      licenceNumber: this.tradeLicenseApplicationDetails.licenceNumber,
      licenceCommencementDate: this.tradeLicenseApplicationDetails.licenceCommencementDate,
      licenceStatusID: 1,

      oldapplicationNumber: this.tradeLicenseApplicationDetails.oldapplicationNumber,
      newlicenceNumber: this.tradeLicenseApplicationDetails.newlicenceNumber
    };
  }

  private getCurrentDraftApplicationId(): number {
    const currentDraftId = Number(this.tradeLicenseApplications.licenceApplicationID ?? 0);
    const storedDraftId = Number(localStorage.getItem('draftLicenceApplicationId') ?? 0);
    return currentDraftId || storedDraftId || 0;
  }

  private persistDraftApplicationId(licenceApplicationID: number): void {
    this.tradeLicenseApplications.licenceApplicationID = licenceApplicationID;
    localStorage.setItem('draftLicenceApplicationId', String(licenceApplicationID));
  }

  private async createDraftHeaderIfNeeded(): Promise<number> {
    const existingDraftId = this.getCurrentDraftApplicationId();
    if (existingDraftId) {
      return existingDraftId;
    }

    const tradeLicenceRes: any = await firstValueFrom(
      this.newLicensesService.post('/trade-licence', this.buildTradeLicencePayload())
    );

    const tradeLicenceID = Number(
      tradeLicenceRes?.tradeLicenceID ??
      tradeLicenceRes?.tradeLicenceId ??
      this.tradeLicenseApplications.tradeLicenceID ??
      0
    );

    if (!tradeLicenceID) {
      throw new Error('Unable to resolve Trade Licence ID before draft creation.');
    }

    this.tradeLicenseApplications.tradeLicenceID = tradeLicenceID;
    this.tradeLicenceStateService.setTradeLicenceID(tradeLicenceID);

    const licenceApplicationDraftPayload = this.buildDraftPayloadForUpdate();
    licenceApplicationDraftPayload.tradeLicenceID = tradeLicenceID;

    if (!licenceApplicationDraftPayload.tradeTypeID || !licenceApplicationDraftPayload.loginID) {
      throw new Error('Trade Type and login are required before saving draft.');
    }

    const draftRes: any = await firstValueFrom(
      this.newLicensesService.post('/licence-application/draft', licenceApplicationDraftPayload)
    );

    const licenceApplicationID = Number(draftRes?.licenceApplicationID ?? 0);
    if (!licenceApplicationID) {
      throw new Error('Unable to resolve Licence Application ID from draft response.');
    }

    this.persistDraftApplicationId(licenceApplicationID);
    return licenceApplicationID;
  }

  async nextStep() {
    if(this.currentStep === 1){
    // 1. Applicant Representation (radio)
    const repSelected = document.querySelector('input[name="rep"]:checked');
    if (!repSelected) {
      this.notificationservice.show('Please select applicant representation', 'warning');
      return;
    }
    // 2. Trade Type
    if (!this.selectedTradeType) {
      this.notificationservice.show('Please select Trade Type','warning');
      return;
    }

    // 3. Trade Name
    const tradeName = (document.querySelector('#tradeName') as HTMLInputElement)?.value;
    if (!tradeName) {
      this.notificationservice.show('Please enter Trade Name', 'warning');
      return;
    }

    // 4. Application Name
    const applicationName = (document.querySelector('#applicationName') as HTMLInputElement)?.value;
    if (!applicationName) {
      this.notificationservice.show('Please enter Application Name', 'warning');
      return;
    }

    // 5. Mobile Number
    const mobile = this.tradeLicenseApplicationDetails.mobileNumber;
    if (!mobile || mobile.length !== 10) {
      this.notificationservice.show('Please enter valid 10-digit Mobile Number', 'warning');
      return;
    }

    // 6. Corporation / Zone / Ward (GBA)
    if (!this.selectedCorporation) {
      this.notificationservice.show('Please select Corporation', 'warning');
      return;
    }
    if (!this.selectedGbaZone) {
      this.notificationservice.show('Please select Zone', 'warning');
      return;
    }

    // 7. Ward
    if (!this.selectedGbaWard) {
      this.notificationservice.show('Please select Ward', 'warning');
      return;
    }
    if (!this.selectedGbaWard.isAvailable) {
      this.notificationservice.show(
        `Ward '${this.selectedGbaWard.wardName}' is not yet open for applications. Please contact the GBA office.`,
        'warning'
      );
      return;
    }

    // 8. BESCOM RR No
    const bescom = (document.querySelector('#bescom') as HTMLInputElement)?.value;
    if (!bescom) {
      this.notificationservice.show('Please enter BESCOM RR Number', 'warning');
      return;
    }

    // 9. Address fields
    const doorNo = (document.querySelector('#doorNo') as HTMLInputElement)?.value;
    const street = (document.querySelector('#street') as HTMLInputElement)?.value;
    const area = (document.querySelector('#area') as HTMLInputElement)?.value;
    const pincode = (document.querySelector('#pincode') as HTMLInputElement)?.value;

    if (!doorNo || !street || !area || !pincode) {
      this.notificationservice.show('Please fill complete Address Information', 'warning');
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      this.notificationservice.show('Please enter valid 6-digit Pincode', 'warning');
      return;
    }
  }
  /*=========================
    STEP 2 VALIDATION
  ========================= */
  if (this.currentStep === 2) {

    // 1. Major Trade
    if (!this.selectedMajor) {
      this.notificationservice.show('Please select Major Trade', 'warning');
      return;
    }

    // 2. Minor Trade
    if (!this.selectedMinor) {
      this.notificationservice.show('Please select Minor Trade', 'warning');
      return;
    }

    // 3. Sub Trade
    if (!this.selectedSub) {
      this.notificationservice.show('Please select Sub Trade', 'warning');
      return;
    }

    // 4. Trade Grid (at least one trade must be added)
    if (!this.tradeGrid || this.tradeGrid.length === 0) {
      this.notificationservice.show('Please add at least one Trade using Add button', 'warning');
      return;
    }
  }

  /* =========================
    STEP 3 VALIDATION
    ========================= */
    if (this.currentStep === 3) {

      // 1. Jurisdiction comes from the Corporation / Zone / Ward chosen in step 1

      // 2. Zone Classification
      if (!this.selectedZoneClassification) {
        this.notificationservice.show('Please select Zone Classification', 'warning');
        return;
      }

      // Proposed Commencement
      if(!this.commencementDate){
        this.notificationservice.show('Please select Proposed Conmmencement', 'warning');
        return;
      }

      // 3. License Fee check
      if (!this.licenseFee || this.licenseFee <= 0) {
        this.notificationservice.show('License Fee is not calculated. Please check trade details.', 'warning');
        return;
      }
    }

    /* ==========================
        STEP 4 VALIDATION
      =========================== */
     if (this.currentStep === 4) {

  if (this.roadWidthConfirmed === null) {
    this.notificationservice.show(
      'Please confirm the Road Width',
      'warning'
    );
    return;
  }

  if (this.roadWidthConfirmed === false) {
    if (!this.manualRoadWidth || this.manualRoadWidth <= 0) {
      this.notificationservice.show(
        'Please enter valid Road Width manually in meters',
        'warning'
      );
      return;
    }

    // 🔥 Override API value
    if (this.roadWidthDetails) {
      this.roadWidthDetails.road_Width_mtrs = this.manualRoadWidth.toString();
    }
    this.roadWidth_feet = this.metersToFeet(this.manualRoadWidth);
  }
}


    /* =========================
      STEP 5 VALIDATION
    ========================= */
    if (this.currentStep === 5) {

      // 1. Owner Consent
      if (!this.hasDocument('ownerConsent')) {
        this.notificationservice.show('Please upload Owner Consent / Lease Agreement document', 'warning');
        return;
      }

      // 2. Electricity Bill
      if (!this.hasDocument('electricityBill')) {
        this.notificationservice.show('Please upload Electricity Bill document', 'warning');
        return;
      }

      // 3. Neighbour Consent
      if (!this.hasDocument('neighbour')) {
        this.notificationservice.show('Please upload Neighbour Consent document', 'warning');
        return;
      }

      // 4. Power / Generator check (optional but safe)
      if (
        (this.powerHP && this.powerHP < 0) ||
        (this.generatorHP && this.generatorHP < 0)
      ) {
        this.notificationservice.show('Power / Generator HP cannot be negative', 'warning');
        return;
      }

      // Optional sanity check
      if (this.powerFee < 0) {
        this.notificationservice.show('Power fee calculation error', 'warning');
        return;
      }
    }

    if (this.currentStep === 3 && !this.getCurrentDraftApplicationId()) {
      try {
        await this.createDraftHeaderIfNeeded();
      } catch (err: any) {
        const message =
          err?.error?.message ??
          err?.message ??
          'Unable to create application draft before moving to Location';
        this.notificationservice.show(message, 'error');
        return;
      }
    }

    if (this.currentStep < 7) {
      if (this.tradeLicenseApplications.licenceApplicationID) {
    this.newLicensesService.put(
      `/licence-application/draft/${this.tradeLicenseApplications.licenceApplicationID}`,
      this.buildDraftPayloadForUpdate()
    ).subscribe();
  }
      this.currentStep++;

      // Map init only when location step loads
      if (this.currentStep === 4) {
        setTimeout(() => {
         this.initAutocomplete(); 
          this.autoDetectCurrentLocation(); 
        }, 300);
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      if (this.tradeLicenseApplications.licenceApplicationID) {
    this.newLicensesService.put(
      `/licence-application/draft/${this.tradeLicenseApplications.licenceApplicationID}`,
      this.buildDraftPayloadForUpdate()
    ).subscribe();
  }
      this.currentStep--;

      if (this.currentStep === 4) {
        setTimeout(() => {
          this.initAutocomplete();
           this.autoDetectCurrentLocation(); 
        }, 300);
      }
    }
  }

  canProceedRoadWidth(): boolean {
    // Case 1: User confirmed road width from API
    if (this.roadWidthConfirmed === true) {
      return true;
    }

    // Case 2: User entered manual road width
    if (
      this.roadWidthConfirmed === false &&
      this.manualRoadWidth !== null &&
      this.manualRoadWidth > 0
    ) {
      return true;
    }

    return false;
  }


  /* =========================
     APPLICANT
  ========================= */
  representations = [
    'Proprietor',
    'Partner',
    'Director',
    'Authorized Signatory'
  ];

  tradeGrid: TradeGridItem[] = [];

  // Shown in Preview / application form PDF (no DB column for these two yet)
  floorNumber = '';
  parkingProvided: 'yes' | 'no' | '' = '';

  get applicantRepresentationName(): string {
    const index = Number(this.tradeLicenseApplications.applicantRepersenting) - 1;
    return this.representations[index] ?? '';
  }

  /* =========================
     DATE / ZONE / FEE
  ========================= */
  applicationDate = new Date().toISOString().substring(0, 10);
  commencementDate = '';

  bindCommencementDate() {
    if (!this.commencementDate) {
      this.notificationservice.show(
        'Proposed Commencement Date is required',
        'warning'
      );
      return;
    }

    const selectedDate = new Date(this.commencementDate);
    const today = new Date();

    // Remove time part
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      this.notificationservice.show(
        'Proposed Commencement Date cannot be a past date',
        'warning'
      );
      this.commencementDate = '';
      return;
    }

    this.tradeLicenseApplications.licenceToDate = selectedDate;
  }

  zone = '';

  licenseFee = 0;

  get totalAmount(): number {
    return this.tradeGrid.reduce((sum, t) => sum + t.rate, 0);
  }

  /* =========================
     TRADE GRID
  ========================= */
  compareById(o1: any, o2: any): boolean {
    return o1 && o2 ? o1.tradeSubID === o2.tradeSubID : o1 === o2;
  }

  addTrade() {
    this.loaderservice.show();

    if (!this.selectedMajor || !this.selectedMinor || !this.selectedSub) {
      this.notificationservice.show(
        'Please select Major, Minor and Sub Trade',
        'warning'
      );
      this.loaderservice.hide();
      return;
    }

    // 🔥 Prevent Duplicate
    const exists = this.tradeGrid.some(t =>
      t.majorID === this.selectedMajor!.tradeMajorID &&
      t.minorID === this.selectedMinor!.tradeMinorID &&
      t.tradeSubID === this.selectedSub!.tradeSubID
    );

    if (exists) {
      this.notificationservice.show(
        'This trade combination is already added.',
        'warning'
      );
      this.loaderservice.hide();
      return;
    }

    this.newLicensesService
      .getLicensesFee(this.selectedSub.tradeSubID)
      .subscribe({
        next: (res) => {

          this.tradeGrid.push({
            major: this.selectedMajor!.tradeMajorName ?? '',
            majorID: this.selectedMajor!.tradeMajorID,
            minor: this.selectedMinor!.tradeMinorName,
            minorID: this.selectedMinor!.tradeMinorID,
            sub: this.selectedSub!.tradeSubName,
            tradeSubID: this.selectedSub!.tradeSubID,
            rate: res.tradeLicenceFee ?? 0
          });

          this.calculateFee();
          this.loaderservice.hide();
        },
        error: () => {
          this.notificationservice.show(
            'The amount could not be added. Please try again.',
            'warning'
          );
          this.loaderservice.hide();
        }
      });
  }


  removeTrade(index: number) {
    this.tradeGrid.splice(index, 1);
    this.calculateFee();
  }

  /* =========================
     POWER / GENERATOR
  ========================= */
  powerHP = 0;
  generatorHP = 0;
  powerFee = 0;

  readonly ocExemptedFee = 500;

  calculateFee() {
    this.powerFee = Math.max(this.powerHP, this.generatorHP) * 100;
    this.licenseFee = this.totalAmount + this.powerFee + this.ocExemptedFee;
  }

  /* =========================
     DOCUMENT UPLOAD
  ========================= */
  documents: {
    [key: string]: {
      documentId: number;
      file: File;
    }
  } = {};

  // Same order / labels as the Documents step
  readonly documentLabels: { key: string; documentId: number; label: string; required: boolean }[] = [
    { key: 'ownerConsent', documentId: 1, label: 'Owner Consent / Lease Agreement', required: true },
    { key: 'electricityBill', documentId: 9, label: 'Electricity Bill', required: true },
    { key: 'oc', documentId: 8, label: 'Occupancy Certificate', required: false },
    { key: 'neighbour', documentId: 2, label: 'Neighbour Consent', required: true },
    { key: 'noc', documentId: 7, label: 'Details of no objections and other sanctions', required: false },
    { key: 'psd', documentId: 6, label: 'Plan sanction details', required: false },
    { key: 'ccd', documentId: 5, label: 'Commencement certificate details', required: false },
    { key: 'taxReceipt', documentId: 4, label: 'Tax paid receipt', required: false },
    { key: 'khataReceipt', documentId: 3, label: 'Khata receipt', required: false },
  ];

  // Documents already uploaded with a saved draft: documentId -> file name
  savedDocuments: { [documentId: number]: string } = {};

  /** True when the document was picked now OR was uploaded earlier with this draft. */
  hasDocument(key: string): boolean {
    if (this.documents?.[key]) return true;
    const documentId = this.documentLabels.find(d => d.key === key)?.documentId;
    return documentId != null && !!this.savedDocuments[documentId];
  }

  /** File name to show in Preview / PDF (new upload wins over the saved one). */
  documentFileName(key: string): string | null {
    const picked = this.documents?.[key]?.file?.name;
    if (picked) return picked;
    const documentId = this.documentLabels.find(d => d.key === key)?.documentId;
    return documentId != null ? this.savedDocuments[documentId] ?? null : null;
  }

  onFileChange(event: any, key: string, documentId: number) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.notificationservice.show('Only PDF files allowed', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.notificationservice.show('File size must be less than 5MB', 'warning');
      return;
    }


    this.documents[key] = {
      documentId: documentId,
      file: file
    };
  }

  

  /* =========================
     OTP LOGIC
  ========================= */
  otp = '';
  otpSent = false;
  otpVerified = false;
  otpResendSeconds = 0;
  private otpResendTimer: any;

  get maskedOtpMobile(): string {
    const mobile = this.tradeLicenseApplicationDetails?.mobileNumber ?? '';
    return mobile.length > 4 ? 'XXXXXX' + mobile.slice(-4) : mobile;
  }

  sendOtp() {
    if (this.otpResendSeconds > 0) {
      return;
    }
    this.loaderservice.show();
    if (!this.tradeLicenseApplicationDetails.mobileNumber || this.tradeLicenseApplicationDetails.mobileNumber.length !== 10) {
      this.notificationservice.show('Please enter a valid 10-digit mobile number', 'warning');
      this.loaderservice.hide();
      return;
    }

    this.newLicensesService.sendOtp(this.tradeLicenseApplicationDetails.mobileNumber).subscribe({
      next: () => {
        this.otpSent = true;
        this.otp = '';
        this.notificationservice.show(`OTP sent to ${this.maskedOtpMobile}`, 'success');
        this.loaderservice.hide();
        this.startOtpResendCountdown();
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.error?.Message ||
          (typeof err?.error === 'string' ? err.error : '') ||
          'Failed to send OTP';
        this.notificationservice.show(msg, 'error');
        this.loaderservice.hide();
      }
    });
  }

  private startOtpResendCountdown(seconds = 30) {
    clearInterval(this.otpResendTimer);
    this.otpResendSeconds = seconds;
    this.otpResendTimer = setInterval(() => {
      this.otpResendSeconds--;
      if (this.otpResendSeconds <= 0) {
        clearInterval(this.otpResendTimer);
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.otpResendTimer);
  }

  // digits only; verify automatically once 6 digits are entered
  onOtpInput() {
    this.otp = (this.otp ?? '').replace(/\D/g, '').slice(0, 6);
    if (this.otp.length === 6) {
      this.verifyOtpAutomatically();
    }
  }

  verifyOtp(){
    this.verifyOtpAutomatically();
  }

  verifyOtpAutomatically() {
    this.loaderservice.show();
    this.newLicensesService
    .verifyOtp(this.tradeLicenseApplicationDetails.mobileNumber, this.otp)
    .subscribe({
      next: (res) => {
        if (res.isValid) {
          this.otpVerified = true; 
          this.loaderservice.hide();
        } else {
          this.otpVerified = false;
          this.notificationservice.show(
            'Invalid OTP',
            'error'
          );
          this.otp = '';
          this.loaderservice.hide();
        }
      },
      error: () => {
        this.otpVerified = false;
        alert('OTP verification failed');
        this.loaderservice.hide();
      }
    });
  }

//#region  Map Logic starts here
  /* =========================
     MAP + LOCATION SEARCH
  ========================= */
  latitude: number | null = null;
  longitude: number | null = null;
  //For Road width




  roadWidthSource = '';
  roadWidthStatus = '';
  roadWidthDetails: RoadWidthDetails | null = null;
  roadWidth_feet = 0;
  



  searchText = '';
  searchResults: any[] = [];

  // Road width confirmation
  roadWidthConfirmed: boolean | null = null;
  manualRoadWidth: number | null = null;
  roadWidthReason = '';

  private metersToFeet(meters: number): number {
    return +(meters * 3.28084).toFixed(2);
  }

  private extractRoadWidthItems(response: any): RoadWidthDetails[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (response?.data && typeof response.data === 'object') {
      return [response.data as RoadWidthDetails];
    }

    return [];
  }

  get effectiveRoadWidthMeters(): number {
    if (this.roadWidthConfirmed === false && this.manualRoadWidth && this.manualRoadWidth > 0) {
      return Number(this.manualRoadWidth);
    }
    return Number(this.roadWidthDetails?.road_Width_mtrs ?? 0);
  }

  get effectiveRoadWidthFeet(): number {
    return this.metersToFeet(this.effectiveRoadWidthMeters);
  }

  get detectedRoadWidthMeters(): number {
    return Number(this.roadWidthDetails?.road_Width_mtrs ?? 0);
  }

  get detectedRoadWidthFeet(): number {
    return this.metersToFeet(this.detectedRoadWidthMeters);
  }

  get manualRoadWidthFeet(): number {
    const manualMeters = Number(this.manualRoadWidth ?? 0);
    return manualMeters > 0 ? this.metersToFeet(manualMeters) : 0;
  }

  onManualRoadWidthChange(): void {
    if (this.roadWidthConfirmed !== false) {
      return;
    }
    const manualMeters = Number(this.manualRoadWidth ?? 0);
    this.roadWidth_feet = manualMeters > 0 ? this.metersToFeet(manualMeters) : 0;
  }

  //ngAfterViewInit(): void {}
ngAfterViewInit(): void {
  setTimeout(() => {
    if (!this.googleMap?.googleMap) return;

    this.map = this.googleMap.googleMap;
    this.initDrawingTool();   // ✅ rectangle works now
  }, 500);
}



private initAutocomplete(): void {
  if (!this.searchInput?.nativeElement) return;

  if (!google?.maps?.places) {
    //console.error('Google Places library not loaded');
    return;
  }

  const autocomplete = new google.maps.places.Autocomplete(
    this.searchInput.nativeElement,
    {
      componentRestrictions: { country: 'in' },
      fields: ['geometry', 'formatted_address']
    }
  );

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry || !place.geometry.location) return;

    this.setLocation(
      place.geometry.location.lat(),
      place.geometry.location.lng()
    );
  });
}

private fillAddressFromLatLng(lat: number, lng: number): void {

  if (!google?.maps?.Geocoder || !this.searchInput?.nativeElement) return;

  const geocoder = new google.maps.Geocoder();

  geocoder.geocode(
    { location: { lat, lng } },
    (
      results: google.maps.GeocoderResult[] | null,
      status: google.maps.GeocoderStatus
    ) => {

      if (
        status === google.maps.GeocoderStatus.OK &&
        results &&
        results.length > 0
      ) {
        // 🔥 Force Angular UI update
        this.searchInput.nativeElement.value =
          results[0].formatted_address;

        this.cdr.detectChanges(); // ✅ THIS FIXES IT
      }
    }
  );
}





setLocation(lat: number, lng: number): void {

  this.latitude = lat;
  this.longitude = lng;

  this.mapCenter = { lat, lng };

  // Marker logic
  if (this.map) {
    if (!this.marker) {
      this.marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        draggable: true
      });

      this.marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          this.setLocation(e.latLng.lat(), e.latLng.lng());
        }
      });
    } else {
      this.marker.setPosition({ lat, lng });
    }
  }

  // ✅ NEW: Fill address into search box
  this.fillAddressFromLatLng(lat, lng);

  // Existing API call
  this.fetchRoadWidth(lng, lat);
}



onMapReady(): void {
  if (!this.googleMap) return;

  this.map = this.googleMap.googleMap!;
  this.initDrawingTool();
}

initDrawingTool(): void {
  if (!this.map) return;
  // Remove old drawing manager if exists
  if (this.drawingManager) {
    this.drawingManager.setMap(null);
  }

  this.drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.RECTANGLE, // 🔥 FORCE
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [google.maps.drawing.OverlayType.RECTANGLE]
    },
    rectangleOptions: {
      fillColor: '#1976d2',
      fillOpacity: 0.25,
      strokeColor: '#1976d2',
      strokeWeight: 2,
      editable: true,
      draggable: true
    }
  });

  this.drawingManager.setMap(this.map);

  google.maps.event.addListener(
    this.drawingManager,
    'overlaycomplete',
    (event: google.maps.drawing.OverlayCompleteEvent) => {

      if (event.type !== google.maps.drawing.OverlayType.RECTANGLE) return;

      if (this.selectedRectangle) {
        this.selectedRectangle.setMap(null);
      }

      this.selectedRectangle = event.overlay as google.maps.Rectangle;

      const bounds = this.selectedRectangle.getBounds();
      if (!bounds) return;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      this.fetchRoadWidthByBox(ne, sw);

      // Stop drawing after one selection
      this.drawingManager.setDrawingMode(null);
    }
  );
}

fetchRoadWidthByBox(
  ne: google.maps.LatLng,
  sw: google.maps.LatLng
) {
  const licenceApplicationID = this.getCurrentDraftApplicationId();
  if (!licenceApplicationID) {
    this.notificationservice.show(
      'Save the draft first so the application ID is available.',
      'warning'
    );
    return;
  }

  const payload = {
    licenceApplicationID,
    northLat: ne.lat(),
    northLng: ne.lng(),
    southLat: sw.lat(),
    southLng: sw.lng()
  };

  this.newLicensesService.getRoadWidth(payload).subscribe({
    next: (res: any) => {
      const roadItems = this.extractRoadWidthItems(res);
      this.roadWidthDetails = roadItems[0] ?? null;
      this.roadWidth_feet = this.metersToFeet(Number(this.roadWidthDetails?.road_Width_mtrs || 0));
    },
    error: () => {
      this.roadWidthDetails = null;
    }
  });
}


onMapClick(event: google.maps.MapMouseEvent): void {
  if (!event.latLng) return;
  this.setLocation(event.latLng.lat(), event.latLng.lng());
}


  // private roundTo4Decimals(value: number): number {
  //   return Math.round(value * 10000) / 10000;
  // }

fetchRoadWidth(lng: number, lat: number) {

  this.roadWidthDetails = null;
  this.roadWidthConfirmed = null;

  this.loaderservice.show();
  this.roadWidthStatus = 'Fetching road width from server...';

  const licenceApplicationID = this.getCurrentDraftApplicationId();

  if (!licenceApplicationID) {
    this.loaderservice.hide();
    this.roadWidthStatus = 'Save the draft first so the application ID is available.';
    this.notificationservice.show(
      'Save the draft first so the application ID is available.',
      'warning'
    );
    return;
  }

  const payload = {
    licenceApplicationID,
    latitude: lat,
    longitude: lng
  };

  this.newLicensesService.getRoadWidth(payload).subscribe({
    next: (res: any) => {
      const roadItems = this.extractRoadWidthItems(res);
      if (roadItems.length > 0) {
        this.roadWidthDetails = roadItems[0];
        this.roadWidth_feet = this.metersToFeet(Number(this.roadWidthDetails?.road_Width_mtrs || 0));
        this.roadWidthStatus = 'Road width detected automatically';

        this.notificationservice.show(
          res?.message ?? 'Road width detected',
          'success'
        );

      } else {

        this.roadWidthDetails = null;
        this.roadWidthStatus = 'No road width data found';

        this.notificationservice.show(
          'No road data found. Please draw rectangle or enter manually.',
          'warning'
        );
      }

      this.loaderservice.hide();
    },

    error: (err) => {
      this.loaderservice.hide();

      const apiMsg = err?.error?.message ?? 'Unable to fetch road width';

      // 🚫 OUTSIDE BENGALURU
      if (err?.error?.code === 'OUTSIDE_GBA') {
        this.roadWidthStatus = apiMsg;

        this.notificationservice.show(
          apiMsg,
          'error'
        );
        return;
      }

      // ⏱ KGIS TIMEOUT
      if (err.status === 504) {
        this.roadWidthStatus = 'KGIS service timeout';

        this.notificationservice.show(
          apiMsg,
          'warning'
        );
        return;
      }

      //  KGIS FAILURE
      this.roadWidthStatus = apiMsg;

      this.notificationservice.show(
        apiMsg,
        'error'
      );
    }
  });
}





  /* =========================
     LOCATION SEARCH (NOMINATIM)
  ========================= */



//#endregion

  //PageLoadMethod
  ngOnInit(): void {
    // 1️⃣ Load dropdown masters (safe to load always)
    this.loadTradeType();
    this.loadTradeMajors();
    this.loadGbaCorporations();
    this.loadZoneClassification();

    // 2️⃣ Check if draft exists
    const draftId = localStorage.getItem('draftLicenceApplicationId');

    if (draftId) {
      // 🔥 RESTORE ONLY (do NOT initialize fresh)
      this.restoreDraftIfExists(+draftId);
      return;
    }

    // 3️⃣ Fresh application (ONLY if no draft)
    this.tradeLicenseApplicationDetails = initializeApplicationDetails();
    this.tradeLicenseApplications = initializeTradeApplication();
    this.tradeLicenseApplications.licenceFromDate = new Date(this.applicationDate);
  }

  /**
   * Re-opens a half-filled application with EVERYTHING saved for it: applicant + address
   * (Licence_Master_Temp), application header, trades, uploaded documents, geo-location
   * and the GBA ward. Previously only the header row was loaded, so step 1 came back
   * empty and its validation stopped the applicant from continuing.
   */
  private async restoreDraftIfExists(draftId: number): Promise<void> {
    if (!draftId || Number.isNaN(draftId)) {
      return;
    }

    this.loaderservice.show();
    try {
      const full: any = await firstValueFrom(this.newLicensesService.getDraftFullDetails(draftId));
      const app = full?.application ?? full?.Application;
      if (!app) {
        throw new Error('Draft not found');
      }

      // Already submitted / paid: not a draft any more -> start a fresh application
      if (Number(app.licenceApplicationStatusID) !== 1) {
        this.clearDraftAndStartFresh('This application was already submitted. Starting a new application.');
        return;
      }

      // Licence_Master_Temp row (has zone classification, telephone, PID... that full-details lacks)
      let master: any = null;
      if (app.tradeLicenceID) {
        const rows = await firstValueFrom(this.newLicensesService.getTradeLicenceById(Number(app.tradeLicenceID)));
        master = Array.isArray(rows) ? rows[0] : rows;
      }
      const src = { ...app, ...(master ?? {}) };

      this.tradeLicenseApplications = {
        ...initializeTradeApplication(),
        licenceApplicationID: Number(app.licenceApplicationID),
        newApplicationNumber: app.newApplicationNumber ?? '',
        finanicalYearID: Number(app.finanicalYearID ?? 0),
        tradeTypeID: Number(app.tradeTypeID ?? 0),
        bescomRRNumber: app.bescomRRNumber ?? '',
        gstNumber: app.GSTNumber ?? app.gstNumber ?? '',
        panNumber: app.PANNumber ?? app.panNumber ?? '',
        licenceFromDate: app.licenceFromDate ? new Date(app.licenceFromDate) : new Date(this.applicationDate),
        licenceToDate: app.licenceToDate ? new Date(app.licenceToDate) : (null as any),
        licenceApplicationStatusID: Number(app.licenceApplicationStatusID),
        currentStatus: Number(app.currentStatus ?? 1),
        tradeLicenceID: Number(app.tradeLicenceID ?? 0),
        mohID: Number(app.mohID ?? 0),
        loginID: Number(app.loginID ?? 0),
        entryOriginLoginID: Number(app.entryOriginLoginID ?? 0),
        inspectingOfficerID: Number(app.InspectingOfficerID ?? 0),
        licenseType: app.licenseType ?? '',
        applicantRepersenting: Number(app.ApplicantRepersenting ?? 0),
        jathaStatus: app.jathaStatus ?? '',
        docsSubmitted: !!app.docsSubmitted,
        challanNo: app.ChallanNo ?? '',
        noOfYearsApplied: Number(app.NoOfYearsApplied ?? 0),
      };
      this.tradeLicenceStateService.setTradeLicenceID(this.tradeLicenseApplications.tradeLicenceID);

      this.tradeLicenseApplicationDetails = {
        ...initializeApplicationDetails(),
        applicantName: src.applicantName ?? '',
        doorNumber: src.doorNumber ?? '',
        address1: src.address1 ?? '',
        address2: src.address2 ?? '',
        address3: src.address3 ?? '',
        pincode: String(src.pincode ?? '').trim(),
        landLineNumber: src.landLineNumber ?? '',
        mobileNumber: src.mobileNumber ?? '',
        emailID: src.emailID ?? '',
        tradeName: src.tradeName ?? '',
        zonalClassificationID: Number(src.zonalClassificationID ?? 0),
        mohID: Number(src.mohID ?? 0),
        wardID: Number(src.wardID ?? 0),
        propertyID: Number(src.PropertyID ?? src.propertyID ?? 0),
        pidNumber: src.PIDNumber ?? '',
        khathaNumber: src.khathaNumber ?? '',
        surveyNumber: src.surveyNumber ?? '',
        street: src.street ?? '',
        gisNumber: src.GISNumber ?? '',
      };

      // Proposed commencement is kept in licenceToDate (see bindCommencementDate); only reuse a future date
      const commencement = this.tradeLicenseApplications.licenceToDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.commencementDate =
        commencement && !isNaN(commencement.getTime()) && commencement >= today
          ? commencement.toISOString().substring(0, 10)
          : '';

      // Trades
      const trades: any[] = full?.tradeDetails ?? full?.TradeDetails ?? [];
      this.tradeGrid = trades.map(t => ({
        major: t.tradeMajorName ?? '',
        majorID: Number(t.tradeMajorID ?? 0),
        minor: t.tradeMinorName ?? '',
        minorID: Number(t.tradeMinorID ?? 0),
        sub: t.tradeSubName ?? '',
        tradeSubID: Number(t.tradeSubID),
        rate: Number(t.tradeFee ?? 0),
      }));
      this.calculateFee();

      // Documents already uploaded (applicant does not have to upload them again)
      this.savedDocuments = {};
      for (const d of (full?.documents ?? full?.Documents ?? []) as any[]) {
        if (d.IsActive === false || d.IsActive === 'N') continue;
        this.savedDocuments[Number(d.DocumentID)] = d.FileName ?? d.documentName ?? 'Uploaded';
      }

      // Location + road width (latest saved)
      const geo = (full?.geoLocations ?? full?.GeoLocations ?? [])[0];
      if (geo?.Latitude != null && geo?.Longitude != null) {
        this.latitude = Number(geo.Latitude);
        this.longitude = Number(geo.Longitude);
        this.mapCenter = { lat: this.latitude, lng: this.longitude };
        this.roadWidthDetails = {
          roadType: '',
          road_Width_mtrs: String(geo.RoadWidthMtrs ?? ''),
          roadCategory: geo.RoadCategory ?? '',
          roadCategoryCode: geo.RoadCategoryCode ?? '',
        };
        this.roadWidthConfirmed = geo.IsConfirmed === false ? null : true;
        this.roadWidthStatus = 'Location restored from your saved application.';
      }

      await this.ensureDraftMastersLoaded();
      this.applySelectionsFromDraft();

      this.currentStep = 1;
      this.notificationservice.show(
        'Your saved application is restored. Check each step and continue (OTP must be verified again).',
        'success'
      );
    } catch (err) {
      this.clearDraftAndStartFresh('Could not restore your saved application. Starting a new application.');
    } finally {
      this.loaderservice.hide();
      this.cdr.detectChanges();
    }
  }

  /** Trade types / zone classifications must be loaded before a draft's selections can be applied. */
  private async ensureDraftMastersLoaded(): Promise<void> {
    if (!this.tradeTypes?.length) {
      this.tradeTypes = await firstValueFrom(this.newLicensesService.getTradeTypes());
    }
    if (!this.zoneClassifications?.length) {
      this.zoneClassifications = await firstValueFrom(this.newLicensesService.getZoneClassification());
    }
  }

  private clearDraftAndStartFresh(message: string): void {
    localStorage.removeItem('draftLicenceApplicationId');
    this.tradeLicenseApplicationDetails = initializeApplicationDetails();
    this.tradeLicenseApplications = initializeTradeApplication();
    this.tradeLicenseApplications.licenceFromDate = new Date(this.applicationDate);
    this.notificationservice.show(message, 'warning');
  }

  private applySelectionsFromDraft(): void {
    const tradeTypeId = this.tradeLicenseApplications.tradeTypeID;
    if (tradeTypeId && this.tradeTypes?.length) {
      this.selectedTradeType =
        this.tradeTypes.find(t => t.tradeTypeID === tradeTypeId) ?? null;
    }

    const zonalId = this.tradeLicenseApplicationDetails.zonalClassificationID;
    if (zonalId && this.zoneClassifications?.length) {
      this.selectedZoneClassification =
        this.zoneClassifications.find(z => z.zonalClassificationID === zonalId) ??
        null;
    }

    const tempTradeLicenceId = this.tradeLicenseApplications.tradeLicenceID;
    if (tempTradeLicenceId) {
      this.restoreGbaLocation(tempTradeLicenceId);
    }
  }

  /** Re-selects Corporation / Zone / Ward saved with a draft. Drafts from before GBA have none: applicant picks again. */
  private restoreGbaLocation(tempTradeLicenceId: number) {
    this.newLicensesService.getGbaDraftLocation(tempTradeLicenceId).subscribe({
      next: (loc) => {
        const pick = () => {
          this.selectedCorporation =
            this.gbaCorporations.find(c => c.corporationID === loc.corporationID) ?? null;
          if (!this.selectedCorporation) return;

          this.newLicensesService.getGbaZones(loc.corporationID).subscribe(zones => {
            this.gbaZones = zones;
            this.selectedGbaZone = zones.find(z => z.gbaZoneID === loc.gbaZoneID) ?? null;

            this.newLicensesService.getGbaWards(loc.gbaZoneID).subscribe(wards => {
              this.gbaWards = wards;
              this.selectedGbaWard = wards.find(w => w.gbaWardID === loc.gbaWardID) ?? null;
              this.cdr.detectChanges();
            });
          });
        };

        if (this.gbaCorporations.length) pick();
        else this.newLicensesService.getGbaCorporations().subscribe(c => { this.gbaCorporations = c; pick(); });
      },
      error: () => { /* no GBA ward saved for this draft yet */ }
    });
  }


  //#region  Dropdown Methods
  //Major dropdown
  loadTradeMajors() {
    this.newLicensesService.getTradeMajors().subscribe({
      next: (res) => {
        this.tradeMajors = res;
      },
      error: (err) => {
        //console.error(err)
      }
    });
  }

  //When major changes
  onMajorChange() {
    if (!this.selectedMajor) return;
    this.selectedMinor = null;
    this.selectedSub = null;
    this.tradeSubs = [];
    this.newLicensesService
      .getTradeMinorsByMajor(this.selectedMajor.tradeMajorID)
      .subscribe({
        next: (res) => {
          this.tradeMinors = res;
        },
        error: (err) => {
          //console.error(err)
        }
      });
  }

  //When minor changes
  onMinorChange() {
    if (!this.selectedMinor) return;
    this.selectedSub = null;
    this.newLicensesService
      .getTradeSubsByMinor(this.selectedMinor.tradeMinorID)
      .subscribe({
        next: (res) => {
          this.tradeSubs = res;
        },
        error: (err) => {
          //console.error(err)
        }
      });
  }

  //Load Trade Types
  loadTradeType(){
    this.newLicensesService.getTradeTypes().subscribe({
      next: (res) => {
        this.tradeTypes = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        //console.error(err)
      }
    });
  }

  //Load MLA Constituencies
  loadMLAConstituencies(){
    this.newLicensesService.getMLAConstituency().subscribe({
      next: (res) => {
        this.mlaConstituencies = res;
      },
      error: (err) => {
        //console.error(err)
      }
    });
  }

  //#region GBA Corporation -> Zone -> Ward
  loadGbaCorporations() {
    this.newLicensesService.getGbaCorporations().subscribe({
      next: (res) => {
        this.gbaCorporations = res;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationservice.show('Could not load corporations. Please refresh the page.', 'error');
      }
    });
  }

  onCorporationChange() {
    this.selectedGbaZone = null;
    this.selectedGbaWard = null;
    this.gbaZones = [];
    this.gbaWards = [];
    if (!this.selectedCorporation) return;

    this.newLicensesService.getGbaZones(this.selectedCorporation.corporationID).subscribe({
      next: (res) => {
        this.gbaZones = res;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  onGbaZoneChange() {
    this.selectedGbaWard = null;
    this.gbaWards = [];
    if (!this.selectedGbaZone) return;

    this.newLicensesService.getGbaWards(this.selectedGbaZone.gbaZoneID).subscribe({
      next: (res) => {
        this.gbaWards = res;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  gbaWardLabel = (w: GbaWard) => `${w.wardNo} - ${w.wardName}`;

  // Search by ward number, English or Kannada name
  gbaWardSearch = (term: string, w: GbaWard) => {
    const t = term.toLowerCase();
    return String(w.wardNo).startsWith(t)
      || w.wardName.toLowerCase().includes(t)
      || (w.wardNativeName ?? '').includes(term);
  };
  //#endregion

  //When MLA Constituency changes
  onMLAConstituencyChange(){
    if(!this.selectedMLAConstituency) return;
    this.selectedWard = null;
    this.newLicensesService.getWardsByMLAConstituency(this.selectedMLAConstituency.constituencyID).subscribe({
      next: (res) => {
        this.wards = res;
      },
      error: (err) => {
        //console.error(err)
      }
    });
  }
  
  //to load zones
  loadZones(){
    this.newLicensesService.getZones().subscribe({
      next: (res) => {
        this.zones = res;
      },
      error: (err) => {
        //console.error(err)
      }
    });
  }

  //to load zonesclassification
  loadZoneClassification(){
    this.newLicensesService.getZoneClassification().subscribe({
      next: (res) => {
        this.zoneClassifications = res;
      },
      error: (err) => {
        //console.error(err)
      }
    });
    
  }

  //#endregion

  //#region  SaveAndPayLate
  /*saveAndPayLater() {
    this.loaderservice.show();
    const tradeLicencePayload = {
    applicantName: this.tradeLicenseApplicationDetails.applicantName,
    doorNumber: this.tradeLicenseApplicationDetails.doorNumber,
    address1: this.tradeLicenseApplicationDetails.address1,
    address2: this.tradeLicenseApplicationDetails.address2,
    address3: this.tradeLicenseApplicationDetails.address3,
    pincode: this.tradeLicenseApplicationDetails.pincode,
    landLineNumber: this.tradeLicenseApplicationDetails.landLineNumber,
    mobileNumber: this.tradeLicenseApplicationDetails.mobileNumber,
    emailID: this.tradeLicenseApplicationDetails.emailID,
    tradeName: this.tradeLicenseApplicationDetails.tradeName,

    zonalClassificationID: this.selectedZoneClassification ? this.selectedZoneClassification.zonalClassificationID : 0,
    mohID: this.selectedMLAConstituency ? this.selectedMLAConstituency.mohID : 0,
    wardID: this.selectedWard ? this.selectedWard.wardID : 0,

    propertyID: this.tradeLicenseApplicationDetails.propertyID,
    pidNumber: this.tradeLicenseApplicationDetails.pidNumber,
    khathaNumber: this.tradeLicenseApplicationDetails.khathaNumber,
    surveyNumber: this.tradeLicenseApplicationDetails.surveyNumber,
    street: this.tradeLicenseApplicationDetails.street,
    gisNumber: this.tradeLicenseApplicationDetails.gisNumber,

    licenceNumber: this.tradeLicenseApplicationDetails.licenceNumber,
    licenceCommencementDate: this.tradeLicenseApplicationDetails.licenceCommencementDate,
    licenceStatusID: 1, // Active

    oldapplicationNumber: this.tradeLicenseApplicationDetails.oldapplicationNumber,
    newlicenceNumber: this.tradeLicenseApplicationDetails.newlicenceNumber
  };
    // Step 1: Trade Licence Draft
  this.newLicensesService
    .post('/trade-licence', tradeLicencePayload)
    .subscribe({
      next: (res: any) => {

        // Attach TradeLicenceID
        const licenceApplicationDraftPayload = {
          finanicalYearID: this.tradeLicenseApplications.finanicalYearID,
          tradeTypeID: this.selectedTradeType ? this.selectedTradeType.tradeTypeID : 0,

          bescomRRNumber: this.tradeLicenseApplications.bescomRRNumber,
          gstNumber: this.tradeLicenseApplications.gstNumber,
          panNumber: this.tradeLicenseApplications.panNumber,

          licenceFromDate: this.tradeLicenseApplications.licenceFromDate,
          licenceToDate: this.tradeLicenseApplications.licenceToDate,

          tradeLicenceID: res.tradeLicenceID, // from API-1

          loginID: this.tokenservice.getTraderUserId(),
          entryOriginLoginID: this.tradeLicenseApplications.entryOriginLoginID,
          inspectingOfficerID: this.tradeLicenseApplications.inspectingOfficerID,

          licenseType: this.tradeLicenseApplications.licenseType,
          applicantRepersenting: this.tradeLicenseApplications.applicantRepersenting,
          jathaStatus: this.tradeLicenseApplications.jathaStatus,
          mohID: this.selectedMLAConstituency ? this.selectedMLAConstituency.mohID : 0,
          docsSubmitted: this.tradeLicenseApplications.docsSubmitted,
          challanNo: this.tradeLicenseApplications.challanNo,
          noOfYearsApplied: this.tradeLicenseApplications.noOfYearsApplied
        };

        // Step 2: Licence Application Draft
        this.newLicensesService
          .post('/licence-application/draft', licenceApplicationDraftPayload)
          .subscribe({
            next: async(draftRes: any) => {
              this.tradeLicenseApplications.licenceApplicationID =
                draftRes.licenceApplicationID;
              await this.saveLocationDetails(this.tradeLicenseApplications.licenceApplicationID);
              await this.saveOrUpdateDocuments(this.tradeLicenseApplications.licenceApplicationID);
              this.loaderservice.hide();
              this.notificationservice.show('Draft saved successfully. You can continue later.', 'success');
            },
            error: err => {
              this.loaderservice.hide();
              console.log(err);
              this.notificationservice.show('Trade licence saved but application draft failed.', 'error');
            }
          });
      },
      error: err => {
        this.loaderservice.hide();
        this.notificationservice.show('Failed to save trade licence draft.', 'error');
      }
    });
  }*/

  /**
   * Draft already exists (created on step 3, or re-opened): UPDATE it instead of inserting
   * a new trade licence + application every time (that produced hundreds of copies per trader).
   */
  private async updateExistingDraft(licenceApplicationID: number, tradeLicenceID: number): Promise<number> {
    await firstValueFrom(this.newLicensesService.updateTradeLicence(tradeLicenceID, this.buildTradeLicencePayload()));

    const draftPayload = this.buildDraftPayloadForUpdate();
    draftPayload.tradeLicenceID = tradeLicenceID;
    await firstValueFrom(this.newLicensesService.updateLicenceApplicationDraft(licenceApplicationID, draftPayload));

    // Replace trades: insert the current grid first, then remove the previously saved rows
    const before: any = await firstValueFrom(this.newLicensesService.getDraftFullDetails(licenceApplicationID));
    const oldTradeIds: number[] = (before?.tradeDetails ?? before?.TradeDetails ?? [])
      .map((t: any) => Number(t.licenceTradeDetailsID))
      .filter((id: number) => id > 0);

    await this.saveTradeDetailsTemp(licenceApplicationID);
    if (this.tradeGrid.length) {
      for (const id of oldTradeIds) {
        await firstValueFrom(this.newLicensesService.deleteTempTradeDetail(id));
      }
    }

    await this.saveUserLocationDetails(licenceApplicationID);
    await this.saveOrUpdateDocuments(licenceApplicationID);
    this.persistDraftApplicationId(licenceApplicationID);
    return licenceApplicationID;
  }

  saveDraft(): Promise<number> {
    const existingDraftId = this.getCurrentDraftApplicationId();
    const existingTradeLicenceId = Number(this.tradeLicenseApplications.tradeLicenceID || 0);
    if (existingDraftId && existingTradeLicenceId) {
      return this.updateExistingDraft(existingDraftId, existingTradeLicenceId);
    }

    return new Promise((resolve, reject) => {
      this.debugLog('saveDraft started', {
        currentStep: this.currentStep,
        tradeGridCount: this.tradeGrid.length,
        selectedTradeType: this.selectedTradeType?.tradeTypeID ?? null
      });

      const tradeLicencePayload = this.buildTradeLicencePayload();

      this.debugLog('Calling POST /trade-licence', tradeLicencePayload);
      this.newLicensesService.post('/trade-licence', tradeLicencePayload)
        .subscribe({
          next: (res: any) => {
            this.debugLog('POST /trade-licence success', res);
            const tradeLicenceID = Number(
              res?.tradeLicenceID ??
              res?.tradeLicenceId ??
              this.tradeLicenseApplications.tradeLicenceID ??
              0
            );

            if (!tradeLicenceID) {
              this.debugError('Trade licence ID missing in /trade-licence response', res);
              reject({
                error: {
                  message: 'Unable to resolve Trade Licence ID before draft save.'
                }
              });
              return;
            }

            this.tradeLicenseApplications.tradeLicenceID = tradeLicenceID;
            this.tradeLicenceStateService.setTradeLicenceID(tradeLicenceID);
            const licenceApplicationDraftPayload = this.buildDraftPayloadForUpdate();
            licenceApplicationDraftPayload.tradeLicenceID = tradeLicenceID;

            if (!licenceApplicationDraftPayload.tradeTypeID || !licenceApplicationDraftPayload.loginID) {
              this.debugError('Draft payload validation failed before API call', licenceApplicationDraftPayload);
              reject({
                error: {
                  message: 'Trade Type and login are required before saving draft.'
                }
              });
              return;
            }

            this.debugLog('Calling POST /licence-application/draft', licenceApplicationDraftPayload);

            this.newLicensesService
              .post('/licence-application/draft', licenceApplicationDraftPayload)
              .subscribe({
                next: async (draftRes: any) => {
                  try {
                  this.debugLog('POST /licence-application/draft success', draftRes);
                  this.persistDraftApplicationId(draftRes.licenceApplicationID);

                  await this.saveTradeDetailsTemp(draftRes.licenceApplicationID);
                  await this.saveUserLocationDetails(draftRes.licenceApplicationID);
                  await this.saveOrUpdateDocuments(draftRes.licenceApplicationID);

                  resolve(draftRes.licenceApplicationID);
                  } catch (err) {
                    this.debugError('Failed to complete draft save', err);
                    reject(err);
                  }
                },
                error: (err) => {
                  const details =
                    err?.error?.errors ??
                    err?.error?.message ??
                    err?.error?.title ??
                    err?.error ??
                    err;
                  this.debugError('POST /licence-application/draft failed', details);
                  reject(err);
                }
              });
          },
          error: (err) => {
            this.debugError('POST /trade-licence failed', err);
            reject(err);
          }
        });
    });
  }

  private saveTradeDetailsTemp(licenceAppId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!licenceAppId || Number.isNaN(licenceAppId)) {
        this.debugError('Skipping temp trade save: invalid licenceApplicationID', licenceAppId);
        resolve();
        return;
      }

      if (!this.tradeGrid.length) {
        this.debugError('Skipping temp trade save: tradeGrid is empty');
        resolve();
        return;
      }

      from(this.tradeGrid)
        .pipe(
          concatMap((item) => {
            const payload = {
              licenceApplicationID: licenceAppId,
              tradeSubID: item.tradeSubID,
              tradeFee: item.rate
            };
            this.debugLog('Calling POST /licence-trade-details/temp', payload);

            return this.newLicensesService.saveTradeDetailTemp(payload).pipe(
              retry({
                count: 2,
                delay: (err, retryCount) => {
                  this.debugError(
                    `Retrying temp save (attempt ${retryCount + 1}) for tradeSubID ${item.tradeSubID}`,
                    err
                  );
                  return timer(400 * retryCount);
                }
              })
            );
          }),
          toArray()
        )
        .subscribe({
          next: (res) => {
            this.debugLog('POST /licence-trade-details/temp success', res);
            resolve();
          },
          error: (err) => {
            this.debugError('POST /licence-trade-details/temp failed', err);
            reject(err);
          }
        });
    });
  }

  private buildExistingDocsMap(docs: LicenseDocuments[]): { [documentId: number]: LicenseDocuments } {
    const map: { [documentId: number]: LicenseDocuments } = {};
    docs.forEach(d => map[d.DocumentID] = d);
    return map;
  }
  saveOrUpdateDocuments(licenceAppId: number): Promise<void> {
    return new Promise((resolve, reject) => {

      if (!licenceAppId) {
        this.notificationservice.show('Invalid Licence Application ID');
        resolve(); // resolve to avoid blocking caller
        return;
      }

      this.newLicensesService
        .getDocumentsByLicensesApplicationId(licenceAppId)
        .subscribe({
          next: (existingDocs) => {

            const existingDocsMap = this.buildExistingDocsMap(existingDocs);
            const keys = Object.keys(this.documents);

            if (!keys.length) {
              resolve(); // nothing to upload
              return;
            }

            let completed = 0;
            const total = keys.length;

            keys.forEach(key => {

              const doc = this.documents[key];
              const existing = existingDocsMap[doc.documentId];

              const formData = new FormData();
              formData.append('File', doc.file);
              formData.append('LicenceApplicationID', licenceAppId.toString());
              formData.append('DocumentID', doc.documentId.toString());

              const loginId = this.tokenservice.getUserId();
              if (!loginId) {
                this.notificationservice.show('Invalid user session');
                reject('Invalid user session');
                return;
              }
              formData.append('LoginID', loginId.toString());

              if (existing) {
                formData.append(
                  'ApplicationDocumentID',
                  existing.ApplicationDocumentID.toString()
                );
              }

              this.newLicensesService
                .saveOrUpdateDocument(formData)
                .subscribe({
                  next: () => {
                    completed++;
                    // console.log(
                    //   `${existing ? 'Updated' : 'Inserted'} document`,
                    //   doc.documentId
                    // );

                    if (completed === total) {
                      resolve(); // 🔥 all uploads finished
                    }
                  },
                  error: (err) => {
                    //console.error('Upload failed', err);

                    // ❌ reject(err);
                    // ✅ allow flow to continue
                    completed++;

                    if (completed === total) {
                      resolve(); // continue even if some uploads failed
                    }
                  }
                });
            });

          },
          error: (err) => {
            console.error('Failed to fetch existing documents', err);
            reject(err);
          }
        });
    });
  }
  saveUserLocationDetails(licenceAppId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.latitude || !this.longitude || !this.roadWidthDetails) {
        this.notificationservice.show(
          'Location details are incomplete. Please select a location.',
          'warning'
        );
        reject('Location details are incomplete');
        return;
      }

      if (!this.canProceedRoadWidth()) {
        this.notificationservice.show(
          'Please confirm road width or enter a valid manual road width in meters.',
          'warning'
        );
        reject('Road width confirmation missing');
        return;
      }

      if(!licenceAppId){
        this.notificationservice.show('Invalid Licence Application ID');
        reject('Invalid Licence Application ID');
        return;
      }

      const roadWidthMtrs =
        this.roadWidthConfirmed === false
          ? Number(this.manualRoadWidth)
          : Number(this.roadWidthDetails.road_Width_mtrs ?? 0);

      const loginID =
        this.tokenservice.getTraderUserId() ??
        this.tokenservice.getEffectiveUserId() ??
        this.tokenservice.getUserId() ??
        0;

      const payload = {
        licenceApplicationID: licenceAppId,
        latitude: this.latitude,
        longitude: this.longitude,
        roadID: this.roadWidthDetails.roadType ?? '',
        roadWidthMtrs,
        roadCategoryCode: this.roadWidthDetails.roadCategoryCode ?? '',
        roadCategory: this.roadWidthDetails.roadCategory ?? '',
        loginID
      };

      this.newLicensesService.saveLocationDetails(payload).subscribe({
        next: () => {
          resolve();
        },
        error: (err) => {
          console.error('Location save failed:', err);
          this.notificationservice.show(
            'Failed to save location details. Please try again.',
            'error'
          );
          reject(err);
        }
      });
    });
  }

  onClickSaveAndPayLater() {
    this.loaderservice.show();
    this.saveDraft()
    .then(() => {
      this.loaderservice.hide();
        this.notificationservice.show(
          'Draft saved successfully. You can continue later.',
          'success'
        );
        this.router.navigate(['/trader']);
      })
      .catch((err) => {
        this.loaderservice.hide();
        this.debugError('Save and pay later failed', err);
        this.notificationservice.show(this.getSaveErrorMessage(err), 'error');
    });
  }

  //#endregion

  //#region ProccedForPayment
  private getSaveErrorMessage(err: any): string {
    const body = err?.error;
    const validationErrors = body?.errors
      ? Object.values(body.errors).flat().join(' | ')
      : '';
    return validationErrors || body?.message || body?.Message ||
      body?.error || body?.Error || body?.title ||
      (typeof body === 'string' && !body.trim().startsWith('<') ? body : '') ||
      (typeof err === 'string' ? err : '') ||
      (err?.status === 0 ? 'Cannot reach the API. Please check that the backend is running.' : '') ||
      'Unable to save the application. Please check the failed request in the browser Network tab.';
  }

  proceedForPayment() {
    this.loaderservice.show();
    this.debugLog('Proceed for payment clicked');
    this.saveDraft().then(() => {

      this.loaderservice.hide();
      this.debugLog('saveDraft completed, initiating payment');
      this.initiatePayment();
    })
    .catch((err) => {
      this.loaderservice.hide();
      this.debugError('saveDraft failed before payment', err);
      const msg = this.getSaveErrorMessage(err);
      this.notificationservice.show(
        msg,
        'error'
      );
    });
  }


  initiatePayment() {
    const applicantName =
      this.tradeLicenseApplicationDetails.applicantName?.trim() ||
      this.tokenservice.getUserFullName()?.trim() ||
      '';

    const payload = {
      licenceApplicationId: this.tradeLicenseApplications.licenceApplicationID,
      // Informational only: the API picks the corporation from the saved GBA ward
      corporationId: this.selectedCorporation?.corporationID ?? 0,
      amount: this.licenseFee,
      applicantName,
      firstname: applicantName,
      email: this.tradeLicenseApplicationDetails.emailID,
      phone: this.tradeLicenseApplicationDetails.mobileNumber
    };
    //console.log(payload);
    this.loaderservice.show();
    this.newLicensesService.paymentIntiate(payload).subscribe({
      next: res => this.redirectToPayment(res?.paymentUrl),
      error: err => {
        this.loaderservice.hide();
        const msg =
          err?.error?.message ||
          err?.error?.Message ||
          (typeof err?.error === 'string' ? err.error : '') ||
          'Unable to start payment. Please try again.';
        this.notificationservice.show(msg, 'error');
      }
    });
  }


  // Easebuzz hosted checkout: https://pay.easebuzz.in/pay/{accesskey}
  redirectToPayment(paymentUrl: string) {
    const isEasebuzzUrl = /^https:\/\/(test)?pay\.easebuzz\.in\/pay\//.test(paymentUrl ?? '');

    if (!isEasebuzzUrl) {
      this.loaderservice.hide();
      this.notificationservice.show('Unable to start payment. Please try again.', 'error');
      return;
    }

    window.location.href = paymentUrl;
  }

  //#endregion
}  
