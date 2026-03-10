import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ControlSheetService } from './control-sheet.service';
import { ControlSheetTotals, StatusSummary } from './control-sheet.model';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LoaderService } from '../../loader/loader.service';

@Component({
  selector: 'app-control-sheet',
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './control-sheet.html',
  styleUrl: './control-sheet.css',
})
export class ControlSheet implements OnInit {

  totals!: ControlSheetTotals;

  statusSummary: StatusSummary[] = [];
  filteredStatusSummary: StatusSummary[] = [];

  selectedStatus: string = 'All';

  constructor(private controlSheetService: ControlSheetService,
    private loaderservice: LoaderService
  ) {}

  ngOnInit() {
    this.loadControlSheet();
  }

  loadControlSheet() {
    this.loaderservice.show();
    this.controlSheetService.getControlSheet(1).subscribe({
      next: (res) => {
        this.totals = res.totals;
        this.statusSummary = res.statusSummary;
        this.filteredStatusSummary = res.statusSummary;
        this.loaderservice.hide();
      },
      error: (err) => {
        console.error(err);
        this.loaderservice.hide();
      }
    });
  }

  onStatusChange(event: any) {
    const selectedStatus = event.target.value;

    if (selectedStatus === 'All') {
      this.filteredStatusSummary = this.statusSummary;
    } else {
      this.filteredStatusSummary = this.statusSummary.filter(
        x => x.Status === selectedStatus
      );
    }

  }

  exportToExcel() {

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

    const doc = new jsPDF();

    doc.text('Control Sheet Report', 14, 15);

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