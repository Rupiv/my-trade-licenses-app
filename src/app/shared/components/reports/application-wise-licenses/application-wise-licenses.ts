import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as FileSaver from 'file-saver';

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
  count: number;
  color: string;
  icon: string;
}

/* ===================== API ===================== */

const API_URL =
  'https://pickitover.com/api/api/trade-licence/admin/applications';
const ZONE_API = 'https://pickitover.com/api/api/bbmp-zones';
const WARD_API = 'https://pickitover.com/api/api/bbmp-wards/by-constituency';
/* ===================== COMPONENT ===================== */

@Component({
  selector: 'app-mis-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './application-wise-licenses.html',
  styleUrls: ['./application-wise-licenses.css'],
})
export class ApplicationWiseLicenses implements OnInit {

  constructor(private http: HttpClient) {}

  /* ===================== FILTERS ===================== */

  filters = {
    zoneId: null as number | null,
    mohId: null as number | null,
    wardId: null as number | null,
    licenceApplicationId: null as number | null,
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
  errorMessage = '';

  /* ===================== SUMMARY ===================== */

  statusSummary: StatusSummary[] = [];

  /* ===================== MASTER DATA ===================== */

  zones: { id: number; name: string }[] = [];
  wards: { id: number; name: string }[] = [];

  pageSizeOptions = [10, 25, 50, 100];

  /* ===================== INIT ===================== */

  ngOnInit(): void {
    this.loadData();
    this.loadZones();
  }

  /* ===================== RECORD RANGE ===================== */

  get startRecord(): number {
    return (this.currentPage - 1) * this.filters.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(
      this.currentPage * this.filters.pageSize,
      this.totalRecords
    );
  }

  /* ===================== API CALL ===================== */

  loadData(): void {

    this.loading = true;
    this.errorMessage = '';

    let params = new HttpParams()
      .set('pageNumber', this.filters.pageNumber)
      .set('pageSize', this.filters.pageSize);

    if (this.filters.zoneId)
      params = params.set('zoneId', this.filters.zoneId);

    if (this.filters.mohId)
      params = params.set('mohId', this.filters.mohId);

    if (this.filters.wardId)
      params = params.set('wardId', this.filters.wardId);

    if (this.filters.applicationNumber)
      params = params.set(
        'applicationNumber',
        this.filters.applicationNumber.trim()
      );

    this.http.get<ApiResponse>(API_URL, { params }).subscribe({
      next: (res) => this.handleResponse(res),
      error: () => {
        this.errorMessage = 'Failed to load data';
        this.loading = false;
      }
    });
  }

  /* ===================== RESPONSE ===================== */

  private handleResponse(res: ApiResponse) {

    this.applications = res.data;
    this.totalRecords = res.totalRecords;
    this.totalPages = res.totalPages;
    this.currentPage = res.pageNumber;

    this.buildStatusSummary();

    this.loading = false;
  }

  /* ===================== SUMMARY ===================== */

  private buildStatusSummary() {

    const count = (id: number) =>
      this.applications.filter(
        a => a.licenceApplicationStatusID === id
      ).length;

    this.statusSummary = [
      {
        label: 'Total Applications',
        count: this.totalRecords,
        color: 'card-blue',
        icon: '📋'
      },
      {
        label: 'Approved',
        count: count(3),
        color: 'card-green',
        icon: '✅'
      },
      {
        label: 'Forwarded',
        count: count(6),
        color: 'card-orange',
        icon: '🔁'
      },
      {
        label: 'Inspected',
        count: count(7),
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
      zoneId: null,
      mohId: null,
      wardId: null,
      licenceApplicationId: null,
      applicationNumber: '',
      pageNumber: 1,
      pageSize: 10
    };

    this.loadData();
  }

  /* ===================== PAGINATION ===================== */

  goToPage(page: number) {

    if (page < 1 || page > this.totalPages) return;

    this.filters.pageNumber = page;
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

    return new Date(dateStr).toLocaleDateString('en-IN', {
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
  onZoneChange(): void {

    this.filters.pageNumber = 1;

    this.filters.wardId = null;

    if (this.filters.zoneId) {

      this.loadWards(this.filters.zoneId);

    } else {

      this.wards = [];

    }

    this.loadData();
  }

  onWardChange(): void {
    this.filters.pageNumber = 1;
    this.loadData();
  }

  onApplicationNumberChange(): void {
    this.filters.pageNumber = 1;
    this.loadData();
  }

  /* ===================== LOAD ZONES ===================== */
  loadZones(): void {
    this.http.get<any[]>(ZONE_API)
      .subscribe({

        next: (res) => {

          this.zones = res.map(zone => ({
            id: zone.zoneID,
            name: zone.zoneName
          }));

        },
        error: (err) => {
          //console.error('Error loading zones', err);
        }
      });
  }

  /* ===================== LOAD WARDS BY ZONE ===================== */

  loadWards(zoneId: number): void {

    const url = `${WARD_API}/${zoneId}`;

    this.http.get<any[]>(url).subscribe({

      next: (res) => {

        this.wards = res.map(ward => ({
          id: ward.wardID,
          name: ward.wardName
        }));

      },

      error: (err) => {
        //console.error('Failed to load wards', err);
      }

    });

  }


  /* ===================== FETCH ALL DATA FOR EXPORT ===================== */

  fetchAllData(callback: (data: LicenceApplication[]) => void) {

    let params = new HttpParams()
      .set('pageNumber', 1)
      .set('pageSize', this.totalRecords || 10000);

    if (this.filters.zoneId)
      params = params.set('zoneId', this.filters.zoneId);

    if (this.filters.mohId)
      params = params.set('mohId', this.filters.mohId);

    if (this.filters.wardId)
      params = params.set('wardId', this.filters.wardId);

    if (this.filters.applicationNumber)
      params = params.set('applicationNumber', this.filters.applicationNumber.trim());

    this.http.get<ApiResponse>(API_URL, { params }).subscribe({

      next: (res) => {
        callback(res.data);
      },

      error: (err) => {
        //console.error('Export fetch failed', err);
      }

    });

  }

  /* ===================== EXPORT EXCEL ===================== */

  exportToExcel() {

    this.fetchAllData((data) => {

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

    this.fetchAllData((data) => {

      const doc = new jsPDF();

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