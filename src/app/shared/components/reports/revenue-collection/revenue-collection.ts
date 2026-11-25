import { CommonModule } from '@angular/common';
import { NotificationService } from '../../notification/notification.service';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { RevenueCollectionService } from './revenue-collection.service';
import { RevenueSummary, CorporationSummary } from './revenue-collection.model';

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
    const msg = err?.error?.message || err?.error?.Message ||
      (err?.status === 403 ? 'This report is not available for your role.' : 'Unable to load the report. Please try again.');
    this.reportNotifier.show(msg, err?.status === 403 ? 'warning' : 'error');
  }

  // Reports are shared by admin / approver / senior-approver / zone-approver:
  // go back to the reports page of the section this one is open in.
  private readonly sectionRouter = inject(Router);
  get reportsLink(): string {
    return '/' + (this.sectionRouter.url.split(/[/?#]/).filter(Boolean)[0] || 'admin') + '/reports';
  }


  summary!: RevenueSummary;

  table: CorporationSummary[] = [];
  filteredTable: CorporationSummary[] = [];

  selectedZone = 'All';

  constructor(private service: RevenueCollectionService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.service.getRevenueCollection().subscribe({
      next: (res) => {
        this.summary = res.summary;
        this.table = res.corporationSummary;
        this.filteredTable = res.corporationSummary;
      },
      error: (err) => {
        this.showReportError(err);
      }
    });
  }

  applyFilter() {

    if (this.selectedZone === 'All') {
      this.filteredTable = this.table;
      return;
    }

    this.filteredTable = this.table.filter(
      x => x.CorporationId.toString() === this.selectedZone
    );
  }

  exportExcel() {

    const worksheet = XLSX.utils.json_to_sheet(this.filteredTable);
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

    const doc = new jsPDF();

    const rows = this.filteredTable.map(x => [
      x.CorporationId,
      x.Demand,
      x.Collected,
      x.Pending,
      x.CollectionPercent + '%'
    ]);

    autoTable(doc, {
      head: [['Zone','Demand','Collected','Pending','Collection %']],
      body: rows
    });

    doc.save('revenue-collection.pdf');
  }

}