import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

/**
 * Placeholder page for a report the API does not provide yet (no not-renewed endpoint in
 * ReportsController). It shows no data rather than sample rows.
 */
@Component({
  selector: 'app-not-renewed-licenses',
  imports: [RouterModule, CommonModule],
  templateUrl: './not-renewed-licenses.html',
  styleUrl: './not-renewed-licenses.css',
})
export class NotRenewedLicenses {
  // Reports are shared by admin / approver / senior-approver / zone-approver:
  // go back to the reports page of the section this one is open in.
  private readonly sectionRouter = inject(Router);
  get reportsLink(): string {
    return '/' + (this.sectionRouter.url.split(/[/?#]/).filter(Boolean)[0] || 'admin') + '/reports';
  }
}
