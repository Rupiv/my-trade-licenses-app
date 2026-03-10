import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TokenService } from '../../core/services/token.service';
import { TradeLicensesService } from './trader-licenses.service';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { TradeLicenseApplication } from '../../core/models/new-trade-licenses.model';
import { LoaderService } from '../../shared/components/loader/loader.service';
import { AppliedLicensesResponse, LicenceApplicationDetails } from '../../core/models/trade-licenses-details.model';

@Component({
  selector: 'app-trader-licenses',
  imports: [CommonModule, RouterModule],
  templateUrl: './trader-licenses.html',
  styleUrl: './trader-licenses.css',
})
export class TraderLicenses {

  userName = '';
  showInspectionDisclaimer = true;
  private readonly inspectionDisclaimerStorageKey = 'trader_inspection_disclaimer_seen';

  constructor(private router: Router,
    private tokenservice: TokenService,
    private tradelicensesservice: TradeLicensesService,
    private notificationservice: NotificationService,
    private loaderservice: LoaderService) {}

  ngOnInit(){
    this.loadAppliedLicensesApplicationByLoginId();
    this.userName = this.tokenservice.getUserFullName();
    const loginId = this.tokenservice.getUserId();
    const key = loginId
      ? `${this.inspectionDisclaimerStorageKey}_${loginId}`
      : this.inspectionDisclaimerStorageKey;
    this.showInspectionDisclaimer = sessionStorage.getItem(key) !== '1';
  }

  //load all applied applications by loginID
  // pageNumber = 1;
  // pageSize = 10;
  // totalRecords = 0;
  pendingPaymentApplication: TradeLicenseApplication[] = [];
  allLicensesApplications : LicenceApplicationDetails[] = [];
  showAll = false;


  loadAppliedLicensesApplicationByLoginId() {
    this.loaderservice.show();
    const loginId = this.tokenservice.getUserId();

    if (!loginId) {
      this.notificationservice.show(
        'Previous applied applications cannot be loaded!',
        'warning'
      );
      return;
    }

    this.tradelicensesservice
      .getAppliedLicensesApplications(loginId)
      .subscribe({
        next: (res: AppliedLicensesResponse) => {
          console.log(res);
          this.allLicensesApplications = res.applications;
          this.loaderservice.hide();
        },
        error: (err) => {
          this.loaderservice.hide();
          this.notificationservice.show(
            'Problem with loading application details',
            'warning'
          );
          console.error(err);
        }
      });
  }

  getProgress(status: string): number {
    switch (status) {
      case 'ENTERED':
        return 25;
      case 'VERIFIED':
        return 50;
      case 'APPROVED':
        return 100;
      default:
        return 10;
    }
  }

  openApplication(licenceApplicationID: number): void {
    console.log('working');
    this.router.navigate([
      'trader/view-licenses-application',
      licenceApplicationID
    ]);
  }

  makePayment(licenseId: number) {
    this.router.navigate(['/trade-license/payment', licenseId]);
  }

  isApproved(status: string): boolean {
    return (status || '').trim().toUpperCase() === 'APPROVED';
  }

  downloadCertificate(application: LicenceApplicationDetails): void {
    if (!application?.licenceApplicationID) {
      this.notificationservice.show('Invalid application selected.', 'warning');
      return;
    }

    this.loaderservice.show();
    this.tradelicensesservice
      .downloadGeneratedCertificate(application.licenceApplicationID)
      .subscribe({
        next: (blob) => {
          this.loaderservice.hide();
          const appNo = (application.applicationNumber || application.licenceApplicationID.toString())
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
        error: (err) => {
          this.loaderservice.hide();
          console.error('Unable to download generated certificate', err);
          this.notificationservice.show('Generated licence not found. Please contact admin.', 'warning');
        }
      });
  }

  licenses = [
    {
      id: 'TL-2024-001234',
      tradeName: 'Sharma Electronics',
      type: 'Retail - Electronics',
      status: 'active',
      validUntil: '31 Mar 2025',
      address: '123, MG Road, Bengaluru - 560001',
    },
    {
      id: 'TL-2024-001235',
      tradeName: 'Sharma Food Corner',
      type: 'Restaurant',
      status: 'renewal_due',
      validUntil: '15 Jan 2024',
      address: '45, Brigade Road, Bengaluru - 560025',
    },
  ];

  applications = [
    {
      id: 'APP-2024-005678',
      tradeName: 'Sharma Textiles',
      type: 'Retail - Clothing',
      status: 'under_review',
      submittedOn: '05 Dec 2024',
      currentStep: 'Inspection Scheduled',
      progress: 60,
    },
  ];

  notifications = [
    { message: 'License renewal due in 30 days for Sharma Food Corner', type: 'warning' },
    { message: 'Inspection scheduled for Sharma Textiles on 15 Dec 2024', type: 'info' },
  ];
  
  logout() {
    this.router.navigate(['/']);
  }

  badgeClass(status: string) {
    return {
      active: 'badge bg-success-subtle text-success',
      renewal_due: 'badge bg-warning-subtle text-warning',
      under_review: 'badge bg-primary-subtle text-primary',
    }[status];
  }

  dismissInspectionDisclaimer(): void {
    this.showInspectionDisclaimer = false;
    const loginId = this.tokenservice.getUserId();
    const key = loginId
      ? `${this.inspectionDisclaimerStorageKey}_${loginId}`
      : this.inspectionDisclaimerStorageKey;
    sessionStorage.setItem(key, '1');
  }

}
