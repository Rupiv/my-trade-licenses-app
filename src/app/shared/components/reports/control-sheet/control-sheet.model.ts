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

export interface ControlSheetResponse {
  totals: ControlSheetTotals;
  statusSummary: StatusSummary[];
}