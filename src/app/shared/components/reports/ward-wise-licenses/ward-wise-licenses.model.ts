export interface WardLicenseSummary {
  ActiveLicenses: number;
  ExpiredLicenses: number;
  SuspendedLicenses: number;
  TotalLicenses: number;
}

export interface WardLicenseTable {
  Zone: string;
  Ward: string;
  Active: number;
  Expired: number;
  Suspended: number;
  Total: number;
}

export interface WardWiseLicenseResponse {
  summary: WardLicenseSummary;
  table: WardLicenseTable[];
}