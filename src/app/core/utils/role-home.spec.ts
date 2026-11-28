import { routes } from '../../app.routes';
import { getRoleHomeRoute, isTraderRole } from './role-home';

describe('getRoleHomeRoute', () => {
  it.each([
    ['admin', '/admin'],
    ['TRADE_OWNER', '/trader'],
    ['trader', '/trader'],
    ['Approving Officer', '/approver'],
    ['senior-approver', '/senior-approver'],
    ['zonalapprover', '/zone-approver'],
    ['Health Supervisor', '/approver'],
    ['HEALTH_OFFICER', '/senior-approver'],
    ['Medical Officer of Health', '/zone-approver'],
  ])('%s -> %s', (role, route) => {
    expect(getRoleHomeRoute(role)).toBe(route);
  });

  it('returns null for an unmapped or empty role', () => {
    expect(getRoleHomeRoute('guest')).toBeNull();
    expect(getRoleHomeRoute('')).toBeNull();
    expect(getRoleHomeRoute(undefined)).toBeNull();
  });

  // Keeps the mapping in step with the role lists of the guarded route groups.
  it('each dashboard accepts the roles that map to it', () => {
    for (const group of ['admin', 'trader', 'approver', 'senior-approver', 'zone-approver']) {
      const roles = routes.find((r) => r.path === group)!.data!['roles'] as string[];
      for (const role of roles) {
        expect(getRoleHomeRoute(role)).toBe(`/${group}`);
      }
    }
  });

  it('isTraderRole', () => {
    expect(isTraderRole('TRADE_OWNER')).toBe(true);
    expect(isTraderRole('admin')).toBe(false);
  });
});
