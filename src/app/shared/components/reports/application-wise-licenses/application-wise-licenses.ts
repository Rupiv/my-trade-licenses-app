import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, from, of } from 'rxjs';
import { map, mergeMap, toArray } from 'rxjs/operators';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { NotificationService } from '../../notification/notification.service';
import { LoaderService } from '../../loader/loader.service';
import { ReportMastersService, pickNumber, pickString, reportErrorMessage } from '../report-masters.service';
import { ApplicationReportQuery, ApplicationWiseLicensesService } from './application-wise-licenses.service';

/* ===================== MODELS ===================== */

export interface LicenceApplication {
  licenceApplicationID: number;
  applicationNumber: string;
  applicationSubmitDate: string;
  licenceApplicationStatusID: number;
  licenceApplicationStatusName: string;
  tradeLicenceID: number;
  applicantName: string;
  tradeName: string;
  mobileNumber: string;
  emailID: string;
  zoneID: number;
  zoneName: string;
  mohID: number;
  mohName: string;
  wardID: number;
  wardName: string;
  loginID: number;
}

export interface ApiResponse {
  role: string;
  mode: string;
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  data: LicenceApplication[];
}

export interface StatusSummary {
  label: string;
  count: number | null;
  color: string;
  icon: string;
}

/* ===================== COMPONENT ===================== */

@Component({
  selector: 'app-mis-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './application-wise-licenses.html',
  styleUrls: ['./application-wise-licenses.css'],
})
export class ApplicationWiseLicenses implements OnInit {
  // Reports are shared by admin / approver / senior-approver / zone-approver:
  // go back to the reports page of the section this one is open in.
  private readonly sectionRouter = inject(Router);
  get reportsLink(): string {
    return '/' + (this.sectionRouter.url.split(/[/?#]/).filter(Boolean)[0] || 'admin') + '/reports';
  }

  private readonly api = inject(ApplicationWiseLicensesService);
  private readonly masters = inject(ReportMastersService);
  private readonly notifier = inject(NotificationService);
  private readonly loader = inject(LoaderService);

  /* ===================== FILTERS ===================== */

  filters = {
    /** GBA corporation (the API limits officers to their assigned corporation server-side). */
    corporationId: null as number | null,
    /** BBMP zone / ward ids (Master_BBMPZone / Master_BBMPWard), as the list procedure expects. */
    zoneId: null as number | null,
    wardId: null as number | null,
    applicationNumber: '',
    pageNumber: 1,
    pageSize: 10
  };

  /* ===================== TABLE STATE ===================== */

  applications: LicenceApplication[] = [];
  totalRecords = 0;
  totalPages = 0;
  currentPage = 1;

  loading = false;
  exporting = false;
  errorMessage = '';

  /* ===================== SUMMARY ===================== */

  statusSummary: StatusSummary[] = [];
  /** Status counts from /trade-licence/admin/dashboard; null while unavailable. */
  private statusCounts: { Approved: number; Forwarded: number; Inspected: number } | null = null;

  /* ===================== MASTER DATA ===================== */

  corporations: { id: number; name: string }[] = [];
  zones: { id: number; name: string }[] = [];
  private allWards: { id: number; name: string; zoneId: number }[] = [];
  wards: { id: number; name: string }[] = [];

  pageSizeOptions = [10, 25, 50, 100];

  /* ===================== INIT ===================== */

  ngOnInit(): void {
    this.loadMasters();
    this.loadData();
  }

  /* ===================== RECORD RANGE ===================== */

  get startRecord(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.filters.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(
      this.currentPage * this.filters.pageSize,
      this.totalRecords
    );
  }

  get hasActiveFilters(): boolean {
    return !!(this.filters.corporationId || this.filters.zoneId || this.filters.wardId ||
      this.filters.applicationNumber.trim());
  }

  private get query(): ApplicationReportQuery {
    return {
      corporationId: this.filters.corporationId,
      zoneId: this.filters.zoneId,
      wardId: this.filters.wardId,
      applicationNumber: this.filters.applicationNumber
    };
  }

  /* ===================== API CALL ===================== */

  loadData(): void {

    this.loading = true;
    this.errorMessage = '';

    this.api.getApplications<ApiResponse>(this.query, this.filters.pageNumber, this.filters.pageSize).subscribe({
      next: (res) => this.handleResponse(res),
      error: (err) => {
        const { message, type } = reportErrorMessage(err);
        this.errorMessage = message;
        this.applications = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.currentPage = 1;
        this.statusCounts = null;
        this.loading = false;
        this.buildStatusSummary();
        this.notifier.show(message, type);
      }
    });

    this.loadStatusCounts();
  }

  /* ===================== RESPONSE ===================== */

  private handleResponse(res: ApiResponse | null) {

    this.applications = res?.data ?? [];
    this.totalRecords = res?.totalRecords ?? 0;
    this.totalPages = res?.totalPages ?? 0;
    this.currentPage = res?.pageNumber || 1;

    this.loading = false;

    this.buildStatusSummary();
  }

  /* ===================== SUMMARY ===================== */

  /** Real status counts for the selected corporation / zone / ward (not just the rows on this page). */
  private loadStatusCounts(): void {
    this.statusCounts = null;
    if (this.filters.applicationNumber.trim()) {
      // The dashboard action cannot filter by application number: don't show counts for a different scope
      this.buildStatusSummary();
      return;
    }
    this.api.getDashboard(this.query).subscribe({
      next: (res) => {
        const d = res?.dashboard ?? res?.Dashboard;
        this.statusCounts = d ? {
          Approved: pickNumber(d, ['Approved', 'TotalApproved']),
          Forwarded: pickNumber(d, ['Forwarded', 'TotalForwarded']),
          Inspected: pickNumber(d, ['Inspected', 'TotalInspected'])
        } : null;
        this.buildStatusSummary();
      },
      error: () => {
        // The list call reports the error; the cards just show "-"
        this.statusCounts = null;
        this.buildStatusSummary();
      }
    });
  }

  private buildStatusSummary() {

    const c = this.statusCounts;

    this.statusSummary = [
      {
        label: 'Total Applications',
        count: this.loading ? null : this.totalRecords,
        color: 'card-blue',
        icon: '📋'
      },
      {
        label: 'Approved',
        count: c ? c.Approved : null,
        color: 'card-green',
        icon: '✅'
      },
      {
        label: 'Forwarded',
        count: c ? c.Forwarded : null,
        color: 'card-orange',
        icon: '🔁'
      },
      {
        label: 'Inspected',
        count: c ? c.Inspected : null,
        color: 'card-purple',
        icon: '🔍'
      }
    ];
  }

  /* ===================== FILTERS ===================== */

  applyFilters() {
    this.filters.pageNumber = 1;
    this.loadData();
  }

  resetFilters() {

    this.filters = {
      corporationId: null,
      zoneId: null,
      wardId: null,
      applicationNumber: '',
      pageNumber: 1,
      pageSize: this.filters.pageSize
    };
    this.wards = [];

    this.loadData();
  }

  /* ===================== PAGINATION ===================== */

  goToPage(page: number) {

    if (page < 1 || page > this.totalPages || page === this.currentPage) return;

    this.filters.pageNumber = page;
    this.loadData();
  }

  onPageSizeChange(): void {
    this.filters.pageNumber = 1;
    this.loadData();
  }

  getPageNumbers(): number[] {

    const pages: number[] = [];

    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = start; i <= end; i++) pages.push(i);

    return pages;
  }

  /* ===================== HELPERS ===================== */

  formatDate(dateStr: string): string {

    if (!dateStr) return '-';

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';

    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getStatusClass(statusId: number): string {

    const map: Record<number, string> = {
      3: 'status-approved',
      6: 'status-forwarded',
      7: 'status-inspected',
      1: 'status-pending'
    };

    return map[statusId] ?? 'status-default';
  }

  /* ===================== FILTER CHANGE HANDLERS ===================== */

  onCorporationChange(): void {
    this.applyFilters();
  }

  onZoneChange(): void {
    this.filters.wardId = null;
    this.wards = this.filters.zoneId
      ? this.allWards.filter(w => w.zoneId === this.filters.zoneId).map(({ id, name }) => ({ id, name }))
      : [];
    this.applyFilters();
  }

  onWardChange(): void {
    this.applyFilters();
  }

  onApplicationNumberChange(): void {
    this.applyFilters();
  }

  /* ===================== MASTER DATA ===================== */

  private loadMasters(): void {
    this.masters.getCorporations().subscribe({
      next: (list) => this.corporations = list,
      error: () => this.corporations = []
    });

    this.api.getZones().subscribe({
      next: (res) => {
        this.zones = (res ?? []).map(zone => ({
          id: pickNumber(zone, ['zoneID']),
          name: pickString(zone, ['zoneName'])
        })).filter(z => z.id > 0);
      },
      error: () => this.zones = []
    });

    this.api.getWards().subscribe({
      next: (res) => {
        this.allWards = (res ?? []).map(ward => ({
          id: pickNumber(ward, ['wardID']),
          name: pickString(ward, ['wardName']),
          zoneId: pickNumber(ward, ['zoneID'])
        })).filter(w => w.id > 0)
          .sort((a, b) => a.name.localeCompare(b.name));
        if (this.filters.zoneId) {
          this.wards = this.allWards.filter(w => w.zoneId === this.filters.zoneId).map(({ id, name }) => ({ id, name }));
        }
      },
      error: () => this.allWards = []
    });
  }

  /* ===================== FETCH ALL DATA FOR EXPORT ===================== */

  /** Every row of the current filters, fetched in pages of 100 (the API's page-size limit). */
  fetchAllData(): Observable<LicenceApplication[]> {
    const size = ApplicationWiseLicensesService.MAX_PAGE_SIZE;
    const query = this.query;
    return this.api.getApplications<ApiResponse>(query, 1, size).pipe(
      mergeMap(first => {
        const pages = first?.totalPages ?? 0;
        if (pages <= 1) return of(first?.data ?? []);
        const rest = Array.from({ length: pages - 1 }, (_, i) => i + 2);
        return from(rest).pipe(
          mergeMap(p => this.api.getApplications<ApiResponse>(query, p, size)
            .pipe(map(r => ({ p, rows: r?.data ?? [] }))), 4),
          toArray(),
          map(parts => [
            ...(first?.data ?? []),
            ...parts.sort((a, b) => a.p - b.p).flatMap(x => x.rows)
          ])
        );
      })
    );
  }

  private runExport(write: (data: LicenceApplication[]) => void): void {
    if (this.exporting) return;
    if (!this.totalRecords) {
      this.notifier.show('There are no records to export.', 'warning');
      return;
    }
    this.exporting = true;
    this.loader.show();
    this.fetchAllData().subscribe({
      next: (data) => {
        this.exporting = false;
        this.loader.hide();
        if (!data.length) {
          this.notifier.show('There are no records to export.', 'warning');
          return;
        }
        write(data);
      },
      error: (err) => {
        this.exporting = false;
        this.loader.hide();
        this.notifier.show(reportErrorMessage(err).message || 'Export failed. Please try again.', 'error');
      }
    });
  }

  /* ===================== EXPORT EXCEL ===================== */

  exportToExcel() {

    this.runExport((data) => {

      const exportData = data.map((app, i) => ({
        'S.No': i + 1,
        'Application No': app.applicationNumber,
        'Submit Date': this.formatDate(app.applicationSubmitDate),
        'Applicant Name': app.applicantName,
        'Trade Name': app.tradeName,
        'Mobile': app.mobileNumber,
        'Zone': app.zoneName,
        'Ward': app.wardName,
        'Status': app.licenceApplicationStatusName
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');

      XLSX.writeFile(workbook, 'Licence_Applications.xlsx');

    });

  }

  /* ===================== EXPORT PDF ===================== */

  exportToPDF() {

    this.runExport((data) => {

      const doc = new jsPDF({ orientation: 'landscape' });

      doc.text('Licence Applications Report', 14, 15);

      const tableData = data.map((app, i) => [
        i + 1,
        app.applicationNumber,
        this.formatDate(app.applicationSubmitDate),
        app.applicantName,
        app.tradeName,
        app.mobileNumber,
        app.zoneName,
        app.wardName,
        app.licenceApplicationStatusName
      ]);

      autoTable(doc, {
        head: [[
          'S.No',
          'Application No',
          'Submit Date',
          'Applicant',
          'Trade',
          'Mobile',
          'Zone',
          'Ward',
          'Status'
        ]],
        body: tableData,
        startY: 20
      });

      doc.save('Licence_Applications_Report.pdf');

    });

  }
}
