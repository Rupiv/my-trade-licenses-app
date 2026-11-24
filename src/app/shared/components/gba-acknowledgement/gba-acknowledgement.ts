import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  CorporationTemplate,
  GBA_TEMPLATE_ASSETS,
  pdfRectStyle,
} from '../../../core/config/corporation-templates.config';

/** Values printed on the payment acknowledgement (page 2 of the corporation PDF). */
export interface GbaAcknowledgementData {
  division: string;
  ward: string;
  applicationReferenceNumber: string;
  submittedOn: string;
  applicantName: string;
  tradeName: string;
  subTradeName: string;
  tradeAddress: string;
  applicationFeePaid: string;
  paymentTransactionId: string;
}

/** Corporation-specific "Acknowledgement of Online Application for Trade Licence" (GBA). */
@Component({
  selector: 'app-gba-acknowledgement',
  imports: [CommonModule],
  templateUrl: './gba-acknowledgement.html',
  styleUrls: ['../../styles/gba-document.css', './gba-acknowledgement.css'],
})
export class GbaAcknowledgement {
  @Input({ required: true }) template!: CorporationTemplate;
  @Input({ required: true }) data!: GbaAcknowledgementData;

  readonly assets = GBA_TEMPLATE_ASSETS;
  readonly missingImages = new Set<string>();

  /** Rows exactly as labelled in the reference PDF (its "Name of  Trade:" double space is dropped). */
  get rows(): Array<[string, string]> {
    const d = this.data;
    return [
      ['Application Reference Number', d.applicationReferenceNumber],
      ['Date and Time of Submission', d.submittedOn],
      ['Applicant Name', d.applicantName],
      ['Name of Trade:', d.tradeName],
      ['Sub Trade Name', d.subTradeName],
      ['Trade Address', d.tradeAddress],
      ['Application Fee Paid', d.applicationFeePaid],
      ['Payment Transaction ID', d.paymentTransactionId],
    ];
  }

  get sealStyle(): Record<string, string> {
    return pdfRectStyle(this.template.acknowledgementPlacement.seal);
  }

  get watermarkStyle(): Record<string, string> {
    return pdfRectStyle(this.template.acknowledgementPlacement.watermark);
  }

  onImageError(key: string): void {
    this.missingImages.add(key);
  }
}
