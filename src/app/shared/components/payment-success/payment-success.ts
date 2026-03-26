import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
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
export class PaymentSuccess {
  txnId = '';
  amount = '';
  licensesApplicationId = '';
  paymentDate = '';
  email = '';
  phone = '';
  corporationId = 0;

  constructor(private route: ActivatedRoute, private router: Router,
    private paymentSuccessService: PaymentSuccessService,
    private cdr: ChangeDetectorRef,
    private loaderservice: LoaderService,
    private tradeLicenceStateService: TradeLicenceStateService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.txnId = params['txnid'];
      this.amount = params['amount'];
      this.email = params['email'];
      this.phone = params['phone'];
      this.corporationId = +params['corporationId'];
      this.licensesApplicationId = params['applicationNo'];
      this.saveApplocation();
    });
  }



  saveApplocation(){
    this.loaderservice.show();
    const licenceApplicationID = Number(this.licensesApplicationId);
    if (!licenceApplicationID || Number.isNaN(licenceApplicationID)) {
      //console.error('Invalid licenceApplicationID in payment-success:', this.licensesApplicationId);
      this.loaderservice.hide();
      return;
    }

    // 1) Mark payment success first
    this.paymentSuccessService.saveApplicationToTradeLicenseWithPayment(licenceApplicationID).subscribe({
      next: (paymentRes) => {
        //console.log('Application submitted to Trade License with payment:', paymentRes);
        this.submitTradeLicenceFinal(licenceApplicationID);
      },
      error: (err) => {
        //console.error('Error submitting application to Trade License with payment:', err);
        this.loaderservice.hide();
      }
    });
  }

  private submitTradeLicenceFinal(licenceApplicationID: number): void {
    this.resolveTradeLicenceID(licenceApplicationID).subscribe({
      next: (tradeLicenceID) => {
        if (!tradeLicenceID) {
          //console.warn('Trade Licence ID missing. Skipping trade-licence final submit.');
          this.loaderservice.hide();
          return;
        }

        this.paymentSuccessService.saveApplicationToTradeLicense(tradeLicenceID).subscribe({
          next: (tradeRes) => {
            //console.log('Trade licence final submit success:', tradeRes);
            this.submitLicenceApplicationFinal(licenceApplicationID);
          },
          error: (err) => {
            //console.error('Error saving application to Trade License:', err);
            this.loaderservice.hide();
          }
        });
      },
      error: (err) => {
        //console.error('Failed to resolve tradeLicenceID:', err);
        this.loaderservice.hide();
      }
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
      catchError((err) => {
        //console.error('Error fetching licence application details for tradeLicenceID:', err);
        return of(null);
      })
    );
  }

  private submitLicenceApplicationFinal(licenceApplicationID: number): void {
    this.paymentSuccessService.saveApplicationToLicensesApp(licenceApplicationID).subscribe({
      next: (licenceRes: any) => {
        if (this.isAlreadyFinallySubmitted(licenceRes)) {
          //console.warn('Licence application already finally submitted. Treating as success.', licenceRes);
          //console.log('Final submit flow completed.');
          this.loaderservice.hide();
          return;
        }
        //console.log('Licence application final submit success:', licenceRes);
        //console.log('Final submit flow completed.');
        this.loaderservice.hide();
      },
      error: (err) => {
        const payload = err?.error ?? err;
        if (this.isAlreadyFinallySubmitted(payload)) {
          //console.warn('Licence application already finally submitted (error payload). Treating as success.', payload);
          //console.log('Final submit flow completed.');
          this.loaderservice.hide();
          return;
        }
        //console.error('Error submitting application to Licence Application:', err);
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

  goToApplication(){
    //console.log('working');
    this.router.navigate([
      'trader/view-licenses-application',
      this.licensesApplicationId
    ]);
  }
}
