/**
 * Documents a trader uploads with a new trade licence application.
 *
 * Single source of truth for the "Documents" step of the new-licence form (pages/new-licenses) and
 * the public "Required Documents" list on the Help & Support page. `documentId` is the DocumentID of
 * the document master (usp_MasterDocument_CRUD) that the upload is saved against.
 */
export interface LicenceDocumentDefinition {
  readonly key: string;
  readonly documentId: number;
  readonly label: string;
  readonly required: boolean;
}

export const LICENCE_DOCUMENTS: readonly LicenceDocumentDefinition[] = [
  { key: 'ownerConsent', documentId: 1, label: 'Owner Consent / Lease Agreement', required: true },
  { key: 'electricityBill', documentId: 9, label: 'Electricity Bill', required: true },
  { key: 'oc', documentId: 8, label: 'Occupancy Certificate', required: false },
  { key: 'neighbour', documentId: 2, label: 'Neighbour Consent', required: true },
  { key: 'noc', documentId: 7, label: 'Details of no objections and other sanctions', required: false },
  { key: 'psd', documentId: 6, label: 'Plan sanction details', required: false },
  { key: 'ccd', documentId: 5, label: 'Commencement certificate details', required: false },
  { key: 'taxReceipt', documentId: 4, label: 'Tax paid receipt', required: false },
  { key: 'khataReceipt', documentId: 3, label: 'Khata receipt', required: false },
];

/** Steps of the new-licence form, in the order of its stepper (pages/new-licenses). */
export const NEW_LICENCE_STEPS: readonly { readonly label: string; readonly detail: string }[] = [
  { label: 'Basic', detail: 'Applicant representation, trade name, mobile number, corporation, zone, ward, BESCOM RR number and address.' },
  { label: 'Trade', detail: 'Major, minor and sub trade (Schedule X classification) and parking details.' },
  { label: 'Fee', detail: 'Zone classification and proposed commencement; the licence fee is calculated automatically.' },
  { label: 'Location', detail: 'Mark the premises on the map and confirm the road width.' },
  { label: 'Documents', detail: 'Upload the documents to be enclosed and the power / generator details.' },
  { label: 'OTP', detail: 'Verify the application with the OTP sent to your mobile number.' },
  { label: 'Preview', detail: 'Accept the declaration, review the application and fee summary, then pay or choose Save & Pay Later.' },
];

/** Upload rules enforced by the new-licence form (accept="application/pdf", 5 MB check). */
export const LICENCE_DOCUMENT_RULES = {
  acceptedFormat: 'PDF',
  maxFileSizeMb: 5,
} as const;
