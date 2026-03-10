import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LicenceTemplate } from '../../shared/components/licence-template/licence-template';
import { InspectionService } from '../inspection/inspection.service';
import { LicenceApplicationModel } from '../../core/models/trade-licenses-details.model';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { timeout } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { HttpErrorResponse } from '@angular/common/http';

interface ApprovedLicenceCertificateItem {
  licenceApplicationID: number;
  applicationNumber: string;
  financialYear: string;
  licenceNumber: string;
  applicantName: string;
  tradeName: string;
  tradeAddress: string;
  tradeMajorName: string;
  tradeMinorName: string;
  tradeSubName: string;
  licenceFromDate: string;
  licenceToDate: string;
  receiptNumber: string;
  receiptDate: string;
  tradeFee: number;
  wardID?: number;
  wardName?: string;
  applicationStatus: string;
}

interface LicenceCertificateViewModel {
  wardName: string;
  licenceNo: string;
  applicationNo: string;
  financialYear: string;
  applicantName: string;
  licenceDate: string;
  tradeName: string;
  tradeAddress: string;
  sanctionedPower: string;
  majorTrade: string;
  minorTrade: string;
  subTrade: string;
  validUpto: string;
  feesPaid: string;
  paymentMode: string;
  receiptNo: string;
  paymentDate: string;
  renewBefore: string;
  qrCodeOrCertificateHash: string;
}

interface SaveGeneratedCertificatePayload {
  licenceApplicationID: number;
  applicationNumber: string;
  fileName: string;
  contentType: string;
  fileContentBase64: string;
}

@Component({
  selector: 'app-licence-certificate',
  imports: [CommonModule, RouterModule, LicenceTemplate],
  templateUrl: './licence-certificate.html',
  styleUrl: './licence-certificate.css',
  encapsulation: ViewEncapsulation.None,
})
export class LicenceCertificate {
  private static readonly CERT_CACHE_PREFIX = 'licence-cert:';
  private static readonly APP_NO_CACHE_PREFIX = 'licence-appno:';

  loading = true;
  isSaving = false;
  errorMessage = '';
  licenceApplicationId: number | null = null;
  private autoSaveAttemptedForApplicationNo = '';
  private autoSaveFailedNotified = false;

  viewModel: LicenceCertificateViewModel = {
    wardName: '-',
    licenceNo: '-',
    applicationNo: '-',
    financialYear: '-',
    applicantName: '-',
    licenceDate: '-',
    tradeName: '-',
    tradeAddress: '-',
    sanctionedPower: '-',
    majorTrade: '-',
    minorTrade: '-',
    subTrade: '-',
    validUpto: '-',
    feesPaid: '-',
    paymentMode: '-',
    receiptNo: '-',
    paymentDate: '-',
    renewBefore: '-',
    qrCodeOrCertificateHash: '-',
  };

  constructor(
    private route: ActivatedRoute,
    private inspectionService: InspectionService,
    private api: ApiService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  private from = '';

  ngOnInit(): void {
    const rawParam = this.route.snapshot.paramMap.get('licensesApplicationId') ?? '';
    this.from = this.route.snapshot.queryParamMap.get('from') ?? '';
    const appNoFromQuery = (this.route.snapshot.queryParamMap.get('applicationNumber') ?? '').trim();
    const refId = this.route.snapshot.queryParamMap.get('licenceApplicationId') ?? '';
    const parsedId = Number(refId);
    if (Number.isFinite(parsedId) && parsedId > 0) {
      this.licenceApplicationId = parsedId;
    }
    if (!rawParam) {
      this.loading = false;
      this.errorMessage = 'Invalid application id.';
      return;
    }

    const asNumber = Number(rawParam);
    const isNumericId = Number.isFinite(asNumber) && asNumber > 0 && rawParam.trim() === asNumber.toString();

    if (appNoFromQuery) {
      if (this.licenceApplicationId) {
        this.cacheApplicationNumber(this.licenceApplicationId, appNoFromQuery);
      }
      this.loadCertificateByApplicationNo(appNoFromQuery, true);
      return;
    }

    if (isNumericId) {
      this.licenceApplicationId = asNumber;
      const cachedAppNo = this.getCachedApplicationNumber(asNumber);
      if (cachedAppNo) {
        this.loadCertificateByApplicationNo(cachedAppNo, true);
        return;
      }
      this.resolveApplicationNumberFromId(asNumber);
    } else {
      this.licenceApplicationId = null;
      this.loadCertificateByApplicationNo(rawParam, true);
    }
  }

  printCertificate(): void {
    this.triggerPrintDialog();
  }

  downloadPdf(): void {
    this.downloadCertificatePdf();
  }

  @HostListener('window:afterprint')
  onAfterPrint(): void {
    this.setPrintMode(false);
  }

  goBack(): void {
    if (this.from === 'admin' && this.licenceApplicationId) {
      this.router.navigate(['/admin/licence-applications', this.licenceApplicationId]);
      return;
    }
    if (this.licenceApplicationId) {
      this.router.navigate(['/trader/view-licenses-application', this.licenceApplicationId]);
      return;
    }
    this.router.navigate(['/admin/licence-applications']);
  }

  get showSaveButton(): boolean {
    return this.from === 'admin';
  }

  async saveGeneratedCertificate(trigger: 'auto' | 'manual' = 'manual'): Promise<void> {
    if (!this.licenceApplicationId) {
      this.notificationService.show('Licence application id is missing.', 'warning');
      return;
    }

    const applicationNumber = (this.viewModel.applicationNo || '').trim();
    if (!applicationNumber || applicationNumber === '-') {
      this.notificationService.show('Application number is missing.', 'warning');
      return;
    }

    this.isSaving = true;
    try {
      const fileName = this.buildCertificateFileName();
      const pdfBlob = await this.buildCertificatePdfBlob('save');
      const payload: SaveGeneratedCertificatePayload = {
        licenceApplicationID: this.licenceApplicationId,
        applicationNumber,
        fileName,
        contentType: 'application/pdf',
        fileContentBase64: await this.blobToBase64(pdfBlob),
      };

      await firstValueFrom(
        this.api
          .post('/licence/certificate/generated/save', payload)
          .pipe(timeout(10000))
      );

      this.autoSaveFailedNotified = false;
      this.notificationService.show('Licence saved successfully. Users can download it now.', 'success');
    } catch (error) {
      console.error('Failed to save generated licence', error);
      const message = this.getSaveErrorMessage(error);
      if (trigger === 'auto') {
        if (!this.autoSaveFailedNotified) {
          this.notificationService.show(message, 'warning');
          this.autoSaveFailedNotified = true;
        }
      } else {
        this.notificationService.show(message, 'error');
      }
    } finally {
      this.isSaving = false;
    }
  }

  private resolveApplicationNumberFromId(licenceApplicationId: number): void {
    this.loading = true;
    this.errorMessage = '';

    this.inspectionService
      .getlicenceApplicationDetails(licenceApplicationId)
      .pipe(timeout(10000))
      .subscribe({
      next: (application: LicenceApplicationModel) => {
        if (!application?.applicationNumber) {
          this.loading = false;
          this.errorMessage = 'Application number not found for this id.';
          return;
        }

        this.cacheApplicationNumber(licenceApplicationId, application.applicationNumber);
        this.loadCertificateByApplicationNo(application.applicationNumber, true);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load licence application details.';
      }
    });
  }

  private loadCertificateByApplicationNo(applicationNo: string, useCache: boolean): void {
    this.loading = true;
    this.errorMessage = '';
    const normalizedAppNo = (applicationNo ?? '').trim();
    if (!normalizedAppNo) {
      this.loading = false;
      this.errorMessage = 'Invalid application number.';
      return;
    }

    if (useCache) {
      const cachedRecord = this.getCachedCertificate(normalizedAppNo);
      if (cachedRecord) {
        this.viewModel = this.buildViewModelFromCertificate(cachedRecord);
        this.loading = false;
      }
    }

    this.api
      .get<ApprovedLicenceCertificateItem[]>(`/licence/certificate/approved/${normalizedAppNo}`)
      .pipe(timeout(10000))
      .subscribe({
        next: (items) => {
          const record = items?.[0];
          if (!record) {
            if (this.loading) {
              this.loading = false;
              this.errorMessage = 'No approved licence certificate found.';
            }
            return;
          }

          this.cacheCertificate(record);
          if (!this.licenceApplicationId && Number.isFinite(record.licenceApplicationID) && record.licenceApplicationID > 0) {
            this.licenceApplicationId = record.licenceApplicationID;
          }
          if (this.licenceApplicationId && record.applicationNumber) {
            this.cacheApplicationNumber(this.licenceApplicationId, record.applicationNumber);
          }
          this.viewModel = this.buildViewModelFromCertificate(record);
          this.loading = false;
          this.errorMessage = '';
          this.tryAutoSaveForAdmin();
        },
        error: () => {
          if (this.loading) {
            this.loading = false;
            this.errorMessage = 'Unable to load approved licence certificate.';
          }
        }
      });
  }

  private tryAutoSaveForAdmin(): void {
    if (this.from !== 'admin') {
      return;
    }

    const applicationNumber = (this.viewModel.applicationNo || '').trim();
    if (!applicationNumber || applicationNumber === '-') {
      return;
    }

    if (this.autoSaveAttemptedForApplicationNo === applicationNumber) {
      return;
    }

    this.autoSaveAttemptedForApplicationNo = applicationNumber;
    void this.saveGeneratedCertificate('auto');
  }

  private cacheCertificate(record: ApprovedLicenceCertificateItem): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const applicationNo = (record?.applicationNumber ?? '').trim();
    if (!applicationNo) {
      return;
    }
    sessionStorage.setItem(
      `${LicenceCertificate.CERT_CACHE_PREFIX}${applicationNo}`,
      JSON.stringify(record)
    );
  }

  private getCachedCertificate(applicationNo: string): ApprovedLicenceCertificateItem | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    const raw = sessionStorage.getItem(
      `${LicenceCertificate.CERT_CACHE_PREFIX}${applicationNo}`
    );
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as ApprovedLicenceCertificateItem;
    } catch {
      return null;
    }
  }

  private cacheApplicationNumber(licenceApplicationId: number, applicationNo: string): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const normalized = (applicationNo ?? '').trim();
    if (!normalized) {
      return;
    }
    sessionStorage.setItem(
      `${LicenceCertificate.APP_NO_CACHE_PREFIX}${licenceApplicationId}`,
      normalized
    );
  }

  private getCachedApplicationNumber(licenceApplicationId: number): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(
      `${LicenceCertificate.APP_NO_CACHE_PREFIX}${licenceApplicationId}`
    );
  }

  private buildViewModelFromCertificate(
    record: ApprovedLicenceCertificateItem
  ): LicenceCertificateViewModel {
    return {
      wardName: record.wardName || (record.wardID ? `Ward ${record.wardID}` : '-'),
      licenceNo: record.licenceNumber || '-',
      applicationNo: record.applicationNumber || '-',
      financialYear: record.financialYear || '-',
      applicantName: record.applicantName || '-',
      licenceDate: this.formatDate(record.licenceFromDate),
      tradeName: record.tradeName || '-',
      tradeAddress: record.tradeAddress || '-',
      sanctionedPower: '-',
      majorTrade: record.tradeMajorName || '-',
      minorTrade: record.tradeMinorName || '-',
      subTrade: record.tradeSubName || '-',
      validUpto: this.formatDate(record.licenceToDate),
      feesPaid: record.tradeFee ? record.tradeFee.toString() : '-',
      paymentMode: '-',
      receiptNo: record.receiptNumber || '-',
      paymentDate: this.formatDate(record.receiptDate),
      renewBefore: this.formatDate(record.licenceToDate),
      qrCodeOrCertificateHash: record.applicationNumber || '-',
    };
  }

  private formatDate(value?: string | Date | null): string {
    if (!value) {
      return '-';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private setPrintMode(enabled: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.classList.toggle('is-printing', enabled);
  }

  private triggerPrintDialog(onComplete?: () => void): void {
    this.setPrintMode(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        this.setPrintMode(false);
        onComplete?.();
      }, 0);
    }, 0);
  }

  private async downloadCertificatePdf(): Promise<void> {
    try {
      const fileName = this.buildCertificateFileName();
      const pdfBlob = await this.buildCertificatePdfBlob('download');
      const objectUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Failed to generate certificate pdf', error);
      this.notificationService.show('Failed to download certificate PDF.', 'error');
    }
  }

  private buildCertificateFileName(): string {
    const safeValue = (this.viewModel.applicationNo || this.viewModel.licenceNo || 'certificate')
      .replace(/[^a-z0-9-_]/gi, '_')
      .trim();
    return `Licence_${safeValue || 'certificate'}.pdf`;
  }

  private async buildCertificatePdfBlob(mode: 'save' | 'download' = 'download'): Promise<Blob> {
    if (typeof document !== 'undefined') {
      const domPdf = await this.buildCertificatePdfFromDom(mode);
      if (domPdf) {
        return domPdf;
      }
    }

    return this.buildFallbackPdfBlob();
  }

  private async buildCertificatePdfFromDom(mode: 'save' | 'download'): Promise<Blob | null> {
    const target = document.querySelector('.license-certificate-page .certificate') as HTMLElement | null;
    if (!target) {
      return null;
    }

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(target, {
      scale: mode === 'save' ? 1.1 : 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imageType = mode === 'save' ? 'JPEG' : 'PNG';
    const imgData =
      mode === 'save'
        ? canvas.toDataURL('image/jpeg', 0.72)
        : canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4',
      compress: mode === 'save',
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;

    let heightLeft = imageHeight;
    let position = 0;

    pdf.addImage(imgData, imageType, 0, position, imageWidth, imageHeight, undefined, mode === 'save' ? 'FAST' : 'MEDIUM');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imageHeight;
      pdf.addPage();
      pdf.addImage(imgData, imageType, 0, position, imageWidth, imageHeight, undefined, mode === 'save' ? 'FAST' : 'MEDIUM');
      heightLeft -= pageHeight;
    }

    return pdf.output('blob');
  }

  private async buildFallbackPdfBlob(): Promise<Blob> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawRectangle({
      x: 40,
      y: 760,
      width: 515,
      height: 50,
      color: rgb(0.93, 0.96, 0.99),
      borderColor: rgb(0.72, 0.79, 0.87),
      borderWidth: 1,
    });

    page.drawText('Trade Licence Certificate', {
      x: 185,
      y: 790,
      size: 18,
      font: fontBold,
      color: rgb(0.06, 0.19, 0.33),
    });

    const rows: Array<[string, string]> = [
      ['Application No', this.viewModel.applicationNo],
      ['Licence No', this.viewModel.licenceNo],
      ['Applicant Name', this.viewModel.applicantName],
      ['Trade Name', this.viewModel.tradeName],
      ['Trade Address', this.viewModel.tradeAddress],
      ['Ward', this.viewModel.wardName],
      ['Major Trade', this.viewModel.majorTrade],
      ['Minor Trade', this.viewModel.minorTrade],
      ['Sub Trade', this.viewModel.subTrade],
      ['Licence Date', this.viewModel.licenceDate],
      ['Valid Upto', this.viewModel.validUpto],
      ['Fees Paid', this.viewModel.feesPaid],
      ['Receipt No', this.viewModel.receiptNo],
      ['Payment Date', this.viewModel.paymentDate],
    ];

    let y = 730;
    for (const [label, value] of rows) {
      page.drawText(`${label}:`, {
        x: 50,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.11, 0.11, 0.11),
      });

      page.drawText(value || '-', {
        x: 190,
        y,
        size: 11,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
      });

      y -= 25;
      if (y < 60) {
        break;
      }
    }

    page.drawText(`Generated On: ${new Date().toLocaleString('en-IN')}`, {
      x: 50,
      y: 35,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    const bytes = await pdfDoc.save();
    const byteCopy = new Uint8Array(bytes);
    return new Blob([byteCopy.buffer], { type: 'application/pdf' });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = reader.result;
        if (typeof value !== 'string') {
          reject(new Error('Unable to read file content.'));
          return;
        }
        const base64 = value.includes(',') ? value.split(',')[1] : value;
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error ?? new Error('File read failed.'));
      reader.readAsDataURL(blob);
    });
  }

  private getSaveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const status = error.status || 0;
      if (status === 404) {
        return 'Auto-save API is not available on backend (404).';
      }
      if (status === 0) {
        return 'Unable to reach save API. Check network/CORS/backend URL.';
      }
      return `Failed to save generated licence (HTTP ${status}).`;
    }
    return 'Failed to save generated licence.';
  }
}
