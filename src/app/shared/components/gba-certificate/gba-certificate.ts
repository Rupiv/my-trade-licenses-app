import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  CorporationTemplate,
  GBA_TEMPLATE_ASSETS,
  pdfRectStyle,
} from '../../../core/config/corporation-templates.config';

/**
 * Values printed on the GBA certificate (page 1 of the corporation PDF).
 * Empty string = not available from the backend; the cell is left blank, never filled with a guess.
 */
export interface GbaCertificateData {
  division: string;
  ward: string;
  applicationNo: string;
  licenceNo: string;
  applicantName: string;
  tradeName: string;
  tradeAddress: string;
  majorTrade: string;
  minorTrade: string;
  subTrade: string;
  gstNo: string;
  epidKhathaNo: string;
  longitude: string;
  latitude: string;
  roadWidth: string;
  roadType: string;
  receiptNoAndDate: string;
  feesCollected: string;
  yearsOpted: string;
  issuedDate: string;
  issuedTime: string;
  validUpto: string;
  nextRenewalDate: string;
  /** Data URL / URL of the verification QR code; empty = not provided by the backend yet. */
  qrCodeUrl: string;
  /** URL of the trade premises photograph; empty = not provided by the backend yet. */
  premisesPhotoUrl: string;
}

/** Corporation-specific Trade Licence Certificate (GBA). One layout, styled per corporation. */
@Component({
  selector: 'app-gba-certificate',
  imports: [CommonModule],
  templateUrl: './gba-certificate.html',
  styleUrls: ['../../styles/gba-document.css', './gba-certificate.css'],
})
export class GbaCertificate {
  @Input({ required: true }) template!: CorporationTemplate;
  @Input({ required: true }) data!: GbaCertificateData;

  readonly assets = GBA_TEMPLATE_ASSETS;

  /** Images that failed to load (asset not deployed) are hidden instead of showing a broken icon. */
  readonly missingImages = new Set<string>();

  get sealStyle(): Record<string, string> {
    return pdfRectStyle(this.template.certificatePlacement.seal);
  }

  get watermarkStyle(): Record<string, string> {
    return pdfRectStyle(this.template.certificatePlacement.watermark);
  }

  onImageError(key: string): void {
    this.missingImages.add(key);
  }
}
