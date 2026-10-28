import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-reports-dashboard',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reports-dashboard.html',
  styleUrl: './reports-dashboard.css',
})
export class ReportsDashboard {

  constructor(private router: Router) {}

  // This dashboard is shared by admin/approver/senior-approver/zone-approver; navigate
  // under whichever section it's currently loaded in instead of hardcoding /admin.
  private get sectionPrefix(): string {
    return '/' + (this.router.url.split('/').filter(Boolean)[0] || 'admin');
  }

  onControlSheetClick() {
    this.router.navigate([`${this.sectionPrefix}/reports/control-sheet`]);
  }

  onNotRenewedLicensesClick(){
    this.router.navigate([`${this.sectionPrefix}/reports/not-renewed-licenses`]);
  }

  onWardWiseLicensesClick(){
    this.router.navigate([`${this.sectionPrefix}/reports/ward-wise-licenses`]);
  }

  onRevenueCollectionClick(){
    this.router.navigate([`${this.sectionPrefix}/reports/revenue-collection`]);
  }

  onApplicationWiseLicensesClick(){
    this.router.navigate([`${this.sectionPrefix}/reports/application-wise-licenses`]);
  }

}
