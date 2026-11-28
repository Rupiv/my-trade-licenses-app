import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-licence-certificate-lookup',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './licence-certificate-lookup.html',
  styleUrl: './licence-certificate-lookup.css',
})
export class LicenceCertificateLookup {
  applicationNumber = '';
  errorMessage = '';

  constructor(private router: Router, private route: ActivatedRoute) {}

  generate(): void {
    const value = (this.applicationNumber ?? '').trim();
    if (!value) {
      this.errorMessage = 'Please enter an application number.';
      return;
    }

    this.errorMessage = '';
    // Opened from /admin or /trader: stay in the same section (a trader-only URL is blocked for
    // admins by the role guard). Admin lookups open the certificate as staff, like the admin list does.
    const isAdmin = this.router.url.startsWith('/admin');
    this.router.navigate(['../licence-certificate', value], {
      relativeTo: this.route,
      queryParams: isAdmin ? { from: 'admin' } : undefined,
    });
  }
}
