/** Lower-cases a role and strips spaces, '_' and '-' (e.g. 'TRADE_OWNER' -> 'tradeowner'). */
export function normalizeRole(role: string | null | undefined): string {
  return (role ?? '').toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Dashboard each role lands on after sign-in. Mirrors the role lists of the guarded route groups
 * in app.routes.ts. Returns null for a role the UI does not map.
 */
export function getRoleHomeRoute(role: string | null | undefined): string | null {
  switch (normalizeRole(role)) {
    case 'admin':
      return '/admin';
    case 'trader':
    case 'tradeowner':
      return '/trader';
    case 'approver':
    case 'approvingofficer':
    case 'healthsupervisor':
      return '/approver';
    case 'seniorapprover':
    case 'seniorapprovingofficer':
    case 'healthofficer':
      return '/senior-approver';
    case 'zoneapprover':
    case 'zonalapprover':
    case 'medicalofficerofhealth':
      return '/zone-approver';
    default:
      return null;
  }
}

/** True for the trader / trade-owner role. */
export function isTraderRole(role: string | null | undefined): boolean {
  return getRoleHomeRoute(role) === '/trader';
}
