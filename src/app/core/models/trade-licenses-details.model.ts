import { stringify } from "querystring";

export interface LicenceApplicationModel {
  licenceApplicationID: number;
  applicationNumber: string;
  finanicalYearID: number;
  tradeTypeID: number;
  bescomRRNumber: string;
  TINNumber: string;
  VATNumber: string;
  applicationSubmitDate: string;   // ISO string
  applicationEntryDate: string;
  acknowledgementNumber: string;
  acknowledgementDate: string | null;
  receiptNumber: string;
  receiptDate: string;
  receiptSecurityCode: string | null;
  licenceFromDate: string;
  licenceToDate: string;
  licenceApplicationStatusID: number;
  licenceApplicationStatusName: string;
  currentStatus: number;
  currentStatusName: string;
  tradeLicenceID: number;
  mohID: number;
  loginID: number;
  entryOriginLoginID: number;
  isActive: 'Y' | 'N';
  InspectingOfficerID: number | null;
  licenseType: string | null;
  ApplicantRepersenting: string | null;
  jathaStatus: string | null;
  TransactionType: string;
  docsSubmitted: string | null;
  DeemedApproval: string | null;
  FileNumber: string | null;
  ChangesDate: string;
  ChangesRemarks: string | null;
  ChangesMade: number;
  CancelledCertFlag: number;
  CHORemarks: string | null;
  OTP: string | null;
  ChallanNo: number;
  NoOfYearsApplied: number;
  Refundflag: string | null;
  billdesk_refund_remarks: string | null;
  Source:string;
}

export interface TradeLicensesApplicationDetails {
  tradeLicenceID: number,
  applicantName: string;
  doorNumber: string;
  address1: string;
  address2: string;
  address3: string;
  pincode: number;
  landLineNumber: string;
  mobileNumber: string;
  emailID: string;
  tradeName: string;
  zonalClassificationID: number;
  mohID: number;
  wardID: number;
  PropertyID: number;
  PIDNumber: string;
  khathaNumber: string;
  surveyNumber: string;
  street: string;
  GISNumber: string;
  licenceNumber: string;
  licenceCommencementDate: string; // ISO string from API
  licenceStatusID: number;
  oldapplicationNumber: string | null;
  newlicenceNumber: string | null;
  Source: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  roadWidthMtrs: number;
  roadCategory: string;
}

export interface LicenceApplicationDetails {
  licenceApplicationID: number;
  applicationNumber: string | null;
  applicationSubmitDate: string; // ISO date string
  licenceFromDate: string;       // ISO date string
  licenceToDate: string;         // ISO date string
  applicationStatus: string;
  currentStatus: string;
  tradeLicenceID: number;
  applicantName: string;
  tradeName: string;
  /** Paid, but never submitted to the officers (payment redirect failed) */
  awaitingSubmission?: boolean;
  documents : Documents;
  geoLocation: GeoLocation;
}

export interface Documents{
  documentID: number;
  documentName: string;
  fileName: string;
  filePath: string;
}

export interface AppliedLicensesResponse {
  userId: number;
  fullName: string;
  mobileNumber: string;
  emailId: string;
  applications: LicenceApplicationDetails[];
}

export interface ApprovedApplications{
  role: string;
  status: string;
  loginID: number;
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  data : AllApprovedApplication[];
}

export interface AllApprovedApplication{
  licenceApplicationID: number;
  applicationNumber: string;
  applicationSubmitDate: Date;
  licenceApplicationStatusID: number;
  licenceApplicationStatusName: string;
  tradeLicenceID: number;
  applicantName: string;
  tradeName: string;
  mobileNumber: string;
  emailID: string;
  mohID: number;
  mohName: string;
  wardID: number;
  wardName: string;
}

