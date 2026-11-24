/**
 * Maps backend responses onto the GBA certificate / acknowledgement fields.
 *
 * Rule: a value is printed only if the backend supplied it. Missing values become '' (blank cell);
 * nothing is derived from guesses. Fields the backend does not provide yet are listed in
 * docs/gba-certificate-backend-spec.md.
 */
import type { ApplicationView } from '../../pages/view-licenses-application/view-licenses-application.service';
import type { GbaAcknowledgementData } from '../components/gba-acknowledgement/gba-acknowledgement';
import type { GbaCertificateData } from '../components/gba-certificate/gba-certificate';

type Payment = ApplicationView['payments'][number];

/** Fields of GET /licence/certificate/approved/{appNo} used here (existing + spec'd additions). */
export interface CertificateSourceRecord {
  applicationNumber: string;
  licenceNumber: string;
  applicantName: string;
  tradeName: string;
  tradeAddress: string;
  tradeMajorName: string;
  tradeMinorName: string;
  tradeSubName: string;
  licenceFromDate: string;
  licenceToDate: string;
  receiptNumber: string;
  receiptDate: string;
  tradeFee: number;
  gbaWardName?: string | null;
  validUpto?: string | null;
  amountPaid?: number | null;
  // Spec'd additions (docs/gba-certificate-backend-spec.md §3); blank until the backend returns them.
  gstNumber?: string | null;
  epidKhathaNumber?: string | null;
  noOfYearsOpted?: number | null;
  licenceIssuedOn?: string | null;
  nextRenewalDate?: string | null;
  qrCodeDataUrl?: string | null;
  premisesPhotoUrl?: string | null;
}

const text = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const parseDate = (value: unknown): Date | null => {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** dd/MM/yyyy */
export function formatDate(value: unknown): string {
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
}

/** hh:mm AM/PM */
export function formatTime(value: unknown): string {
  const date = parseDate(value);
  return date
    ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
    : '';
}

/** dd/MM/yyyy hh:mm AM/PM */
export function formatDateTime(value: unknown): string {
  const date = formatDate(value);
  return date ? `${date} ${formatTime(value)}` : '';
}

/** Rs. 1,234.00 */
export function formatAmount(value: unknown): string {
  if (value === null || value === undefined || text(value) === '') return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCoordinate(value: unknown): string {
  const n = Number(value);
  return value !== null && value !== undefined && text(value) !== '' && Number.isFinite(n) ? n.toFixed(6) : '';
}

/** "5, Jayanagar" from the GBA ward. */
export function formatGbaWard(gba: ApplicationView['gba']): string {
  if (!gba) return '';
  return [text(gba.wardNo), text(gba.wardName)].filter(Boolean).join(', ');
}

/** Application header overlaid with the licence record's non-empty applicant/address fields. */
export function mergedApplication(view: ApplicationView | null): any {
  const base = view?.application ?? {};
  const master = view?.master ?? {};
  const filled = Object.fromEntries(
    Object.entries(master).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
  return { ...base, ...filled };
}

export function formatAddress(app: any): string {
  return [app?.doorNumber, app?.address1, app?.address2, app?.address3, app?.street, app?.pincode]
    .map(text)
    .filter(Boolean)
    .join(', ');
}

/**
 * The gateway-confirmed payment for an application: the latest payment whose status is SUCCESS.
 * INITIATED / PENDING / FAILED / CANCELLED rows are never used.
 */
export function findSuccessfulPayment(payments: ApplicationView['payments'] | null | undefined): Payment | null {
  const successful = (payments ?? []).filter((p) => text(p?.status).toUpperCase() === 'SUCCESS');
  if (!successful.length) return null;
  return successful.reduce((latest, p) =>
    (parseDate(p.paidOn)?.getTime() ?? 0) >= (parseDate(latest.paidOn)?.getTime() ?? 0) ? p : latest
  );
}

export type AcknowledgementBlocker =
  | 'not-submitted'
  | 'awaiting-submission'
  | 'no-successful-payment'
  | 'no-gba-corporation';

/**
 * Why an acknowledgement cannot be issued yet, or null when it can. An acknowledgement needs a
 * gateway-confirmed payment AND a successfully submitted application in a GBA corporation.
 */
export function acknowledgementBlocker(view: ApplicationView | null): AcknowledgementBlocker | null {
  // Most specific reason first: paid-but-not-submitted, then payment, then submission.
  if (view?.awaitingSubmission) return 'awaiting-submission';
  if (!findSuccessfulPayment(view?.payments)) return 'no-successful-payment';
  if (!view?.final || !text(view.final.applicationNumber)) return 'not-submitted';
  if (!view.gba?.corporationName) return 'no-gba-corporation';
  return null;
}

export function buildAcknowledgementData(view: ApplicationView, payment: Payment): GbaAcknowledgementData {
  const app = mergedApplication(view);
  const subTrades = Array.from(
    new Set((view.trades ?? []).map((t) => text(t.tradeSubName)).filter(Boolean))
  ).join(', ');

  return {
    division: text(view.gba?.zoneName),
    ward: formatGbaWard(view.gba),
    applicationReferenceNumber: text(view.final?.applicationNumber),
    submittedOn: formatDateTime(view.final?.applicationSubmitDate),
    applicantName: text(app.applicantName),
    tradeName: text(app.tradeName),
    subTradeName: subTrades,
    tradeAddress: formatAddress(app),
    applicationFeePaid: formatAmount(payment.amount),
    paymentTransactionId: text(payment.txnId),
  };
}

/**
 * Certificate fields from the approved-certificate record, enriched with the application view
 * (GBA division/ward, geo) and the submitted application (years opted).
 */
export function buildCertificateData(
  record: CertificateSourceRecord,
  view: ApplicationView | null,
  yearsAppliedFromApplication: number | null
): GbaCertificateData {
  const gba = view?.gba ?? null;
  const geo = view?.geo ?? null;
  const app = mergedApplication(view);
  const validUpto = record.validUpto || record.licenceToDate;
  const issuedOn = record.licenceIssuedOn || null;
  const years = record.noOfYearsOpted ?? yearsAppliedFromApplication;
  const roadWidth = geo?.RoadWidthMtrs;

  return {
    division: text(gba?.zoneName),
    ward: formatGbaWard(gba) || text(record.gbaWardName),
    applicationNo: text(record.applicationNumber),
    licenceNo: text(record.licenceNumber),
    applicantName: text(record.applicantName),
    tradeName: text(record.tradeName),
    tradeAddress: text(record.tradeAddress),
    majorTrade: text(record.tradeMajorName),
    minorTrade: text(record.tradeMinorName),
    subTrade: text(record.tradeSubName),
    // Captured on the New Licence form; returned by the application view as GSTNumber.
    gstNo: text(record.gstNumber) || text(app.GSTNumber ?? app.gstNumber),
    // Not derived from khathaNumber / PIDNumber: whether either is the eKhata EPID is unconfirmed.
    epidKhathaNo: text(record.epidKhathaNumber),
    longitude: formatCoordinate(geo?.Longitude),
    latitude: formatCoordinate(geo?.Latitude),
    roadWidth: roadWidth !== null && roadWidth !== undefined && text(roadWidth) !== '' ? `${roadWidth} m` : '',
    roadType: text(geo?.RoadCategory),
    receiptNoAndDate: [text(record.receiptNumber), formatDate(record.receiptDate)].filter(Boolean).join(' / '),
    feesCollected: formatAmount(record.amountPaid ?? record.tradeFee),
    yearsOpted: years ? String(years) : '',
    // Issued date: the issue timestamp when the backend sends it, otherwise the licence start date.
    issuedDate: formatDate(issuedOn || record.licenceFromDate),
    // Time is only printed from a real issue timestamp, never from the time of viewing.
    issuedTime: issuedOn ? formatTime(issuedOn) : '',
    validUpto: formatDate(validUpto),
    // Same rule the BBMP certificate already uses ("renew before <valid upto>") until the backend sends one.
    nextRenewalDate: formatDate(record.nextRenewalDate || validUpto),
    qrCodeUrl: text(record.qrCodeDataUrl),
    premisesPhotoUrl: text(record.premisesPhotoUrl),
  };
}
