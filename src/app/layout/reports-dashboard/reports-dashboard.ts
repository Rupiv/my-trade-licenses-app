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

  onControlSheetClick() {
    this.router.navigate(['/admin/reports/control-sheet']);
  }

  onNotRenewedLicensesClick(){
    this.router.navigate(['/admin/reports/not-renewed-licenses']);
  }

  onWardWiseLicensesClick(){
    this.router.navigate(['/admin/reports/ward-wise-licenses']);
  }

  onRevenueCollectionClick(){
    this.router.navigate(['/admin/reports/revenue-collection']);
  }

  onApplicationWiseLicensesClick(){
    this.router.navigate(['/admin/reports/application-wise-licenses']);
  }

}
