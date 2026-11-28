
import { Component, OnInit } from '@angular/core';
import { MLCConstituency, TradeLicensesFee, TradeMajor, TradeMinor, TradeSub, TradeType, Ward, ZoneClassification, Zones } from '../../core/models/new-trade-licenses.model';
import { AssemblyConstituency, MasterDataComplianceService } from './master-data-compliance.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { NotificationService } from '../../shared/components/notification/notification.service';
import { TokenService } from '../../core/services/token.service';

type ModalType =
  | 'MLA'
  | 'WARD'
  | 'TRADE_CATEGORY'
  | 'MAJOR_TRADE'
  | 'MINOR_TRADE'
  | 'SUB_TRADE'
  | 'ZONE'
  | 'ZONE_CLASSIFICATION';

const MODAL_TITLES: Record<ModalType, string> = {
  MLA: 'MLA Constituency (MOH)',
  WARD: 'Ward',
  TRADE_CATEGORY: 'Trade Type',
  MAJOR_TRADE: 'Major Trade',
  MINOR_TRADE: 'Minor Trade',
  SUB_TRADE: 'Sub Trade',
  ZONE: 'Zone',
  ZONE_CLASSIFICATION: 'Zone Classification'
};

/** Trade type isActive comes back as a bool or 'Y'/'N'; the API takes 'Y'/'N'. */
function toYesNo(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'Y' : 'N';
  }
  const text = String(value ?? '').trim().toUpperCase();
  return text === 'N' || text === 'FALSE' || text === '0' ? 'N' : 'Y';
}

@Component({
  selector: 'app-master-data-compliance',
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule],
  templateUrl: './master-data-compliance.html',
  styleUrl: './master-data-compliance.css',
  standalone: true,
})
export class MasterDataCompliance implements OnInit {

  activeModal: ModalType | null = null;
  isEditMode = false;
  isSaving = false;

  // A failed save keeps the form open; tell the user why (the API message when it sends one)
  private showSaveError(err: any): void {
    const msg = err?.error?.message || err?.error?.Message ||
      (typeof err?.error === 'string' && !err.error.trim().startsWith('<') ? err.error : '') ||
      'Unable to save. Please try again.';
    this.notificationService.show(msg, 'error');
  }

  constructor(
    private masterDataComplianceService: MasterDataComplianceService,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private tokenService: TokenService
  ){}

  ngOnInit() {
    this.initForms();
    this.loadTradeTypes();
    this.loadMLAConstituencies();
    this.loadTradeMajors();
    this.loadZones();
    this.loadZoneClassification();
  }

  initForms() {
    this.mlaForm = this.fb.group({
      mohName: ['', Validators.required],
      zoneID: [null, Validators.required],
      constituencyID: [null, Validators.required]
    });
    // Zone picked in the MLA (MOH) modal -> load that zone's constituencies
    this.mlaForm.get('zoneID')!.valueChanges.subscribe(() => this.onModalZoneChange());

    this.wardForm = this.fb.group({
      wardID: [null],
      wardCode: ['', Validators.required],
      wardName: ['', Validators.required],
      mlaId: [null, Validators.required]
    });

    this.tradeCategoryForm = this.fb.group({
      tradeTypeID: [null],
      tradeTypeCode: ['', Validators.required],
      tradeTypeName: ['', Validators.required]
    });

    this.majorTradeForm = this.fb.group({
      tradeMajorID: [null],
      tradeMajorCode: [''],
      tradeMajorName: ['', Validators.required],
      tradeMajorNativeName: ['', Validators.required]
    });

    this.minorTradeForm = this.fb.group({
      tradeMinorID: [null],
      tradeMinorCode: [''],
      tradeMinorName: ['', Validators.required],
      tradeMinorNativeName: [''],
      tradeMajorID: [null, Validators.required]
    });

    this.subTradeForm = this.fb.group({
      tradeSubID: [null],
      tradeSubCode: [''],
      tradeSubName: ['', Validators.required],
      tradeSubNativeName: [''],
      blockPeriodID: [1, [Validators.required, Validators.min(1)]],
      tradeMinorID: [null, Validators.required]
    });

    this.zoneForm = this.fb.group({
      zoneID: [null],
      zoneName: ['', Validators.required]
    });

    this.zoneClassificationForm = this.fb.group({
      zonalClassificationID: [null],
      zonalClassificationName: ['', Validators.required]
    });
  }


  //Loading data in dropdowns
    tradeMajors : TradeMajor[] = [];
    tradeMinors : TradeMinor[] = [];
    tradeSubs : TradeSub[] = [];
    tradeTypes : TradeType[] = [];
    mlaConstituencies : MLCConstituency[] = [];
    wards : Ward[] = [];
    zones : Zones[] = [];
    zoneClassifications : ZoneClassification[] = [];
    /** Constituencies of the zone chosen in the MLA (MOH) modal. */
    modalConstituencies: AssemblyConstituency[] = [];
    modalConstituenciesLoading = false;

    /** Lists that failed to load: shown next to the dropdown instead of an empty, silent select. */
    loadErrors: Partial<Record<'tradeTypes' | 'mla' | 'wards' | 'majors' | 'minors' | 'subs' | 'zones' | 'zoneClassifications', boolean>> = {};

    selectedtradeTypes: TradeType | null = null;
    selectedMajor: TradeMajor | null = null;
    selectedMinor: TradeMinor | null = null;
    selectedSub: TradeSub | null = null;
    selectedMLAConstituency: MLCConstituency | null = null;
    selectedWard: Ward | null = null;
    selectedZone: Zones | null = null;
    selectedZoneClassification: ZoneClassification | null = null;

    // Forms
    mlaForm!: FormGroup;
    wardForm!: FormGroup;
    tradeCategoryForm!: FormGroup;
    majorTradeForm!: FormGroup;
    minorTradeForm!: FormGroup;
    subTradeForm!: FormGroup;
    zoneForm!: FormGroup;
    zoneClassificationForm!: FormGroup;

  get modalTitle(): string {
    return this.activeModal ? MODAL_TITLES[this.activeModal] : '';
  }

  get activeForm(): FormGroup | null {
    switch (this.activeModal) {
      case 'MLA': return this.mlaForm;
      case 'WARD': return this.wardForm;
      case 'TRADE_CATEGORY': return this.tradeCategoryForm;
      case 'MAJOR_TRADE': return this.majorTradeForm;
      case 'MINOR_TRADE': return this.minorTradeForm;
      case 'SUB_TRADE': return this.subTradeForm;
      case 'ZONE': return this.zoneForm;
      case 'ZONE_CLASSIFICATION': return this.zoneClassificationForm;
      default: return null;
    }
  }

  /** For the template: show "required" once a field was touched (or Save was pressed). */
  isInvalid(form: FormGroup, control: string): boolean {
    const c = form.get(control);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  closeModal(): void {
    if (this.isSaving) {
      return;
    }
    this.activeModal = null;
  }

  openModal(type: ModalType, edit = false) {
    this.isEditMode = edit;

    switch (type) {
      case 'MLA':
        if (edit && !this.selectedMLAConstituency) return;
        this.mlaForm.reset();
        this.modalConstituencies = [];
        if (edit && this.selectedMLAConstituency) {
          this.mlaForm.patchValue({
            mohName: this.selectedMLAConstituency.mohName,
            zoneID: this.selectedMLAConstituency.zoneID ?? null,
            constituencyID: this.selectedMLAConstituency.constituencyID ?? null
          }, { emitEvent: false });
          this.loadModalConstituencies(this.selectedMLAConstituency.zoneID, false);
        }
        break;

      case 'TRADE_CATEGORY':
        if (edit && !this.selectedtradeTypes) return;
        this.tradeCategoryForm.reset();
        if (edit && this.selectedtradeTypes) {
          this.tradeCategoryForm.patchValue(this.selectedtradeTypes);
        }
        break;

      case 'WARD':
        if (!this.selectedMLAConstituency || (edit && !this.selectedWard)) return;
        this.wardForm.reset();
        this.wardForm.patchValue({ mlaId: this.selectedMLAConstituency.constituencyID });
        if (edit && this.selectedWard) {
          this.wardForm.patchValue({
            wardID: this.selectedWard.wardID,
            wardCode: this.selectedWard.wardCode != null ? String(this.selectedWard.wardCode) : '',
            wardName: this.selectedWard.wardName
          });
        }
        break;

      case 'MAJOR_TRADE':
        if (edit && !this.selectedMajor) return;
        this.majorTradeForm.reset();
        if (edit && this.selectedMajor) {
          this.majorTradeForm.patchValue(this.selectedMajor);
        }
        break;

      case 'MINOR_TRADE':
        if (!this.selectedMajor || (edit && !this.selectedMinor)) return;
        this.minorTradeForm.reset();
        this.minorTradeForm.patchValue({ tradeMajorID: this.selectedMajor.tradeMajorID });
        if (edit && this.selectedMinor) {
          this.minorTradeForm.patchValue(this.selectedMinor);
        }
        break;

      case 'SUB_TRADE':
        if (!this.selectedMinor || (edit && !this.selectedSub)) return;
        this.subTradeForm.reset({ blockPeriodID: 1 });
        this.subTradeForm.patchValue({ tradeMinorID: this.selectedMinor.tradeMinorID });
        if (edit && this.selectedSub) {
          this.subTradeForm.patchValue(this.selectedSub);
        }
        break;

      case 'ZONE':
        if (edit && !this.selectedZone) return;
        this.zoneForm.reset();
        if (edit && this.selectedZone) {
          this.zoneForm.patchValue(this.selectedZone);
        }
        break;

      case 'ZONE_CLASSIFICATION':
        if (edit && !this.selectedZoneClassification) return;
        this.zoneClassificationForm.reset();
        if (edit && this.selectedZoneClassification) {
          this.zoneClassificationForm.patchValue(this.selectedZoneClassification);
        }
        break;
    }

    this.activeModal = type;
  }

  /** MLA (MOH) modal: zone changed -> load that zone's assembly constituencies. */
  onModalZoneChange(): void {
    this.mlaForm.patchValue({ constituencyID: null }, { emitEvent: false });
    this.loadModalConstituencies(Number(this.mlaForm.get('zoneID')!.value) || null, true);
  }

  private loadModalConstituencies(zoneId: number | null | undefined, clearSelection: boolean): void {
    this.modalConstituencies = [];
    if (!zoneId) {
      return;
    }
    this.modalConstituenciesLoading = true;
    this.masterDataComplianceService.getAssemblyConstituenciesByZone(zoneId).subscribe({
      next: (res) => {
        this.modalConstituencies = res ?? [];
        this.modalConstituenciesLoading = false;
        if (clearSelection) {
          this.mlaForm.patchValue({ constituencyID: null }, { emitEvent: false });
        }
      },
      error: () => {
        this.modalConstituencies = [];
        this.modalConstituenciesLoading = false;
        this.notificationService.show('Unable to load constituencies for the selected zone', 'error');
      }
    });
  }

  //load Trade Types
  loadTradeTypes(){
    this.masterDataComplianceService.getTradeTypes().subscribe({
      next: (res) => {
        this.tradeTypes = res ?? [];
        this.loadErrors.tradeTypes = false;
        this.selectedtradeTypes = this.tradeTypes.find((t) => t.tradeTypeID === this.selectedtradeTypes?.tradeTypeID) ?? null;
      },
      error: () => {
        this.loadErrors.tradeTypes = true;
      }
    });
  }

  //Load MLA Constituencies
  loadMLAConstituencies(){
    this.masterDataComplianceService.getMLAConstituency().subscribe({
      next: (res) => {
        this.mlaConstituencies = res ?? [];
        this.loadErrors.mla = false;
        this.selectedMLAConstituency = this.mlaConstituencies.find((m) => m.mohID === this.selectedMLAConstituency?.mohID) ?? null;
      },
      error: () => {
        this.loadErrors.mla = true;
      }
    });
  }

  //When MLA Constituency changes
  onMLAConstituencyChange(){
    this.selectedWard = null;
    this.wards = [];
    this.reloadWards();
  }

  /** Reloads the selected MOH's wards, keeping the selected ward (by id) when it still exists. */
  private reloadWards(): void {
    if (!this.selectedMLAConstituency) return;
    this.masterDataComplianceService.getWardsByMLAConstituency(this.selectedMLAConstituency.constituencyID).subscribe({
      next: (res) => {
        this.wards = res ?? [];
        this.loadErrors.wards = false;
        this.selectedWard = this.wards.find((w) => w.wardID === this.selectedWard?.wardID) ?? null;
      },
      error: () => {
        this.loadErrors.wards = true;
      }
    });
  }

  loadTradeMajors() {
    this.masterDataComplianceService.getTradeMajors().subscribe({
      next: (res) => {
        this.tradeMajors = res ?? [];
        this.loadErrors.majors = false;
        this.selectedMajor = this.tradeMajors.find((m) => m.tradeMajorID === this.selectedMajor?.tradeMajorID) ?? null;
      },
      error: () => {
        this.loadErrors.majors = true;
      }
    });
  }

  //When major changes
  onMajorChange() {
    this.selectedMinor = null;
    this.selectedSub = null;
    this.tradeMinors = [];
    this.tradeSubs = [];
    this.tradePrice = null;
    this.currentTradeFee = null;
    this.reloadMinors();
  }

  private reloadMinors(): void {
    if (!this.selectedMajor) return;

    this.masterDataComplianceService
      .getTradeMinorsByMajor(this.selectedMajor.tradeMajorID)
      .subscribe({
        next: (res) => {
          this.tradeMinors = res ?? [];
          this.loadErrors.minors = false;
          this.selectedMinor = this.tradeMinors.find((m) => m.tradeMinorID === this.selectedMinor?.tradeMinorID) ?? null;
        },
        error: () => {
          this.loadErrors.minors = true;
        }
      });
  }

  //When minor changes
  onMinorChange() {
    this.selectedSub = null;
    this.tradeSubs = [];
    this.tradePrice = null;
    this.currentTradeFee = null;
    this.reloadSubs();
  }

  private reloadSubs(): void {
    if (!this.selectedMinor) return;

    this.masterDataComplianceService
      .getTradeSubsByMinor(this.selectedMinor.tradeMinorID)
      .subscribe({
        next: (res) => {
          this.tradeSubs = res ?? [];
          this.loadErrors.subs = false;
          this.selectedSub = this.tradeSubs.find((s) => s.tradeSubID === this.selectedSub?.tradeSubID) ?? null;
        },
        error: () => {
          this.loadErrors.subs = true;
        }
      });
  }

  isLoadingTradeFee = false;

  onSubTradeChange() {
    this.tradePrice = null;
    this.currentTradeFee = null;

    if (!this.selectedSub?.tradeSubID) {
      return;
    }

    this.isLoadingTradeFee = true;
    this.masterDataComplianceService
      .getTradeLicenceFeeBySubTrade(this.selectedSub.tradeSubID)
      .subscribe({
        next: (res) => {
          this.isLoadingTradeFee = false;
          if (res && Number(res.tradeFeeID) > 0) {
            this.currentTradeFee = res;
            this.tradePrice = Number(res.tradeLicenceFee ?? 0) || null;
          } else {
            this.currentTradeFee = null;
            this.tradePrice = null;
          }
        },
        error: (err) => {
          // 404 = no fee configured yet for this sub trade (a new one will be created on save)
          this.isLoadingTradeFee = false;
          this.currentTradeFee = null;
          this.tradePrice = null;
          if (err?.status !== 404) {
            this.notificationService.show('Unable to load the current fee for this sub trade', 'error');
          }
        }
      });
  }

  //to load zones
  loadZones(){
    this.masterDataComplianceService.getZones().subscribe({
      next: (res) => {
        this.zones = res ?? [];
        this.loadErrors.zones = false;
        this.selectedZone = this.zones.find((z) => z.zoneID === this.selectedZone?.zoneID) ?? null;
      },
      error: () => {
        this.loadErrors.zones = true;
      }
    });
  }

  //to load zonesclassification
  loadZoneClassification(){
    this.masterDataComplianceService.getZoneClassification().subscribe({
      next: (res) => {
        this.zoneClassifications = res ?? [];
        this.loadErrors.zoneClassifications = false;
        this.selectedZoneClassification = this.zoneClassifications.find(
          (z) => z.zonalClassificationID === this.selectedZoneClassification?.zonalClassificationID
        ) ?? null;
      },
      error: () => {
        this.loadErrors.zoneClassifications = true;
      }
    });
  }

  /**
   * Sends one create/update. The modal stays open until the API answers: closed + list refreshed
   * + success toast on success, left open with the API's message on failure.
   */
  private submit(request$: Observable<unknown>, successMessage: string, reload: () => void): void {
    this.isSaving = true;
    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.activeModal = null;
        this.notificationService.show(successMessage, 'success');
        reload();
      },
      error: (err) => {
        this.isSaving = false;
        this.showSaveError(err);
      }
    });
  }

  saveModal() {
    const form = this.activeForm;
    if (!form || this.isSaving) {
      return;
    }
    if (form.invalid) {
      form.markAllAsTouched();
      this.notificationService.show('Please fill in all required fields', 'warning');
      return;
    }
    const edit = this.isEditMode;
    const done = (what: string) => `${what} ${edit ? 'updated' : 'created'} successfully`;

    switch (this.activeModal) {
      case 'MLA': {
        const v = this.mlaForm.value;
        const name = String(v.mohName).trim();
        const zoneID = Number(v.zoneID);
        const constituencyID = Number(v.constituencyID);
        const existing = edit ? this.selectedMLAConstituency : null;
        if (edit && !existing) return;
        // Edit keeps every other field of the record (codes, officer ids) as the API returned it
        const payload = existing
          ? { ...existing, mohName: name, zoneID, constituencyID }
          : {
              mohID: 0,
              mohCode: null,
              mohCodeOld: null,
              mohName: name,
              mohNativeName: name,
              mohShortName: name.substring(0, 3),
              zoneID,
              constituencyID,
              hoId: null,
              jcId: null,
              dhoId: null,
              adId: null,
              ddId: null,
              jdId: null
            };
        this.submit(
          existing
            ? this.masterDataComplianceService.updateMLA(existing.mohID, payload)
            : this.masterDataComplianceService.createMLA(payload),
          done('MLA constituency'),
          () => this.loadMLAConstituencies()
        );
        break;
      }

      case 'WARD': {
        const v = this.wardForm.value;
        const existing = edit ? this.selectedWard : null;
        if (edit && !existing) return;
        const name = String(v.wardName).trim();
        const payload = existing
          ? {
              ...existing,
              wardCode: String(v.wardCode).trim(),
              wardName: name,
              wardNativeName: existing.wardNativeName || name,
              constituencyID: v.mlaId
            }
          : {
              wardID: 0,
              wardCode: String(v.wardCode).trim(),
              wardName: name,
              wardNativeName: name,
              // The ward belongs to the selected MOH's zone and constituency
              zoneID: this.selectedMLAConstituency?.zoneID,
              constituencyID: v.mlaId
            };
        this.submit(
          existing
            ? this.masterDataComplianceService.updateWard(payload)
            : this.masterDataComplianceService.createWard(payload),
          done('Ward'),
          () => this.reloadWards()
        );
        break;
      }

      case 'MAJOR_TRADE': {
        const v = this.majorTradeForm.value;
        const payload = {
          tradeMajorID: edit ? v.tradeMajorID : 0,
          tradeMajorCode: edit ? String(v.tradeMajorCode ?? '') : '',
          tradeMajorName: String(v.tradeMajorName).trim(),
          tradeMajorNativeName: String(v.tradeMajorNativeName).trim()
        };
        if (edit && !v.tradeMajorID) return;
        this.submit(
          edit
            ? this.masterDataComplianceService.updateMajorTrade(v.tradeMajorID, payload)
            : this.masterDataComplianceService.createMajorTrade(payload),
          done('Major trade'),
          () => this.loadTradeMajors()
        );
        break;
      }

      case 'MINOR_TRADE': {
        const v = this.minorTradeForm.value;
        if (edit && !v.tradeMinorID) return;
        const payload = {
          tradeMinorID: edit ? v.tradeMinorID : 0,
          tradeMajorID: v.tradeMajorID,
          tradeMinorCode: edit && v.tradeMinorCode != null ? String(v.tradeMinorCode) : null,
          tradeMinorName: String(v.tradeMinorName).trim(),
          tradeMinorNativeName: v.tradeMinorNativeName ?? ''
        };
        this.submit(
          edit
            ? this.masterDataComplianceService.updateMinorTrade(v.tradeMinorID, payload)
            : this.masterDataComplianceService.createMinorTrade(payload),
          done('Minor trade'),
          () => this.reloadMinors()
        );
        break;
      }

      case 'SUB_TRADE': {
        const v = this.subTradeForm.value;
        if (edit && !v.tradeSubID) return;
        const payload = {
          tradeSubID: edit ? v.tradeSubID : 0,
          tradeMinorID: v.tradeMinorID,
          tradeSubCode: edit && v.tradeSubCode != null ? String(v.tradeSubCode) : null,
          tradeSubName: String(v.tradeSubName).trim(),
          tradeSubNativeName: v.tradeSubNativeName ?? '',
          blockPeriodID: Number(v.blockPeriodID)
        };
        this.submit(
          edit
            ? this.masterDataComplianceService.updateSubTrade(v.tradeSubID, payload)
            : this.masterDataComplianceService.createSubTrade(payload),
          done('Sub trade'),
          () => this.reloadSubs()
        );
        break;
      }

      case 'ZONE': {
        const v = this.zoneForm.value;
        const existing = edit ? this.selectedZone : null;
        if (edit && !existing) return;
        // Update keeps the zone's codes / native name (the API writes every field it receives)
        const payload = existing
          ? { ...existing, zoneName: String(v.zoneName).trim() }
          : { zoneID: 0, zoneName: String(v.zoneName).trim() };
        this.submit(
          existing
            ? this.masterDataComplianceService.updateZone(existing.zoneID, payload)
            : this.masterDataComplianceService.createZone(payload),
          done('Zone'),
          () => this.loadZones()
        );
        break;
      }

      case 'ZONE_CLASSIFICATION': {
        const v = this.zoneClassificationForm.value;
        const existing = edit ? this.selectedZoneClassification : null;
        if (edit && !existing) return;
        const payload = existing
          ? { ...existing, zonalClassificationName: String(v.zonalClassificationName).trim() }
          : {
              zonalClassificationID: 0,
              zonalClassificationName: String(v.zonalClassificationName).trim(),
              isActive: true // bool on the API
            };
        this.submit(
          existing
            ? this.masterDataComplianceService.updateZoneClassification(existing.zonalClassificationID, payload)
            : this.masterDataComplianceService.createZoneClassification(payload),
          done('Zone classification'),
          () => this.loadZoneClassification()
        );
        break;
      }

      case 'TRADE_CATEGORY': {
        const v = this.tradeCategoryForm.value;
        const existing = edit ? this.selectedtradeTypes : null;
        if (edit && !existing) return;
        const payload = {
          tradeTypeID: existing?.tradeTypeID ?? 0,
          tradeTypeCode: String(v.tradeTypeCode).trim(),
          tradeTypeName: String(v.tradeTypeName).trim(),
          // Edit keeps the record's active flag; new types are active
          isActive: existing ? toYesNo(existing.isActive) : 'Y'
        };
        this.submit(
          existing
            ? this.masterDataComplianceService.updateTradeType(existing.tradeTypeID, payload)
            : this.masterDataComplianceService.createTradeType(payload),
          done('Trade type'),
          () => this.loadTradeTypes()
        );
        break;
      }
    }
  }


  //To Save Trade Classification Details
  tradePrice: number | null = null;
  currentTradeFee: TradeLicensesFee | null = null;
  isSavingTradePrice = false;
  saveTradePrice(){
    if (this.isSavingTradePrice) {
      return;
    }
    if (!this.selectedMajor) {
      this.notificationService.show('Please select Major Trade', 'warning');
      return;
    }

    if (!this.selectedMinor) {
      this.notificationService.show('Please select Minor Trade', 'warning');
      return;
    }

    if (!this.selectedSub) {
      this.notificationService.show('Please select Sub Trade', 'warning');
      return;
    }

    const tradeLicenceFee = Number(this.tradePrice);
    if (!Number.isFinite(tradeLicenceFee) || tradeLicenceFee <= 0) {
      this.notificationService.show('Please enter a valid price', 'warning');
      return;
    }

    const approveAuth = String(
      this.tokenService.getEffectiveUserId() ??
      this.tokenService.getUserId() ??
      this.tokenService.getTraderUserId() ??
      ''
    ).trim();

    if (!approveAuth) {
      this.notificationService.show('Unable to resolve approval authority', 'warning');
      return;
    }

    const payload: TradeLicensesFee = {
      tradeFeeID: this.currentTradeFee?.tradeFeeID ?? 0,
      tradeSubID: this.selectedSub.tradeSubID,
      tradeLicenceFee,
      tradeApproveAuth: approveAuth,
      isActive: this.currentTradeFee?.isActive ?? true,
      blockPeriodID: Number(this.selectedSub.blockPeriodID ?? 1),
      remarks: this.currentTradeFee?.remarks ?? null
    };

    this.isSavingTradePrice = true;
    const isUpdate = payload.tradeFeeID > 0;
    const request$: Observable<any> = isUpdate
      ? this.masterDataComplianceService.updateTradeLicenceFee(payload.tradeFeeID, payload)
      : this.masterDataComplianceService.createTradeLicenceFee(payload);

    request$.subscribe({
      next: (res) => {
        this.isSavingTradePrice = false;
        // A create answers { tradeFeeID }: keep it so the next save updates this fee instead of
        // inserting a second one for the same sub trade
        const newId = Number(res?.tradeFeeID ?? res?.TradeFeeID ?? 0);
        this.currentTradeFee = { ...payload, tradeFeeID: isUpdate ? payload.tradeFeeID : newId };
        this.notificationService.show(
          isUpdate ? 'Trade licence fee updated successfully' : 'Trade licence fee saved successfully',
          'success'
        );
        if (!isUpdate && !newId) {
          // Id not returned: re-read so a second save cannot create a duplicate
          this.onSubTradeChange();
        }
      },
      error: (err) => {
        this.isSavingTradePrice = false;
        this.showSaveError(err);
      }
    });
  }
}
