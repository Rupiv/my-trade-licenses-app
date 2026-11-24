import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GbaCorporation, MLCConstituency, Ward, Zones } from '../../../../core/models/new-trade-licenses.model';

export interface AdminApplicationFilterState {
  corporationId: number | null;
  zoneId: number | null;
  mohId: number | null;
  wardId: number | null;
  status: string;
}

@Component({
  selector: 'app-admin-application-filters',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-application-filters.html',
  styleUrl: './admin-application-filters.css'
})
export class AdminApplicationFiltersComponent implements OnChanges {
  @Input() corporations: GbaCorporation[] = [];
  @Input() selectedCorporationId: number | null = null;
  @Input() zones: Zones[] = [];
  @Input() mohs: MLCConstituency[] = [];
  @Input() wards: Ward[] = [];
  @Input() selectedZoneId: number | null = null;
  @Input() selectedMohId: number | null = null;
  @Input() selectedWardId: number | null = null;
  @Input() selectedStatus = '';
  @Input() searchText = '';
  @Input() statusOptions: string[] = [];

  @Output() filtersChange = new EventEmitter<AdminApplicationFilterState>();
  @Output() searchChange = new EventEmitter<string>();

  corporationId: number | null = null;
  zoneId: number | null = null;
  mohId: number | null = null;
  wardId: number | null = null;
  status = '';
  localSearchText = '';
  zoneSearchTerm = '';
  mohSearchTerm = '';
  wardSearchTerm = '';

  get filteredZones(): Zones[] {
    const term = this.zoneSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.zones;
    }
    return this.zones.filter((zone) =>
      zone.zoneName?.toLowerCase().includes(term)
    );
  }

  get filteredMohOptions(): MLCConstituency[] {
    const term = this.mohSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.mohs;
    }
    return this.mohs.filter((moh) =>
      moh.mohName?.toLowerCase().includes(term)
    );
  }

  get filteredWardOptions(): Ward[] {
    const term = this.wardSearchTerm.trim().toLowerCase();
    if (!term) {
      return this.wards;
    }
    return this.wards.filter((ward) =>
      ward.wardName?.toLowerCase().includes(term)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedCorporationId']) {
      this.corporationId = this.selectedCorporationId;
    }
    if (
      changes['selectedZoneId'] ||
      changes['selectedMohId'] ||
      changes['selectedWardId'] ||
      changes['selectedStatus'] ||
      changes['searchText']
    ) {
      this.zoneId = this.selectedZoneId;
      this.mohId = this.selectedMohId;
      this.wardId = this.selectedWardId;
      this.status = this.selectedStatus;
      this.localSearchText = this.searchText;
      this.zoneSearchTerm = this.getZoneNameById(this.zoneId);
      this.mohSearchTerm = this.getMohNameById(this.mohId);
      this.wardSearchTerm = this.getWardNameById(this.wardId);
    }
  }

  onZoneChanged(): void {
    this.zoneId = this.findZoneIdByName(this.zoneSearchTerm);
    this.mohId = null;
    this.wardId = null;
    this.mohSearchTerm = '';
    this.wardSearchTerm = '';
    this.emitFilters();
  }

  onMohChanged(): void {
    this.mohId = this.findMohIdByName(this.mohSearchTerm);
    this.wardId = null;
    this.wardSearchTerm = '';
    this.emitFilters();
  }

  onWardChanged(): void {
    this.wardId = this.findWardIdByName(this.wardSearchTerm);
    this.emitFilters();
  }

  onSearchChanged(): void {
    this.searchChange.emit(this.localSearchText);
  }

  onStatusChanged(): void {
    this.emitFilters();
  }

  clearZone(): void {
    this.zoneSearchTerm = '';
    this.zoneId = null;
    this.mohId = null;
    this.wardId = null;
    this.mohSearchTerm = '';
    this.wardSearchTerm = '';
    this.emitFilters();
  }

  clearMoh(): void {
    this.mohSearchTerm = '';
    this.mohId = null;
    this.wardId = null;
    this.wardSearchTerm = '';
    this.emitFilters();
  }

  clearWard(): void {
    this.wardSearchTerm = '';
    this.wardId = null;
    this.emitFilters();
  }

  private findZoneIdByName(name: string): number | null {
    const normalized = name?.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const match = this.zones.find(
      (zone) => zone.zoneName?.trim().toLowerCase() === normalized
    );
    return match?.zoneID ?? null;
  }

  private findMohIdByName(name: string): number | null {
    const normalized = name?.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const match = this.mohs.find(
      (moh) => moh.mohName?.trim().toLowerCase() === normalized
    );
    return match?.mohID ?? null;
  }

  private findWardIdByName(name: string): number | null {
    const normalized = name?.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const match = this.wards.find(
      (ward) => ward.wardName?.trim().toLowerCase() === normalized
    );
    return match?.wardID ?? null;
  }

  private getZoneNameById(zoneId: number | null): string {
    if (!zoneId) {
      return '';
    }
    return this.zones.find((zone) => zone.zoneID === zoneId)?.zoneName ?? '';
  }

  private getMohNameById(mohId: number | null): string {
    if (!mohId) {
      return '';
    }
    return this.mohs.find((moh) => moh.mohID === mohId)?.mohName ?? '';
  }

  private getWardNameById(wardId: number | null): string {
    if (!wardId) {
      return '';
    }
    return this.wards.find((ward) => ward.wardID === wardId)?.wardName ?? '';
  }

  onCorporationChanged(): void {
    this.emitFilters();
  }

  private emitFilters(): void {
    this.filtersChange.emit({
      corporationId: this.corporationId,
      zoneId: this.zoneId,
      mohId: this.mohId,
      wardId: this.wardId,
      status: this.status
    });
  }
}
