import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-payment-failed',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './payment-failed.html',
  styleUrl: './payment-failed.css',
})
export class PaymentFailed {
   txnId = '';
  errorMsg = '';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.txnId = this.sanitizeQueryValue(params['txnid'], 64);
      this.errorMsg = this.sanitizeQueryValue(params['error'], 240) || 'Payment was not completed';
    });
  }

  private sanitizeQueryValue(value: unknown, maxLength: number): string {
    const normalized = String(value ?? '').replace(/[\u0000-\u001f\u007f<>`"']/g, '').trim();
    return normalized.slice(0, maxLength);
  }

  // Draft application is listed on the trader dashboard; payment can be retried from there
  retryPayment() {
    this.router.navigate(['/trader/trader-licenses']);
  }

  goBack() {
    this.router.navigate(['/trader']);
  }

}
