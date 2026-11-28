import { CommonModule } from '@angular/common';
import { NotificationService } from '../../notification/notification.service';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { WardWiseLicensesService } from './ward-wise-licenses.service';
import { WardLicenseTable, WardLicenseSummary, WardWiseLicenseResponse } from './ward-wise-licenses.model';

import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LoaderService } from '../../loader/loader.service';
import {
  ReportFinancialYear, ReportMastersService, defaultFinancialYearId,
  pickNumber, pickString, reportErrorMessage
} from '../report-masters.service';

@Component({
  selector: 'app-ward-wise-licenses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ward-wise-licenses.html',
  styleUrl: './ward-wise-licenses.css',
})
export class WardWiseLicenses implements OnInit {
  // Shows why a report could not load (e.g. 403: reports are limited to administrators)
  private readonly reportNotifier = inject(NotificationService);
  private showReportError(err: any): void {
    const { message, type } = reportErrorMessage(err);
    this.reportNotifier.show(message, type);
  }

  // Reports are shared by admin / approver / senior-approver / zone-approver:
  // go back to the reports page of the section this one is open in.
  private readonly sectionRouter = inject(Router);
  get reportsLink(): string {
    return '/' + (this.sectionRouter.url.split(/[/?#]/).filter(Boolean)[0] || 'admin') + '/reports';
  }

  private readonly masters = inject(ReportMastersService);

  /** Null until the report has loaded (or when the procedure returned no summary row). */
  summary: WardLicenseSummary | null = null;

  table: WardLicenseTable[] = [];
  filteredTable: WardLicenseTable[] = [];

  financialYears: ReportFinancialYear[] = [];
  selectedFinancialYearId: number | null = null;

  selectedZone = 'All';
  selectedWard = 'All';
  selectedStatus = 'All';

  loading = false;
  loaded = false;

  constructor(private service: WardWiseLicensesService,
    private loaderservice: LoaderService
  ) {}

  ngOnInit() {
    this.masters.getFinancialYears().subscribe({
      next: (years) => {
        this.financialYears = years;
        this.selectedFinancialYearId = defaultFinancialYearId(years);
        this.loadData();
      },
      error: () => {
        this.reportNotifier.show('Unable to load financial years.', 'error');
        this.loadData();
      }
    });
  }

  get zones(): string[] {
    return [...new Set(this.table.map(x => x.Zone).filter(Boolean))];
  }

  /** Wards of the selected zone (all wards when no zone is selected). */
  get wards(): string[] {
    const rows = this.selectedZone === 'All' ? this.table : this.table.filter(x => x.Zone === this.selectedZone);
    return [...new Set(rows.map(x => x.Ward).filter(Boolean))];
  }

  get isFiltered(): boolean {
    return this.selectedZone !== 'All' || this.selectedWard !== 'All' || this.selectedStatus !== 'All';
  }

  /** Report totals, or the totals of the rows shown while a zone / ward / status filter is applied. */
  get displayedSummary(): WardLicenseSummary | null {
    if (!this.isFiltered) return this.summary;
    if (!this.loaded) return null;
    return this.filteredTable.reduce<WardLicenseSummary>((acc, r) => ({
      ActiveLicenses: acc.ActiveLicenses + r.Active,
      ExpiredLicenses: acc.ExpiredLicenses + r.Expired,
      SuspendedLicenses: acc.SuspendedLicenses + r.Suspended,
      TotalLicenses: acc.TotalLicenses + r.Total
    }), { ActiveLicenses: 0, ExpiredLicenses: 0, SuspendedLicenses: 0, TotalLicenses: 0 });
  }

  get selectedFinancialYearLabel(): string {
    return this.financialYears.find(fy => fy.id === this.selectedFinancialYearId)?.label ?? '';
  }

  onFinancialYearChange() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.loaderservice.show();
    this.service.getWardWiseLicenses(this.selectedFinancialYearId).subscribe({
      next: (res) => {
        this.applyResponse(res);
        this.loading = false;
        this.loaded = true;
        this.loaderservice.hide();
      },
      error: (err) => {
        this.summary = null;
        this.table = [];
        this.filteredTable = [];
        this.loading = false;
        this.loaded = true;
        this.loaderservice.hide();
        this.showReportError(err);
      }
    });
  }

  private applyResponse(res: WardWiseLicenseResponse | null) {
    const s = res?.summary;
    this.summary = s ? {
      ActiveLicenses: pickNumber(s, ['ActiveLicenses']),
      ExpiredLicenses: pickNumber(s, ['ExpiredLicenses']),
      SuspendedLicenses: pickNumber(s, ['SuspendedLicenses']),
      TotalLicenses: pickNumber(s, ['TotalLicenses'])
    } : null;

    this.table = (res?.table ?? []).map(r => ({
      Zone: pickString(r, ['Zone', 'ZoneName']),
      Ward: pickString(r, ['Ward', 'WardName']),
      Active: pickNumber(r, ['Active']),
      Expired: pickNumber(r, ['Expired']),
      Suspended: pickNumber(r, ['Suspended']),
      Total: pickNumber(r, ['Total'])
    }));

    // Keep the zone / ward selection only if it still exists in the new data
    if (!this.zones.includes(this.selectedZone)) this.selectedZone = 'All';
    if (!this.wards.includes(this.selectedWard)) this.selectedWard = 'All';
    this.applyFilter();
  }

  onZoneChange() {
    if (this.selectedWard !== 'All' && !this.wards.includes(this.selectedWard)) {
      this.selectedWard = 'All';
    }
    this.applyFilter();
  }

  resetFilters() {
    this.selectedZone = 'All';
    this.selectedWard = 'All';
    this.selectedStatus = 'All';
    this.applyFilter();
  }

  applyFilter() {

    this.filteredTable = this.table.filter(row => {

      const zoneMatch =
        this.selectedZone === 'All' || row.Zone === this.selectedZone;

      const wardMatch =
        this.selectedWard === 'All' || row.Ward === this.selectedWard;

      const statusMatch =
        this.selectedStatus === 'All' ||
        (this.selectedStatus === 'Active' && row.Active > 0) ||
        (this.selectedStatus === 'Expired' && row.Expired > 0) ||
        (this.selectedStatus === 'Suspended' && row.Suspended > 0);

      return zoneMatch && wardMatch && statusMatch;

    });
  }

  private ensureRows(): boolean {
    if (!this.filteredTable.length) {
      this.reportNotifier.show('There are no records to export.', 'warning');
      return false;
    }
    return true;
  }

  exportToExcel() {
    if (!this.ensureRows()) return;

    const worksheet = XLSX.utils.json_to_sheet(this.filteredTable);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });

    FileSaver.saveAs(data, 'ward-wise-licenses.xlsx');
  }

  exportToPDF() {
    if (!this.ensureRows()) return;

    const doc = new jsPDF();
    const fy = this.selectedFinancialYearLabel;
    doc.text('Ward-wise Licenses' + (fy ? ` (FY ${fy})` : ''), 14, 15);

    const rows = this.filteredTable.map(x => [
      x.Zone,
      x.Ward,
      x.Active,
      x.Expired,
      x.Suspended,
      x.Total
    ]);

    autoTable(doc, {
      head: [['Zone', 'Ward', 'Active', 'Expired', 'Suspended', 'Total']],
      body: rows,
      startY: 20
    });

    doc.save('ward-wise-licenses.pdf');
  }
}
