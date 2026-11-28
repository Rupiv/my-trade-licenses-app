import { defaultFinancialYearId, pickNumber, pickString, reportErrorMessage } from './report-masters.service';

describe('report helpers', () => {
  it('reads a column in either casing', () => {
    expect(pickNumber({ TotalDemand: 5 }, ['TotalDemand'])).toBe(5);
    expect(pickNumber({ totalDemand: 7 }, ['TotalDemand'])).toBe(7);
    expect(pickNumber({}, ['TotalDemand'])).toBe(0);
    expect(pickString({ zone: 'East' }, ['Zone'])).toBe('East');
    expect(pickString(null, ['Zone'])).toBe('');
  });

  it('defaults to the financial year in progress, else the latest id', () => {
    const years = [{ id: 1, label: '2024-2025' }, { id: 2, label: '2025-26' }, { id: 3, label: '2023-2024' }];
    expect(defaultFinancialYearId(years, new Date(2025, 10, 28))).toBe(2); // Nov 2025 -> FY 2025-26
    expect(defaultFinancialYearId(years, new Date(2025, 1, 10))).toBe(1);  // Feb 2025 -> FY 2024-25
    expect(defaultFinancialYearId(years, new Date(2030, 5, 1))).toBe(3);
    expect(defaultFinancialYearId([])).toBeNull();
  });

  it('uses the API message for refusals', () => {
    expect(reportErrorMessage({ status: 403, error: { message: 'Admins only' } })).toEqual({ message: 'Admins only', type: 'warning' });
    expect(reportErrorMessage({ status: 500 }).type).toBe('error');
  });
});
