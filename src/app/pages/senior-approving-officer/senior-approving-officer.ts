import { ChangeDetectorRef, Component, Inject, PLATFORM_ID } from '@angular/core';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { LoaderService } from '../../shared/components/loader/loader.service';
import { SeniorApprovingOfficerService } from './senior-approving-officer.service';
import { TokenService } from '../../core/services/token.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InspectionSubmittedApplication, SeniorApprovedApplications } from './senior-approving-officer.model';

@Component({
  selector: 'app-senior-approving-officer',
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './senior-approving-officer.html',
  styleUrl: './senior-approving-officer.css',
  standalone: true
})
export class SeniorApprovingOfficer {
    private parallaxX = 0;
    private parallaxY = 0;

    selectedApplication: number | null = null;
    pageNumber = 1;
    pageSize = 10;
    totalRecords = 0;
    totalPages = 0;
    pages: number[] = [];
    isLoading = false;
    
  constructor(
    private notificationservice: NotificationService,
    private loaderservice: LoaderService,
    private seniorapprovingofficerService: SeniorApprovingOfficerService,
    private tokenservice: TokenService,
    private cdr:ChangeDetectorRef,
    private router: Router,
     @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadSubmittedInspectionApplications();
  }

  selectRow(applicationNo: number) {
    this.selectedApplication = applicationNo;
  }

  onInspectionClick(applicationNo: number) {
    this.selectedApplication = applicationNo;
    this.router.navigate(['/senior-approver/inspection', applicationNo]);
  }

  //To load submitted inspection applications
  submittedInspectionApplications: InspectionSubmittedApplication[] = [];

  loadSubmittedInspectionApplications() {
    this.isLoading = true;
    const loginId = this.resolveLoginId();
    if(!loginId){
      this.notificationservice.show('Invalid Login ID', 'error');
      this.isLoading = false;
      return;
    }
    this.seniorapprovingofficerService.getSubmittedInspectionApplications(loginId, this.pageNumber, this.pageSize).subscribe({
      next: (response: SeniorApprovedApplications) => {
        //console.log('Response:', response);
        this.submittedInspectionApplications = response?.data ?? response?.Data ?? [];
        //console.log(this.submittedInspectionApplications);
        this.totalRecords = Number(response?.totalRecords ?? response?.TotalRecords ?? 0);
        this.pageNumber = Number(response?.pageNumber ?? response?.PageNumber ?? this.pageNumber);
        this.pageSize = Number(response?.pageSize ?? response?.PageSize ?? this.pageSize);
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        this.generatePages();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        //console.error('Error fetching submitted inspection applications:', error);
        this.cdr.detectChanges();
      }
    });
  }

  //For pages 
  generatePages() {
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.pageNumber - 2);
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    this.pages = [];
    for (let i = startPage; i <= endPage; i++) {
      this.pages.push(i);
    }
  }

  //OnPageChangeEvent
  changePage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) {
      return;
    }

    this.pageNumber = page;
    this.loadSubmittedInspectionApplications();
  }

  //Showing details for user
  get showingTo(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalRecords);
  }

  //showing from details for user
  get showingFrom(): number {
    return (this.pageNumber - 1) * this.pageSize + 1;
  }

  onParallaxMove(event: MouseEvent): void {
    const host = event.currentTarget as HTMLElement | null;
    if (!host) {
      return;
    }
    const rect = host.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    this.parallaxX = Math.max(-1, Math.min(1, x));
    this.parallaxY = Math.max(-1, Math.min(1, y));
  }

  resetParallax(): void {
    this.parallaxX = 0;
    this.parallaxY = 0;
  }

  layerTransform(depth: number): string {
    return `translate3d(${this.parallaxX * depth}px, ${this.parallaxY * depth}px, 0)`;
  }

  private resolveLoginId(): number | null {
    const decoded = this.tokenservice.getDecodedToken() as any;
    const candidates = [
      decoded?.loginID,
      decoded?.loginId,
      decoded?.LoginID,
      decoded?.sub,
      this.tokenservice.getEffectiveUserId(),
      this.tokenservice.getUserId(),
      this.tokenservice.getTraderUserId()
    ];

    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  }

}
