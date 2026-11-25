import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PaymentSuccessService } from './payment-success.service';
import { LoaderService } from '../loader/loader.service';
import { NotificationService } from '../notification/notification.service';
import { TradeLicenceStateService } from '../../services/trade-licenses-service';

@Component({
  selector: 'app-payment-success',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './payment-success.html',
  styleUrl: './payment-success.css',
})
export class PaymentSuccess implements OnInit, OnDestroy {

  // Payment fields
  txnId = '';
  amount = '';
  licensesApplicationId = '';
  email = '';
  phone = '';
  corporationId = 0;
  status = '';

  // UI state
  isLoading = true;
  decryptError = false;
  countdown = 10;
  /** True once the gateway-confirmed payment has been followed by a successful final submission. */
  submissionComplete = false;

  private countdownInterval: any;
  private readonly notifier = inject(NotificationService);

  // Payment is confirmed but the automatic submission failed: the trader must know, and can finish it
  // with "Complete Submission" on the dashboard (the existing recovery path).
  private submissionFailed(): void {
    this.loaderservice.hide();
    this.notifier.show(
      'Payment received, but the application could not be submitted automatically. ' +
      'Please use "Complete Submission" on your dashboard, or contact support with Transaction ID ' + this.txnId + '.',
      'warning');
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentSuccessService: PaymentSuccessService,
    private cdr: ChangeDetectorRef,
    private loaderservice: LoaderService,
    private tradeLicenceStateService: TradeLicenceStateService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const data = params['data'];
      const key = params['key'];
      const iv = params['iv'];

      if (!data || !key || !iv) {
        this.decryptError = true;
        this.isLoading = false;
        return;
      }

      this.loaderservice.show();

      // ✅ STEP 1: Decrypt via backend API
      this.paymentSuccessService.decryptPayment(data, key, iv).subscribe({
        next: (res: any) => {
          // ✅ STEP 2: Assign decrypted values to fields
          this.txnId = res.txnid ?? '';
          this.amount = res.amount ?? '';
          this.email = res.email ?? '';
          this.phone = res.phone ?? '';
          this.corporationId = res.corporationId ?? 0;
          this.licensesApplicationId = String(res.applicationId ?? '');
          this.status = res.status ?? '';

          // Only a gateway-confirmed success may continue to submission
          if (String(this.status).toLowerCase() !== 'success') {
            this.loaderservice.hide();
            this.router.navigate(['trader/payment-failed'], {
              queryParams: { txnid: this.txnId, error: `Payment ${this.status || 'not completed'}` }
            });
            return;
          }

          this.isLoading = false;
          this.cdr.detectChanges();

          // ✅ STEP 3: Run business logic
          this.saveApplication();

          // ✅ STEP 4: Start countdown to redirect
          this.startCountdown();
        },
        error: () => {
          this.decryptError = true;
          this.isLoading = false;
          this.loaderservice.hide();
          this.cdr.detectChanges();
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  // ✅ Countdown then redirect to dashboard
  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      this.cdr.detectChanges();
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.goToDashboard();
      }
    }, 1000);
  }

  public goToDashboard(): void {
    this.router.navigate(['trader']);
  }

  /** Corporation-specific payment acknowledgement (by the draft id this page receives from the gateway). */
  goToAcknowledgement(): void {
    this.router.navigate(['trader/licence-acknowledgement', this.licensesApplicationId], {
      queryParams: { source: 'draft' }
    });
  }

  goToApplication(): void {
    this.router.navigate([
      'trader/view-licenses-application',
      this.licensesApplicationId
    ]);
  }

  // ─── Business Logic (unchanged) ───────────────────────────────────────────

  private saveApplication(): void {
    this.loaderservice.show();
    const licenceApplicationID = Number(this.licensesApplicationId);

    if (!licenceApplicationID || Number.isNaN(licenceApplicationID)) {
      this.loaderservice.hide();
      return;
    }

    this.paymentSuccessService.saveApplicationToTradeLicenseWithPayment(licenceApplicationID).subscribe({
      next: () => this.submitTradeLicenceFinal(licenceApplicationID),
      error: () => this.submissionFailed()
    });
  }

  private submitTradeLicenceFinal(licenceApplicationID: number): void {
    this.resolveTradeLicenceID(licenceApplicationID).subscribe({
      next: (tradeLicenceID) => {
        if (!tradeLicenceID) {
          this.submissionFailed();
          return;
        }
        this.paymentSuccessService.saveApplicationToTradeLicense(tradeLicenceID).subscribe({
          next: () => this.submitLicenceApplicationFinal(licenceApplicationID),
          error: () => this.submissionFailed()
        });
      },
      error: () => this.submissionFailed()
    });
  }

  private resolveTradeLicenceID(licenceApplicationID: number) {
    const stateTradeLicenceID = this.tradeLicenceStateService.getTradeLicenceID();
    if (stateTradeLicenceID) {
      return of(stateTradeLicenceID);
    }

    return this.paymentSuccessService.getLicenceApplicationById(licenceApplicationID).pipe(
      map((res: any) => {
        const tradeLicenceID = Number(res?.tradeLicenceID);
        if (tradeLicenceID && !Number.isNaN(tradeLicenceID)) {
          this.tradeLicenceStateService.setTradeLicenceID(tradeLicenceID);
          return tradeLicenceID;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  private submitLicenceApplicationFinal(licenceApplicationID: number): void {
    this.paymentSuccessService.saveApplicationToLicensesApp(licenceApplicationID).subscribe({
      next: (licenceRes: any) => {
        this.submissionComplete = true;
        this.cdr.detectChanges();
        if (this.isAlreadyFinallySubmitted(licenceRes)) {
          this.loaderservice.hide();
          return;
        }
        this.loaderservice.hide();
      },
      error: (err) => {
        const payload = err?.error ?? err;
        if (this.isAlreadyFinallySubmitted(payload)) {
          this.submissionComplete = true;
          this.cdr.detectChanges();
          this.loaderservice.hide();
          return;
        }
        this.submissionFailed();
      }
    });
  }

  private isAlreadyFinallySubmitted(payload: any): boolean {
    const message = String(payload?.message ?? payload?.Message ?? '').trim().toLowerCase();
    const submitted = payload?.submitted;
    return (
      message.includes('already finally submitted') ||
      (submitted === false && message.includes('already submitted'))
    );
  }
}