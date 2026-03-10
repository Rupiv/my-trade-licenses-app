import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { HostListener, ElementRef, ViewChild } from '@angular/core';

interface AppNotification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  read: boolean;
  route?: string;
}

@Component({
  selector: 'app-dashboard-layout',
  imports: [CommonModule, FormsModule, RouterModule],  //PortalAdmin, BusinessOwner,ApprovingOfficer
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout {
  //workflowOpen = false;
  sidebarOpen = false;
  isWorkflowMenuOpen = false;
  isSidebarCollapsed = false;
  userFullName : string = '';
  userEmailID : string = '';
  constructor(private router: Router, private authService: AuthService, private tokenService: TokenService) {}
  role = ''; // Admin | Trader | Approver | SeniorApprover

  

  ngOnInit() { 
    this.role = this.tokenService.getUserRole();
    this.getUserDetails();
  }

  private normalizeRole(role: string | null | undefined): string {
    return (role ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  }

  get normalizedRole(): string {
    return this.normalizeRole(this.role);
  }

  get isAdminRole(): boolean {
    return this.normalizedRole === 'admin';
  }

  get isSeniorApproverRole(): boolean {
    return this.normalizedRole === 'seniorapprover' || this.normalizedRole === 'seniorapprovingofficer';
  }

  get isApproverRole(): boolean {
    return this.normalizedRole === 'approver' || this.normalizedRole === 'approvingofficer';
  }

  get isZoneApproverRole(): boolean {
    return this.normalizedRole === 'zoneapprover' || this.normalizedRole === 'zonalapprover';
  }

  get isTradeOwnerRole(): boolean {
    return this.normalizedRole === 'tradeowner' || this.normalizedRole === 'trader';
  }


  getUserDetails(){
    this.userEmailID = this.tokenService.getUserEmail();
    this.userFullName = this.tokenService.getUserFullName();
  }
  // isAdmin() {
  //   return this.role === 'admin';
  // }

  // isTrader() {
  //   return this.role === 'Trader';
  // }

  // isApprover() {
  //   return this.role === 'approver';
  // }

  // isSeniorApprover() {
  //   return this.role === 'seniorapprover';
  // }

  // licenses = [
  //   {
  //     id: 'TL-2024-001234',
  //     tradeName: 'Sharma Electronics',
  //     type: 'Retail - Electronics',
  //     status: 'active',
  //     validUntil: '31 Mar 2025',
  //     address: '123, MG Road, Bengaluru - 560001',
  //   },
  //   {
  //     id: 'TL-2024-001235',
  //     tradeName: 'Sharma Food Corner',
  //     type: 'Restaurant',
  //     status: 'renewal_due',
  //     validUntil: '15 Jan 2024',
  //     address: '45, Brigade Road, Bengaluru - 560025',
  //   },
  // ];

  // applications = [
  //   {
  //     id: 'APP-2024-005678',
  //     tradeName: 'Sharma Textiles',
  //     type: 'Retail - Clothing',
  //     status: 'under_review',
  //     submittedOn: '05 Dec 2024',
  //     currentStep: 'Inspection Scheduled',
  //     progress: 60,
  //   },
  // ];

  // notifications = [
  //   { message: 'License renewal due in 30 days for Sharma Food Corner', type: 'warning' },
  //   { message: 'Inspection scheduled for Sharma Textiles on 15 Dec 2024', type: 'info' },
  // ];
  
    toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  badgeClass(status: string) {
    return {
      active: 'badge bg-success-subtle text-success',
      renewal_due: 'badge bg-warning-subtle text-warning',
      under_review: 'badge bg-primary-subtle text-primary',
    }
    [status];
  }

  // toggleWorkflowMenu() {
  //   this.workflowOpen = !this.workflowOpen;
  // }
  toggleWorkflowMenu() {
    this.isWorkflowMenuOpen = !this.isWorkflowMenuOpen;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login'], {
      replaceUrl: true
    });
  }

  // Inside your component class:

  @ViewChild('notifWrapper') notifWrapper!: ElementRef;

  showNotifications = false;

  notifications: AppNotification[] = [
    {
      id: 1,
      title: 'Application Approved',
      message: 'Application #1141184 has been approved successfully.',
      time: '5 min ago',
      type: 'success',
      read: false,
      route: '/approver/approving-officer'
    },
    {
      id: 2,
      title: 'New Application Submitted',
      message: 'A new trade license application has been submitted for review.',
      time: '20 min ago',
      type: 'info',
      read: false,
      route: '/approver/approving-officer'
    },
    {
      id: 3,
      title: 'Inspection Pending',
      message: 'Application #248735 is pending inspection since 2 days.',
      time: '2 hours ago',
      type: 'warning',
      read: true,
      route: '/approver/inspection/248735'
    },
    {
      id: 4,
      title: 'Application Rejected',
      message: 'Application #112233 was rejected due to incomplete documents.',
      time: '1 day ago',
      type: 'danger',
      read: true
    }
  ];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  markAllAsRead() {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
  }

  onNotificationClick(n: AppNotification) {
    n.read = true;
    if (n.route) {
      this.router.navigate([n.route]);
    }
    this.showNotifications = false;
  }

  clearAll() {
    this.notifications = [];
    this.showNotifications = false;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.notifWrapper && !this.notifWrapper.nativeElement.contains(event.target)) {
      this.showNotifications = false;
    }
  }
}
