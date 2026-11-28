export interface RevenueSummary {
  TotalDemand: number;
  TotalCollected: number;
  PendingAmount: number;
  TotalTransactions: number;
}

export interface CorporationSummary {
  CorporationId: number;
  Demand: number;
  Collected: number;
  Pending: number;
  CollectionPercent: number;
}

/** Raw API shape: Dapper rows (keys keep the SQL column casing); summary may be null. */
export interface RevenueCollectionResponse {
  summary: Record<string, any> | null;
  corporationSummary: Record<string, any>[] | null;
}

export interface RevenueCollectionQuery {
  corporationId?: number | null;
  /** yyyy-MM-dd */
  fromDate?: string | null;
  /** yyyy-MM-dd */
  toDate?: string | null;
}