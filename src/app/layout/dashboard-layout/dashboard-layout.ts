import { Component } from '@angular/core';
import { PortalAdmin } from '../../pages/portal-admin/portal-admin';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessOwner } from '../../pages/business-owner/business-owner';

@Component({
  selector: 'app-dashboard-layout',
  imports: [BusinessOwner, CommonModule, FormsModule, RouterModule],  //PortalAdmin
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout {
  sidebarOpen = false;

  constructor(private router: Router) {}

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

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }
  logout(){

  }
  badgeClass(status: string) {
    return {
      active: 'badge bg-success-subtle text-success',
      renewal_due: 'badge bg-warning-subtle text-warning',
      under_review: 'badge bg-primary-subtle text-primary',
    }
    [status];
  }
}
