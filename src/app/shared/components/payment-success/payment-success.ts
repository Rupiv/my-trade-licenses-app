import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PaymentSuccessService } from './payment-success.service';
import { LoaderService } from '../loader/loader.service';
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

  private countdownInterval: any;

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

  goToApplication(): void {
    this.router.navigate([
      'trader/licenses-application',
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
      error: () => this.loaderservice.hide()
    });
  }

  private submitTradeLicenceFinal(licenceApplicationID: number): void {
    this.resolveTradeLicenceID(licenceApplicationID).subscribe({
      next: (tradeLicenceID) => {
        if (!tradeLicenceID) {
          this.loaderservice.hide();
          return;
        }
        this.paymentSuccessService.saveApplicationToTradeLicense(tradeLicenceID).subscribe({
          next: () => this.submitLicenceApplicationFinal(licenceApplicationID),
          error: () => this.loaderservice.hide()
        });
      },
      error: () => this.loaderservice.hide()
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
        if (this.isAlreadyFinallySubmitted(licenceRes)) {
          this.loaderservice.hide();
          return;
        }
        this.loaderservice.hide();
      },
      error: (err) => {
        const payload = err?.error ?? err;
        if (this.isAlreadyFinallySubmitted(payload)) {
          this.loaderservice.hide();
          return;
        }
        this.loaderservice.hide();
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