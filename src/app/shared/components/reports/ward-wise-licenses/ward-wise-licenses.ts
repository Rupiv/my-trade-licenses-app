import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { WardWiseLicensesService } from './ward-wise-licenses.service';
import { WardLicenseTable, WardLicenseSummary } from './ward-wise-licenses.model';

import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LoaderService } from '../../loader/loader.service';

@Component({
  selector: 'app-ward-wise-licenses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ward-wise-licenses.html',
  styleUrl: './ward-wise-licenses.css',
})
export class WardWiseLicenses implements OnInit {

  summary!: WardLicenseSummary;

  table: WardLicenseTable[] = [];
  filteredTable: WardLicenseTable[] = [];

  selectedZone = 'All';
  selectedWard = 'All';
  selectedStatus = 'All';

  constructor(private service: WardWiseLicensesService,
    private loaderservice: LoaderService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  get zones() {
    return [...new Set(this.table.map(x => x.Zone))];
  }

  get wards() {
    return [...new Set(this.table.map(x => x.Ward))];
  }

  loadData() {
    this.loaderservice.show();
    this.service.getWardWiseLicenses(10).subscribe({
      next: (res) => {
        this.summary = res.summary;
        this.table = res.table;
        this.filteredTable = res.table;
        this.loaderservice.hide();
      },
      error: (err) => {
        console.error(err);
        this.loaderservice.hide();
      }
    });
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

  exportToExcel() {

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

    const doc = new jsPDF();

    const rows = this.filteredTable.map(x => [
      x.Zone,
      x.Ward,
      x.Active,
      x.Expired,
      x.Suspended,
      x.Total
    ]);

    autoTable(doc, {
      head: [['Zone','Ward','Active','Expired','Suspended','Total']],
      body: rows
    });

    doc.save('ward-wise-licenses.pdf');
  }
}