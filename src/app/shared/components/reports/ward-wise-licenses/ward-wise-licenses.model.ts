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

/** Raw API shape: Dapper rows (keys keep the SQL column casing); summary may be null. */
export interface WardWiseLicenseResponse {
  summary: Record<string, any> | null;
  table: Record<string, any>[] | null;
}
