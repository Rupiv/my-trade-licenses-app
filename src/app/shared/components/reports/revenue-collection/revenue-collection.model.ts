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

export interface RevenueCollectionResponse {
  summary: RevenueSummary;
  corporationSummary: CorporationSummary[];
}