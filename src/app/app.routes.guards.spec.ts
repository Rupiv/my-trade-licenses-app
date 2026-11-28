import { routes } from './app.routes';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/auth.roleguard';

// Every role-specific page needs a login (and the right role); only the public pages stay open.
describe('route guards', () => {
  const byPath = (p: string) => routes.find(r => r.path === p)!;

  it.each([
    ['admin', ['admin']],
    ['trader', ['trader', 'tradeowner']],
    ['approver', ['approver', 'approvingofficer', 'healthsupervisor']],
    ['senior-approver', ['seniorapprover', 'seniorapprovingofficer', 'healthofficer']],
    ['zone-approver', ['zoneapprover', 'zonalapprover', 'medicalofficerofhealth']],
    ['approving-officer', ['approver', 'approvingofficer', 'healthsupervisor']],
    ['senior-approving-officer', ['seniorapprover', 'seniorapprovingofficer', 'healthofficer']],
    ['new-licenses', ['trader', 'tradeowner']],
    ['trader-licenses', ['trader', 'tradeowner']],
  ])('%s requires login and role %j', (path, roles) => {
    const r = byPath(path);
    expect(r.canActivate).toEqual([AuthGuard, RoleGuard]);
    expect(r.data?.['roles']).toEqual(roles);
  });

  it.each(['dashboard', 'dashboard-layout', 'renewal-status', 'approver-renewal-list', 'business-owner', 'license-registration'])(
    '%s requires login', (path) => {
      expect(byPath(path).canActivate).toContain(AuthGuard);
    });

  it.each(['', 'login', 'create-account', 'forgot-password', 'support', 'track-application'])(
    'public page "%s" stays reachable without login', (path) => {
      expect(byPath(path).canActivate ?? []).toEqual([]);
    });
});
