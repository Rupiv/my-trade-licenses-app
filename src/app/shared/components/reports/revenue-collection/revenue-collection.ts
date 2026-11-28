import { CommonModule } from '@angular/common';
import { NotificationService } from '../../notification/notification.service';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { RevenueCollectionService } from './revenue-collection.service';
import { RevenueSummary, CorporationSummary, RevenueCollectionResponse } from './revenue-collection.model';
import { LoaderService } from '../../loader/loader.service';
import {
  ReportCorporation, ReportMastersService, pickNumber, reportErrorMessage
} from '../report-masters.service';

import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-revenue-collection',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './revenue-collection.html',
  styleUrl: './revenue-collection.css',
})
export class RevenueCollection implements OnInit {
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
  private readonly loader = inject(LoaderService);

  /** Null until the report has loaded (or when the procedure returned no summary row). */
  summary: RevenueSummary | null = null;

  table: CorporationSummary[] = [];

  corporations: ReportCorporation[] = [];

  /** Filters sent to the API (corporationId, fromDate, toDate). */
  selectedCorporationId: number | null = null;
  fromDate = '';
  toDate = '';

  filterError = '';
  loading = false;
  loaded = false;

  constructor(private service: RevenueCollectionService) {}

  ngOnInit() {
    this.masters.getCorporations().subscribe({
      next: (list) => this.corporations = list,
      error: () => this.corporations = [] // rows then show the corporation id
    });
    this.loadData();
  }

  corporationName(id: number): string {
    return this.corporations.find(c => c.id === id)?.name || (id ? `Corporation ${id}` : '-');
  }

  get isFiltered(): boolean {
    return !!(this.selectedCorporationId || this.fromDate || this.toDate);
  }

  /** From-date must not be after to-date (yyyy-MM-dd strings compare in date order). */
  private validateFilters(): boolean {
    this.filterError = '';
    if (this.fromDate && this.toDate && this.fromDate > this.toDate) {
      this.filterError = 'From date must be on or before To date.';
      return false;
    }
    return true;
  }

  applyFilter() {
    if (!this.validateFilters()) return;
    this.loadData();
  }

  resetFilters() {
    this.selectedCorporationId = null;
    this.fromDate = '';
    this.toDate = '';
    this.filterError = '';
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.loader.show();
    this.service.getRevenueCollection({
      corporationId: this.selectedCorporationId,
      fromDate: this.fromDate || null,
      toDate: this.toDate || null
    }).subscribe({
      next: (res) => {
        this.applyResponse(res);
        this.loading = false;
        this.loaded = true;
        this.loader.hide();
      },
      error: (err) => {
        this.summary = null;
        this.table = [];
        this.loading = false;
        this.loaded = true;
        this.loader.hide();
        this.showReportError(err);
      }
    });
  }

  private applyResponse(res: RevenueCollectionResponse | null) {
    const s = res?.summary;
    this.summary = s ? {
      TotalDemand: pickNumber(s, ['TotalDemand']),
      TotalCollected: pickNumber(s, ['TotalCollected']),
      PendingAmount: pickNumber(s, ['PendingAmount']),
      TotalTransactions: pickNumber(s, ['TotalTransactions'])
    } : null;

    this.table = (res?.corporationSummary ?? []).map(r => ({
      CorporationId: pickNumber(r, ['CorporationId', 'CorporationID']),
      Demand: pickNumber(r, ['Demand']),
      Collected: pickNumber(r, ['Collected']),
      Pending: pickNumber(r, ['Pending']),
      CollectionPercent: pickNumber(r, ['CollectionPercent'])
    }));
  }

  private get exportRows() {
    return this.table.map(x => ({
      Corporation: this.corporationName(x.CorporationId),
      Demand: x.Demand,
      Collected: x.Collected,
      Pending: x.Pending,
      'Collection %': x.CollectionPercent
    }));
  }

  private ensureRows(): boolean {
    if (!this.table.length) {
      this.reportNotifier.show('There are no records to export.', 'warning');
      return false;
    }
    return true;
  }

  private get periodLabel(): string {
    if (!this.fromDate && !this.toDate) return '';
    return ` (${this.fromDate || '...'} to ${this.toDate || '...'})`;
  }

  exportExcel() {
    if (!this.ensureRows()) return;

    const worksheet = XLSX.utils.json_to_sheet(this.exportRows);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const data = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    FileSaver.saveAs(data, 'revenue-collection.xlsx');
  }

  exportPDF() {
    if (!this.ensureRows()) return;

    const doc = new jsPDF();
    doc.text('Revenue & Collections' + this.periodLabel, 14, 15);

    const rows = this.exportRows.map(x => [
      x.Corporation,
      x.Demand,
      x.Collected,
      x.Pending,
      x['Collection %'] + '%'
    ]);

    autoTable(doc, {
      head: [['Corporation', 'Demand', 'Collected', 'Pending', 'Collection %']],
      body: rows,
      startY: 20
    });

    doc.save('revenue-collection.pdf');
  }

}
