import { CommonModule } from '@angular/common';
import { NotificationService } from '../../notification/notification.service';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ControlSheetService } from './control-sheet.service';
import { ControlSheetResponse, ControlSheetTotals, StatusSummary } from './control-sheet.model';
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
  selector: 'app-control-sheet',
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './control-sheet.html',
  styleUrl: './control-sheet.css',
})
export class ControlSheet implements OnInit {
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

  /** Null until the report has loaded (or when the procedure returned no totals row). */
  totals: ControlSheetTotals | null = null;

  statusSummary: StatusSummary[] = [];
  filteredStatusSummary: StatusSummary[] = [];

  financialYears: ReportFinancialYear[] = [];
  selectedFinancialYearId: number | null = null;

  selectedStatus: string = 'All';

  loading = false;
  loaded = false;

  constructor(private controlSheetService: ControlSheetService,
    private loaderservice: LoaderService
  ) {}

  ngOnInit() {
    this.masters.getFinancialYears().subscribe({
      next: (years) => {
        this.financialYears = years;
        this.selectedFinancialYearId = defaultFinancialYearId(years);
        this.loadControlSheet();
      },
      error: () => {
        this.reportNotifier.show('Unable to load financial years.', 'error');
        this.loadControlSheet();
      }
    });
  }

  /** Status values present in the report (the filter only narrows the loaded rows). */
  get statusOptions(): string[] {
    return [...new Set(this.statusSummary.map(s => s.Status).filter(Boolean))];
  }

  get selectedFinancialYearLabel(): string {
    return this.financialYears.find(fy => fy.id === this.selectedFinancialYearId)?.label ?? '';
  }

  onFinancialYearChange() {
    this.loadControlSheet();
  }

  loadControlSheet() {
    this.loading = true;
    this.loaderservice.show();
    this.controlSheetService.getControlSheet(this.selectedFinancialYearId).subscribe({
      next: (res) => {
        this.applyResponse(res);
        this.loading = false;
        this.loaded = true;
        this.loaderservice.hide();
      },
      error: (err) => {
        this.totals = null;
        this.statusSummary = [];
        this.filteredStatusSummary = [];
        this.loading = false;
        this.loaded = true;
        this.loaderservice.hide();
        this.showReportError(err);
      }
    });
  }

  private applyResponse(res: ControlSheetResponse | null) {
    const t = res?.totals;
    this.totals = t ? {
      Approved: pickNumber(t, ['Approved']),
      Pending: pickNumber(t, ['Pending']),
      Rejected: pickNumber(t, ['Rejected']),
      TotalApplications: pickNumber(t, ['TotalApplications'])
    } : null;

    this.statusSummary = (res?.statusSummary ?? []).map(r => ({
      Status: pickString(r, ['Status']),
      ApplicationCount: pickNumber(r, ['ApplicationCount']),
      Percentage: pickNumber(r, ['Percentage'])
    }));

    if (this.selectedStatus !== 'All' && !this.statusOptions.includes(this.selectedStatus)) {
      this.selectedStatus = 'All';
    }
    this.applyStatusFilter();
  }

  onStatusChange() {
    this.applyStatusFilter();
  }

  private applyStatusFilter() {
    this.filteredStatusSummary = this.selectedStatus === 'All'
      ? this.statusSummary
      : this.statusSummary.filter(x => x.Status === this.selectedStatus);
  }

  private get exportTitle(): string {
    const fy = this.selectedFinancialYearLabel;
    return 'Control Sheet Report' + (fy ? ` (FY ${fy})` : '');
  }

  private ensureRows(): boolean {
    if (!this.filteredStatusSummary.length) {
      this.reportNotifier.show('There are no records to export.', 'warning');
      return false;
    }
    return true;
  }

  exportToExcel() {
    if (!this.ensureRows()) return;

    const data = this.filteredStatusSummary.map(item => ({
      Status: item.Status,
      Applications: item.ApplicationCount,
      Percentage: item.Percentage + '%'
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    const workbook: XLSX.WorkBook = {
      Sheets: { 'ControlSheet': worksheet },
      SheetNames: ['ControlSheet']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const dataFile = new Blob([excelBuffer], {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    FileSaver.saveAs(dataFile, 'Control_Sheet_Report.xlsx');
  }

  exportToPDF() {
    if (!this.ensureRows()) return;

    const doc = new jsPDF();

    doc.text(this.exportTitle, 14, 15);

    const tableData = this.filteredStatusSummary.map(item => [
      item.Status,
      item.ApplicationCount,
      item.Percentage + '%'
    ]);

    autoTable(doc, {
      head: [['Status', 'Applications', 'Percentage']],
      body: tableData,
      startY: 20
    });

    doc.save('Control_Sheet_Report.pdf');
  }

}
