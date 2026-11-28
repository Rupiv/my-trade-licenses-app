import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MasterOfficeDesignationService,
  Designation,
  OfficeType,
  OfficeDetail,
} from './master-office-designation.service';
import { NotificationService } from '../../shared/components/notification/notification.service';

type ActiveTab = 'designation' | 'officeType' | 'officeDetail';

@Component({
  selector: 'app-master-office-designation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-office-designation.html',
  styleUrl: './master-office-designation.css',
})
export class MasterOfficeDesignation {
  activeTab: ActiveTab = 'designation';

  // ─── Designation ───
  designations: Designation[] = [];
  desigLoading = false;
  desigModalOpen = false;
  desigEditMode = false;
  desigForm = { id: 0, name: '', isActive: true };

  // ─── Office Type ───
  officeTypes: OfficeType[] = [];
  otLoading = false;
  otModalOpen = false;
  otEditMode = false;
  otForm = { id: 0, name: '', isActive: true };

  // ─── Office Detail ───
  officeDetails: OfficeDetail[] = [];
  odLoading = false;
  odModalOpen = false;
  odEditMode = false;
  odForm: Partial<OfficeDetail> & { isNew: boolean } = this.emptyOdForm();

  constructor(
    private svc: MasterOfficeDesignationService,
    private notify: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDesignations();
    this.loadOfficeTypes();
    this.loadOfficeDetails();
  }

  switchTab(tab: ActiveTab): void {
    this.activeTab = tab;
  }

  // ════════════════════════════════════════════════
  //  DESIGNATIONS
  // ════════════════════════════════════════════════
  loadDesignations(): void {
    this.desigLoading = true;
    this.svc.getDesignations().subscribe({
      next: (data) => {
        this.designations = data ?? [];
        this.desigLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.desigLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openDesigModal(edit: Designation | null = null): void {
    this.desigEditMode = !!edit;
    this.desigForm = edit
      ? { id: edit.userDesignationID, name: edit.userDesignationName, isActive: edit.isActive === 'Y' }
      : { id: 0, name: '', isActive: true };
    this.desigModalOpen = true;
  }

  saveDesignation(): void {
    if (!this.desigForm.name.trim()) {
      this.notify.show('Please enter designation name', 'warning');
      return;
    }
    const obs$ = this.desigEditMode
      ? this.svc.updateDesignation(this.desigForm.id, this.desigForm.name, this.desigForm.isActive)
      : this.svc.createDesignation(this.desigForm.name);

    obs$.subscribe({
      next: () => {
        this.notify.show(this.desigEditMode ? 'Designation updated' : 'Designation created', 'success');
        this.desigModalOpen = false;
        this.loadDesignations();
      },
      error: (err) => this.showError(err),
    });
  }

  deleteDesignation(d: Designation): void {
    if (!confirm(`Deactivate "${d.userDesignationName}"?`)) return;
    this.svc.deleteDesignation(d.userDesignationID).subscribe({
      next: () => {
        this.notify.show('Designation deactivated', 'success');
        this.loadDesignations();
      },
      error: (err) => this.showError(err),
    });
  }

  // ════════════════════════════════════════════════
  //  OFFICE TYPES
  // ════════════════════════════════════════════════
  loadOfficeTypes(): void {
    this.otLoading = true;
    this.svc.getOfficeTypes().subscribe({
      next: (res: any) => {
        this.officeTypes = res?.Data ?? res?.data ?? res ?? [];
        this.otLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.otLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openOtModal(edit: OfficeType | null = null): void {
    this.otEditMode = !!edit;
    this.otForm = edit
      ? { id: edit.officeTypeID, name: edit.officeTypeName, isActive: edit.isActive === 'Y' }
      : { id: 0, name: '', isActive: true };
    this.otModalOpen = true;
  }

  saveOfficeType(): void {
    if (!this.otForm.name.trim()) {
      this.notify.show('Please enter office type name', 'warning');
      return;
    }
    const obs$ = this.otEditMode
      ? this.svc.updateOfficeType(this.otForm.id, this.otForm.name, this.otForm.isActive)
      : this.svc.createOfficeType(this.otForm.name);

    obs$.subscribe({
      next: () => {
        this.notify.show(this.otEditMode ? 'Office type updated' : 'Office type created', 'success');
        this.otModalOpen = false;
        this.loadOfficeTypes();
      },
      error: (err) => this.showError(err),
    });
  }

  deleteOfficeType(t: OfficeType): void {
    if (!confirm(`Delete "${t.officeTypeName}"?`)) return;
    this.svc.deleteOfficeType(t.officeTypeID).subscribe({
      next: () => {
        this.notify.show('Office type deleted', 'success');
        this.loadOfficeTypes();
      },
      error: (err) => this.showError(err),
    });
  }

  // ════════════════════════════════════════════════
  //  OFFICE DETAILS
  // ════════════════════════════════════════════════
  loadOfficeDetails(): void {
    this.odLoading = true;
    this.svc.getOfficeDetails().subscribe({
      next: (data) => {
        this.officeDetails = data ?? [];
        this.odLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.odLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private emptyOdForm(): Partial<OfficeDetail> & { isNew: boolean } {
    return {
      isNew: true,
      officeDetailsID: 0,
      officeName: '',
      officeID: 0,
      officeTypeID: 0,
      branchAddress: '',
      contactPerson: '',
      emailID: '',
      contactNO: '',
    };
  }

  openOdModal(edit: OfficeDetail | null = null): void {
    this.odEditMode = !!edit;
    this.odForm = edit
      ? { ...edit, isNew: false }
      : this.emptyOdForm();
    this.odModalOpen = true;
  }

  saveOfficeDetail(): void {
    if (!this.odForm.officeName?.trim()) {
      this.notify.show('Please enter office name', 'warning');
      return;
    }
    if (!this.odForm.officeTypeID) {
      this.notify.show('Please select office type', 'warning');
      return;
    }

    const payload = {
      officeName: this.odForm.officeName,
      officeID: this.odForm.officeID ?? 0,
      officeTypeID: this.odForm.officeTypeID,
      branchAddress: this.odForm.branchAddress || null,
      contactPerson: this.odForm.contactPerson || null,
      emailID: this.odForm.emailID || null,
      contactNO: this.odForm.contactNO || null,
    };

    const obs$ = this.odEditMode
      ? this.svc.updateOfficeDetail(this.odForm.officeDetailsID!, payload)
      : this.svc.createOfficeDetail(payload);

    obs$.subscribe({
      next: () => {
        this.notify.show(this.odEditMode ? 'Office updated' : 'Office created', 'success');
        this.odModalOpen = false;
        this.loadOfficeDetails();
      },
      error: (err) => this.showError(err),
    });
  }

  deleteOfficeDetail(o: OfficeDetail): void {
    if (!confirm(`Delete "${o.officeName}"?`)) return;
    this.svc.deleteOfficeDetail(o.officeDetailsID).subscribe({
      next: () => {
        this.notify.show('Office deleted', 'success');
        this.loadOfficeDetails();
      },
      error: (err) => this.showError(err),
    });
  }

  getOfficeTypeName(typeId: number): string {
    return this.officeTypes.find((t) => t.officeTypeID === typeId)?.officeTypeName ?? '-';
  }

  private showError(err: any): void {
    const msg =
      err?.error?.message || err?.error?.Message || 'Operation failed. Please try again.';
    this.notify.show(msg, 'error');
  }
}
