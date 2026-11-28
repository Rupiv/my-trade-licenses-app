import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { UsersRoles } from './users-roles';
import { LoginMaster } from './user-roles.service';
import { ensureWebStorage, signInAs, signOutAll } from '../../testing/portal-test-utils';

describe('UsersRoles', () => {
  let component: UsersRoles;
  let fixture: ComponentFixture<UsersRoles>;
  let http: HttpTestingController;

  beforeEach(async () => {
    ensureWebStorage();
    signInAs('admin');
    await TestBed.configureTestingModule({
      imports: [UsersRoles],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersRoles);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
    signOutAll();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not load the BBMP zone list (the user API has no zone field, so it was never saved)', () => {
    expect(http.match((r) => r.url === '/api/api/bbmp-zones').length).toBe(0);
  });

  it('searches again for the same term after Clear', () => {
    vi.useFakeTimers();
    http.match(() => true);

    component.searchText = 'ravi';
    component.onSearchChange();
    vi.advanceTimersByTime(450);
    expect(http.match((r) => r.url.endsWith('/login-master/search')).length).toBe(1);

    component.clearSearch();
    http.match((r) => r.url.endsWith('/login-master'));

    component.searchText = 'ravi';
    component.onSearchChange();
    vi.advanceTimersByTime(450);
    expect(http.match((r) => r.url.endsWith('/login-master/search')).length).toBe(1);
  });

  it('deletes by the row id even when the API spells it loginId', () => {
    http.match(() => true);
    component.requestDeleteUser({ loginId: 77, login: 'clerk1' } as unknown as LoginMaster);
    expect(component.userToDeleteId).toBe(77);
    component.confirmDelete();
    const req = http.expectOne((r) => r.url.startsWith('/api/api/login-master/77'));
    expect(req.request.method).toBe('DELETE');
  });
});
