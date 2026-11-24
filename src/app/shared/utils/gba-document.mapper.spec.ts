import { describe, expect, it } from 'vitest';
import {
  acknowledgementBlocker,
  buildAcknowledgementData,
  buildCertificateData,
  CertificateSourceRecord,
  findSuccessfulPayment,
} from './gba-document.mapper';
import { CORPORATION_TEMPLATES, findCorporationTemplate } from '../../core/config/corporation-templates.config';
import type { ApplicationView } from '../../pages/view-licenses-application/view-licenses-application.service';

const payment = (status: string, paidOn: string, txnId = 'TXN', amount = 500) => ({
  txnId, amount, status, paidOn, bankRefNo: null, gatewayTxnId: null, mode: null, message: null,
});

function view(overrides: Partial<ApplicationView> = {}): ApplicationView {
  return {
    application: { applicantName: 'App Name', tradeName: 'Draft Trade', doorNumber: '13', address1: '6th Cross', pincode: 560011 },
    master: { tradeName: 'Gayatri Hotel', address2: '' },
    awaitingSubmission: false,
    final: {
      licenceApplicationID: 9,
      applicationNumber: 'BSCC/JAY/N/APP/2026-27/00001',
      applicationSubmitDate: '2026-11-20T10:15:00',
      acknowledgementNumber: null,
      licenceApplicationStatusID: 2,
      statusName: 'APPLIED',
    },
    timeline: [],
    extra: null,
    gba: { corporationName: 'South', corporationNativeName: null, zoneName: 'Jayanagar', wardNo: 5, wardName: 'Jayanagar', wardNativeName: null, assemblyName: null },
    trades: [
      { tradeMajorName: 'Food', tradeMinorName: 'Hotel', tradeSubName: 'Restaurant', tradeFee: 100 },
      { tradeMajorName: 'Food', tradeMinorName: 'Hotel', tradeSubName: 'Restaurant', tradeFee: 100 },
    ],
    documents: [],
    geo: { Latitude: 12.9255, Longitude: 77.5838, RoadWidthMtrs: 12, RoadCategory: 'Commercial' },
    payments: [payment('SUCCESS', '2026-11-20T10:00:00', 'TXN-OK', 1500)],
    fees: { totalTradeFee: 1500, paymentStatus: 'SUCCESS', amountPaid: 1500 },
    ...overrides,
  };
}

describe('corporation template config', () => {
  it('has five corporations with unique codes and template ids', () => {
    expect(CORPORATION_TEMPLATES.length).toBe(5);
    expect(new Set(CORPORATION_TEMPLATES.map((t) => t.code)).size).toBe(5);
    expect(new Set(CORPORATION_TEMPLATES.map((t) => t.certificateTemplateId)).size).toBe(5);
    expect(new Set(CORPORATION_TEMPLATES.map((t) => t.acknowledgementTemplateId)).size).toBe(5);
    expect(new Set(CORPORATION_TEMPLATES.map((t) => t.sealUrl)).size).toBe(5);
  });

  it('matches names, codes and full names; nothing for legacy/unknown', () => {
    expect(findCorporationTemplate('Central')?.code).toBe('BCCC');
    expect(findCorporationTemplate(' north ')?.code).toBe('BNCC');
    expect(findCorporationTemplate('BSCC')?.code).toBe('BSCC');
    expect(findCorporationTemplate('Bengaluru East City Corporation')?.code).toBe('BECC');
    expect(findCorporationTemplate('West')?.code).toBe('BWCC');
    expect(findCorporationTemplate('')).toBeNull();
    expect(findCorporationTemplate(null)).toBeNull();
    expect(findCorporationTemplate('Bruhat Bangalore Mahanagara Palike')).toBeNull();
  });
});

describe('acknowledgement payment gate', () => {
  it('allows a submitted application with a SUCCESS payment', () => {
    expect(acknowledgementBlocker(view())).toBeNull();
  });

  it.each(['FAILED', 'PENDING', 'INITIATED', 'CANCELLED', ''])('blocks when the only payment is %s', (status) => {
    expect(acknowledgementBlocker(view({ payments: [payment(status, '2026-11-20T10:00:00')] }))).toBe('no-successful-payment');
  });

  it('blocks with no payments, unsubmitted, awaiting submission or no GBA corporation', () => {
    expect(acknowledgementBlocker(view({ payments: [] }))).toBe('no-successful-payment');
    expect(acknowledgementBlocker(view({ final: null }))).toBe('not-submitted');
    expect(acknowledgementBlocker(view({ awaitingSubmission: true }))).toBe('awaiting-submission');
    expect(acknowledgementBlocker(view({ gba: null }))).toBe('no-gba-corporation');
    expect(acknowledgementBlocker(null)).toBe('no-successful-payment');
  });

  it('reports the most specific reason when several apply', () => {
    // Failed payment on a draft: the payment is the reason, not the missing submission.
    expect(acknowledgementBlocker(view({ final: null, payments: [payment('FAILED', '2026-11-20T10:00:00')] }))).toBe('no-successful-payment');
    // Paid but the submission did not go through.
    expect(acknowledgementBlocker(view({ final: null, awaitingSubmission: true }))).toBe('awaiting-submission');
  });

  it('uses the latest SUCCESS payment and ignores failed retries', () => {
    const found = findSuccessfulPayment([
      payment('FAILED', '2026-11-20T09:00:00', 'TXN-1'),
      payment('SUCCESS', '2026-11-20T09:30:00', 'TXN-2'),
      payment('success', '2026-11-20T09:45:00', 'TXN-3'),
      payment('FAILED', '2026-11-20T10:00:00', 'TXN-4'),
    ]);
    expect(found?.txnId).toBe('TXN-3');
  });
});

describe('acknowledgement data', () => {
  it('maps submission, applicant, trade and payment fields', () => {
    const v = view();
    const data = buildAcknowledgementData(v, findSuccessfulPayment(v.payments)!);
    expect(data.division).toBe('Jayanagar');
    expect(data.ward).toBe('5, Jayanagar');
    expect(data.applicationReferenceNumber).toBe('BSCC/JAY/N/APP/2026-27/00001');
    expect(data.submittedOn).toMatch(/^20\/11\/2026 10:15 AM$/);
    expect(data.applicantName).toBe('App Name');
    expect(data.tradeName).toBe('Gayatri Hotel'); // licence record overrides the draft
    expect(data.subTradeName).toBe('Restaurant'); // de-duplicated
    expect(data.tradeAddress).toBe('13, 6th Cross, 560011');
    expect(data.applicationFeePaid).toBe('Rs. 1,500.00');
    expect(data.paymentTransactionId).toBe('TXN-OK');
  });
});

describe('certificate data', () => {
  const record: CertificateSourceRecord = {
    applicationNumber: 'BSCC/JAY/N/APP/2026-27/00001',
    licenceNumber: 'BSCC/JAY/2026-27/00001',
    applicantName: 'G. N. Krishnappa',
    tradeName: 'Gayatri Hotel',
    tradeAddress: 'No. 13, 6th Cross, 10th Main, Jayanagar',
    tradeMajorName: 'Food',
    tradeMinorName: 'Hotel',
    tradeSubName: 'Restaurant',
    licenceFromDate: '2026-11-22',
    licenceToDate: '2027-03-31',
    receiptNumber: 'R-77',
    receiptDate: '2026-11-20',
    tradeFee: 1200,
    amountPaid: 1500,
  };

  it('fills available fields and leaves unavailable ones blank', () => {
    const data = buildCertificateData(record, view(), 1);
    expect(data.licenceNo).toBe('BSCC/JAY/2026-27/00001');
    expect(data.division).toBe('Jayanagar');
    expect(data.ward).toBe('5, Jayanagar');
    expect(data.latitude).toBe('12.925500');
    expect(data.longitude).toBe('77.583800');
    expect(data.roadWidth).toBe('12 m');
    expect(data.roadType).toBe('Commercial');
    expect(data.receiptNoAndDate).toBe('R-77 / 20/11/2026');
    expect(data.feesCollected).toBe('Rs. 1,500.00');
    expect(data.yearsOpted).toBe('1');
    expect(data.issuedDate).toBe('22/11/2026');
    expect(data.validUpto).toBe('31/03/2027');
    expect(data.nextRenewalDate).toBe('31/03/2027');
    // Not supplied by the backend yet: never invented.
    expect(data.gstNo).toBe('');
    expect(data.epidKhathaNo).toBe('');
    expect(data.issuedTime).toBe('');
    expect(data.qrCodeUrl).toBe('');
    expect(data.premisesPhotoUrl).toBe('');
  });

  it('prints the GST number captured on the application when the certificate API omits it', () => {
    const v = view({ application: { ...view().application, GSTNumber: '29ABCDE1234F1Z5' } });
    expect(buildCertificateData(record, v, 1).gstNo).toBe('29ABCDE1234F1Z5');
    // khathaNumber / PIDNumber are not printed as the EPID Khatha number.
    const k = view({ master: { ...view().master, khathaNumber: 'KH-9', PIDNumber: 'PID-9' } });
    expect(buildCertificateData(record, k, 1).epidKhathaNo).toBe('');
  });

  it('uses backend-supplied extra fields when present', () => {
    const data = buildCertificateData(
      { ...record, gstNumber: '29ABCDE1234F1Z5', epidKhathaNumber: 'EP-1', licenceIssuedOn: '2026-11-22T15:40:00', noOfYearsOpted: 3 },
      view(),
      1
    );
    expect(data.gstNo).toBe('29ABCDE1234F1Z5');
    expect(data.epidKhathaNo).toBe('EP-1');
    expect(data.issuedTime).toBe('03:40 PM');
    expect(data.yearsOpted).toBe('3');
  });

  it('still renders without the application view (blank geo/division)', () => {
    const data = buildCertificateData({ ...record, gbaWardName: 'Jayanagar' }, null, null);
    expect(data.division).toBe('');
    expect(data.ward).toBe('Jayanagar');
    expect(data.latitude).toBe('');
    expect(data.yearsOpted).toBe('');
  });
});
