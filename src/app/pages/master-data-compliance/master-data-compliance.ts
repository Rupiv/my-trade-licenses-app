import { Component, OnInit  } from '@angular/core';
import { MLCConstituency, TradeMajor, TradeMinor, TradeSub, TradeType, Ward, ZoneClassification, Zones } from '../../core/models/new-trade-licenses.model';
import { MasterDataComplianceService } from './master-data-compliance.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

type ModalType =
  | 'MLA'
  | 'WARD'
  | 'TRADE_CATEGORY'
  | 'MAJOR_TRADE'
  | 'MINOR_TRADE'
  | 'SUB_TRADE'
  | 'ZONE'
  | 'ZONE_CLASSIFICATION';


@Component({
  selector: 'app-master-data-compliance',
  imports: [CommonModule, FormsModule, RouterModule, ReactiveFormsModule],
  templateUrl: './master-data-compliance.html',
  styleUrl: './master-data-compliance.css',
  standalone: true,
})
export class MasterDataCompliance {

  activeModal: ModalType | null = null;
  constructor(
    private masterDataComplianceService: MasterDataComplianceService,
    private fb: FormBuilder
  ){}

  ngOnInit() {
    this.loadTradeTypes();
    this.loadMLAConstituencies();
    this.loadTradeMajors();
    this.loadZones();
    this.loadZoneClassification();
    this.initForms();
  }

  initForms() {
    this.mlaForm = this.fb.group({
      constituencyID: [null],
      mohName: ['', Validators.required]
    });

    this.wardForm = this.fb.group({
      wardID: [null],
      wardName: ['', Validators.required],
      mlaId: [null, Validators.required]
    });

    this.tradeCategoryForm = this.fb.group({
      tradeTypeID: [null],
      tradeTypeName: ['', Validators.required]
    });

    this.majorTradeForm = this.fb.group({
      tradeMajorID: [null],
      tradeMajorName: ['', Validators.required]
    });

    this.minorTradeForm = this.fb.group({
      tradeMinorID: [null],
      tradeMinorName: ['', Validators.required],
      tradeMajorID: [null, Validators.required]
    });

    this.subTradeForm = this.fb.group({
      tradeSubID: [null],
      tradeSubName: ['', Validators.required],
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

    selectedtradeTypes: TradeType | null = null;
    selectedMajor: TradeMajor | null = null;
    selectedMinor: TradeMinor | null = null;
    selectedSub: TradeSub | null = null;
    selectedMLAConstituency: MLCConstituency | null = null;
    selectedWard: Ward | null = null;
    selectedZone: Zones | null = null;
    selectedZoneClassification: ZoneClassification | null = null;
    
    // Modal flags
    // showMLAModal = false;
    // showWardModal = false;
    // showTradeCategoryModal = false;
    // showMajorTradeModal = false;
    // showMinorTradeModal = false;
    // showSubTradeModal = false;
    // showZoneModal = false;
    // showZoneClassificationModal = false;
    isEditMode = false;

    // Edit flags
    // isEditMLA = false;
    // isEditWard = false;
    // isEditTradeCategory = false;
    // isEditMajorTrade = false;
    // isEditMinorTrade = false;
    // isEditSubTrade = false;
    // isEditZone = false;
    // isEditZoneClassification = false;

    // Forms
    mlaForm!: FormGroup;
    wardForm!: FormGroup;
    tradeCategoryForm!: FormGroup;
    majorTradeForm!: FormGroup;
    minorTradeForm!: FormGroup;
    subTradeForm!: FormGroup;
    zoneForm!: FormGroup;
    zoneClassificationForm!: FormGroup;

  // Modal flags
  openModal(type: ModalType, edit = false) {
    this.activeModal = type;
    this.isEditMode = edit;

    switch (type) {
      case 'MLA':
        this.mlaForm.reset();
        if (edit && this.selectedMLAConstituency) {
          this.mlaForm.patchValue(this.selectedMLAConstituency);
        }
        break;

      case 'TRADE_CATEGORY':
        this.tradeCategoryForm.reset();
        if (edit && this.selectedtradeTypes) {
          this.tradeCategoryForm.patchValue(this.selectedtradeTypes);
        }
        break;

      case 'WARD':
        this.wardForm.reset();
        if (this.selectedMLAConstituency) {
          this.wardForm.patchValue({
            mlaId: this.selectedMLAConstituency.constituencyID
          });
        }
        if (edit && this.selectedWard) {
          this.wardForm.patchValue(this.selectedWard);
        }
        break;

      case 'MAJOR_TRADE':
        this.majorTradeForm.reset();
        if (edit && this.selectedMajor) {
          this.majorTradeForm.patchValue(this.selectedMajor);
        }
        break;

      case 'MINOR_TRADE':
        this.minorTradeForm.reset();
        if (this.selectedMajor) {
          this.minorTradeForm.patchValue({
            tradeMajorID: this.selectedMajor.tradeMajorID
          });
        }
        if (edit && this.selectedMinor) {
          this.minorTradeForm.patchValue(this.selectedMinor);
        }
        break;

      case 'SUB_TRADE':
        this.subTradeForm.reset();
        if (this.selectedMinor) {
          this.subTradeForm.patchValue({
            tradeMinorID: this.selectedMinor.tradeMinorID
          });
        }
        if (edit && this.selectedSub) {
          this.subTradeForm.patchValue(this.selectedSub);
        }
        break;

      case 'ZONE':
        this.zoneForm.reset();
        if (edit && this.selectedZone) {
          this.zoneForm.patchValue(this.selectedZone);
        }
        break;

      case 'ZONE_CLASSIFICATION':
        this.zoneClassificationForm.reset();
        if (edit && this.selectedZoneClassification) {
          this.zoneClassificationForm.patchValue(this.selectedZoneClassification);
        }
        break;
    }
  }

  //load Trade Types
  loadTradeTypes(){
    this.masterDataComplianceService.getTradeTypes().subscribe({
      next: (res) => {
        this.tradeTypes = res;
      console.log('Trade Types:', this.tradeTypes);
      },
      error: (err) => console.error(err)
    });
  }

  //Load MLA Constituencies
  loadMLAConstituencies(){
    this.masterDataComplianceService.getMLAConstituency().subscribe({
      next: (res) => {
        this.mlaConstituencies = res;
      },
      error: (err) => console.error(err)
    });
  }

  //When MLA Constituency changes
  onMLAConstituencyChange(){
    if(!this.selectedMLAConstituency) return;
    this.masterDataComplianceService.getWardsByMLAConstituency(this.selectedMLAConstituency.constituencyID).subscribe({
      next: (res) => {
        this.wards = res;
      },
      error: (err) => console.error(err)
    });
  }

  loadTradeMajors() {
    this.masterDataComplianceService.getTradeMajors().subscribe({
      next: (res) => {
        this.tradeMajors = res;
      },
      error: (err) => console.error(err)
    });
  }

  //When major changes
  onMajorChange() {
    this.selectedMinor = null;
    this.selectedSub = null;
    this.tradeSubs = [];

    if (!this.selectedMajor) return;

    this.masterDataComplianceService
      .getTradeMinorsByMajor(this.selectedMajor.tradeMajorID)
      .subscribe({
        next: (res) => {
          this.tradeMinors = res;
        },
        error: (err) => console.error(err)
      });
  }

  //When minor changes
  onMinorChange() {
    this.selectedSub = null;

    if (!this.selectedMinor) return;

    this.masterDataComplianceService
      .getTradeSubsByMinor(this.selectedMinor.tradeMinorID)
      .subscribe({
        next: (res) => {
          this.tradeSubs = res;
        },
        error: (err) => console.error(err)
      });
  }

  //to load zones
  loadZones(){
    this.masterDataComplianceService.getZones().subscribe({
      next: (res) => {
        this.zones = res;
      },
      error: (err) => console.error(err)
    });
  }

  //to load zonesclassification
  loadZoneClassification(){
    this.masterDataComplianceService.getZoneClassification().subscribe({
      next: (res) => {
        this.zoneClassifications = res;
      },
      error: (err) => console.error(err)
    });
    
  }

  saveModal() {
    switch (this.activeModal) {
      case 'MLA':
        const mlaValue = this.mlaForm.value;
        if (this.isEditMode && mlaValue.constituencyID) {
          const payload = {
            mohID: this.isEditMode ? mlaValue.constituencyID : 0,
            mohCode: "",
            mohCodeOld: "",
            mohName: mlaValue.mohName,
            mohNativeName: mlaValue.mohName,
            mohShortName: mlaValue.mohName?.substring(0, 3),
            zoneID: 1,
            constituencyID: mlaValue.constituencyID ?? 1,
            entryDate: new Date().toISOString(),
            hoId: 1,
            jcId: 1,
            dhoId: 1,
            adId: 1,
            ddId: 1,
            jdId: 1
          };
          this.masterDataComplianceService
            .updateMLA(mlaValue.constituencyID, payload)
            .subscribe({
              next: () => {
                console.log("MLA Updated Successfully");

                this.loadMLAConstituencies();
                this.mlaForm.reset();
                this.activeModal = null;
              },
              error: (err) => console.error(err)
            });

        } else {
          const payload = {
            mohID: 0,
            mohCode: "",
            mohCodeOld: "",
            mohName: mlaValue.mohName,
            mohNativeName: mlaValue.mohName,
            mohShortName: mlaValue.mohName?.substring(0, 3),
            zoneID: 1,
            constituencyID: mlaValue.constituencyID ?? 1,
            entryDate: new Date().toISOString(),
            hoId: 1,
            jcId: 1,
            dhoId: 1,
            adId: 1,
            ddId: 1,
            jdId: 1
          };
          this.masterDataComplianceService
            .createMLA(payload)
            .subscribe({
              next: () => {
                console.log("MLA Created Successfully");

                this.loadMLAConstituencies();
                this.mlaForm.reset();
                this.activeModal = null;
              },
              error: (err) => console.error(err)
            });
        }

      break;

      case 'WARD':
        const wardValue = this.wardForm.value;

        if (this.isEditMode && wardValue.wardID) {

          const payload = {
            wardID: wardValue.wardID,
            wardCode: String(wardValue.wardID),
            wardName: wardValue.wardName,
            wardNativeName: wardValue.wardName,
            zoneID: this.selectedZone?.zoneID ?? 1,
            constituencyID: wardValue.mlaId
          };

          this.masterDataComplianceService
            .updateWard(payload)
            .subscribe(() => {
              this.onMLAConstituencyChange();
              this.wardForm.reset();
              this.activeModal = null;
            });

        } 
        else {

          const payload = {
            wardCode: "",
            wardName: wardValue.wardName,
            wardNativeName: wardValue.wardName,
            zoneID: this.selectedZone?.zoneID ?? 1,
            constituencyID: wardValue.mlaId
          };

          this.masterDataComplianceService
            .createWard(payload)
            .subscribe(() => {
              this.onMLAConstituencyChange();
              this.wardForm.reset();
              this.activeModal = null;
            });

        }

      break;

      case 'MAJOR_TRADE':

        const majorValue = this.majorTradeForm.value;

        if (this.isEditMode && majorValue.tradeMajorID) {

          const payload = {
            tradeMajorID: majorValue.tradeMajorID,
            tradeMajorName: majorValue.tradeMajorName,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .updateMajorTrade(majorValue.tradeMajorID, payload)
            .subscribe(() => {
              this.loadTradeMajors();
              this.majorTradeForm.reset();
              this.activeModal = null;
            });

        } else {

          const payload = {
            tradeMajorID: 0,
            tradeMajorName: majorValue.tradeMajorName,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .createMajorTrade(payload)
            .subscribe(() => {
              this.loadTradeMajors();
              this.majorTradeForm.reset();
              this.activeModal = null;
            });

        }

      break;

      case 'MINOR_TRADE':
        const minorValue = this.minorTradeForm.value;

        if (this.isEditMode && minorValue.tradeMinorID) {

          const payload = {
            tradeMinorID: minorValue.tradeMinorID,
            tradeMinorName: minorValue.tradeMinorName,
            tradeMajorID: minorValue.tradeMajorID,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .updateMinorTrade(minorValue.tradeMinorID, payload)
            .subscribe(() => {
              this.onMajorChange();
              this.minorTradeForm.reset();
              this.activeModal = null;
            });

        } else {

          const payload = {
            tradeMinorID: 0,
            tradeMinorName: minorValue.tradeMinorName,
            tradeMajorID: minorValue.tradeMajorID,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .createMinorTrade(payload)
            .subscribe(() => {
              this.onMajorChange();
              this.minorTradeForm.reset();
              this.activeModal = null;
            });

        }

      break;

      case 'SUB_TRADE':

        const subValue = this.subTradeForm.value;

        if (this.isEditMode && subValue.tradeSubID) {

          const payload = {
            tradeSubID: subValue.tradeSubID,
            tradeSubName: subValue.tradeSubName,
            tradeMinorID: subValue.tradeMinorID,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .updateSubTrade(subValue.tradeSubID, payload)
            .subscribe(() => {
              this.onMinorChange();
              this.subTradeForm.reset();
              this.activeModal = null;
            });

        } else {

          const payload = {
            tradeSubID: 0,
            tradeSubName: subValue.tradeSubName,
            tradeMinorID: subValue.tradeMinorID,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .createSubTrade(payload)
            .subscribe(() => {
              this.onMinorChange();
              this.subTradeForm.reset();
              this.activeModal = null;
            });

        }

      break;

      case 'ZONE':
        const zoneValue = this.zoneForm.value;

        if (this.isEditMode && zoneValue.zoneID) {

          const payload = {
            zoneID: zoneValue.zoneID,
            zoneName: zoneValue.zoneName,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .updateZone(zoneValue.zoneID, payload)
            .subscribe(() => {
              this.loadZones();
              this.zoneForm.reset();
              this.activeModal = null;
            });

        } else {

          const payload = {
            zoneID: 0,
            zoneName: zoneValue.zoneName,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .createZone(payload)
            .subscribe(() => {
              this.loadZones();
              this.zoneForm.reset();
              this.activeModal = null;
            });

        }

      break;

      case 'ZONE_CLASSIFICATION':
        const zoneClassValue = this.zoneClassificationForm.value;

        if (this.isEditMode && zoneClassValue.zonalClassificationID) {

          const payload = {
            zonalClassificationID: zoneClassValue.zonalClassificationID,
            zonalClassificationName: zoneClassValue.zonalClassificationName,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .updateZoneClassification(zoneClassValue.zonalClassificationID, payload)
            .subscribe(() => {
              this.loadZoneClassification();
              this.zoneClassificationForm.reset();
              this.activeModal = null;
            });

        } else {

          const payload = {
            zonalClassificationID: 0,
            zonalClassificationName: zoneClassValue.zonalClassificationName,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .createZoneClassification(payload)
            .subscribe(() => {
              this.loadZoneClassification();
              this.zoneClassificationForm.reset();
              this.activeModal = null;
            });

        }

      break;

      case 'TRADE_CATEGORY':
        const formValue = this.tradeCategoryForm.value;

        if (this.isEditMode && formValue.tradeTypeID) {

          const payload = {
            tradeTypeID: formValue.tradeTypeID ?? 0,
            tradeTypeCode: String(formValue.tradeTypeID),
            tradeTypeName: formValue.tradeTypeName,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .updateTradeType(formValue.tradeTypeID, payload)
            .subscribe({
              next: () => {
                console.log("Trade Type Updated Successfully");

                this.loadTradeTypes();          // refresh list
                this.tradeCategoryForm.reset(); // clear form
                this.activeModal = null;        // close modal
              },
              error: (err) => console.error(err)
            });

        } else {

          const payload = {
            tradeTypeID: 0,
            tradeTypeCode: "0",
            tradeTypeName: formValue.tradeTypeName,
            isActive: "Y",
            entryDate: new Date().toISOString()
          };

          this.masterDataComplianceService
            .createTradeType(payload)
            .subscribe({
              next: () => {
                console.log("Trade Type Created Successfully");

                this.loadTradeTypes();          // refresh list
                this.tradeCategoryForm.reset(); // clear form
                this.activeModal = null;        // close modal
              },
              error: (err) => console.error(err)
            });

        }

      break;
    }
    this.activeModal = null;
  }


  //To Save Trade Classification Details
  tradePrice: number | null = null;
  saveTradePrice(){

  }

  //To Save licenseFeePrescribed
  licenseFeePrescribed: number | null = null;

  saveLicenseFeePrescribed(){

  }
}
