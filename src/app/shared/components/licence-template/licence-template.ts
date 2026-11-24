import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-licence-template',
  imports: [CommonModule],
  templateUrl: './licence-template.html',
  styleUrl: './licence-template.css',
})
export class LicenceTemplate {
  @Input() wardName = '';
  @Input() licenceNo = '';
  @Input() applicationNo = '';
  @Input() financialYear = '';
  @Input() applicantName = '';
  @Input() licenceDate = '';
  @Input() tradeName = '';
  @Input() tradeAddress = '';
  @Input() sanctionedPower = '';
  @Input() majorTrade = '';
  @Input() minorTrade = '';
  @Input() subTrade = '';
  @Input() validUpto = '';
  @Input() feesPaid = '';
  @Input() paymentMode = '';
  @Input() receiptNo = '';
  @Input() paymentDate = '';
  @Input() renewBefore = '';
  @Input() qrCodeOrCertificateHash = '';
  @Input() signatureImageUrl = '/SIGNATURE.png';
  // GBA corporation (e.g. 'Central'); empty for licences issued before GBA -> BBMP header as before
  @Input() corporationName = '';

  get issuingAuthority(): string {
    return this.corporationName
      ? `Bengaluru ${this.corporationName} City Corporation`
      : 'Bruhat Bangalore Mahanagara Palike';
  }

  generatedAt = new Date();
  showSignatureImage = true;

  onSignatureImageError(): void {
    this.showSignatureImage = false;
  }
}
