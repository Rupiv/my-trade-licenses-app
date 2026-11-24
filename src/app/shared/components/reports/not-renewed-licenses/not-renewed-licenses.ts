import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-renewed-licenses',
  imports: [RouterModule, CommonModule, FormsModule],
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


  constructor(private router: Router){ }

}
