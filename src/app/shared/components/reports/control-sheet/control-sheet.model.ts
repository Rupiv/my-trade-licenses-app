export interface ControlSheetTotals {
  Approved: number;
  Pending: number;
  Rejected: number;
  TotalApplications: number;
}

export interface StatusSummary {
  Status: string;
  ApplicationCount: number;
  Percentage: number;
}

/** Raw API shape: both parts are Dapper rows (keys keep the SQL column casing); totals may be null. */
export interface ControlSheetResponse {
  totals: Record<string, any> | null;
  statusSummary: Record<string, any>[] | null;
}
