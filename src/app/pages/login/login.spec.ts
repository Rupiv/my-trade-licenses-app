import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  async function create(queryParams: Record<string, string> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  it('should create', async () => {
    await create();
    expect(component).toBeTruthy();
  });

  it('opens the password login by default', async () => {
    await create();
    expect(component.isUserLogin).toBe(false);
  });

  it('opens the OTP (user) login for ?mode=user from the Home page trader portal', async () => {
    await create({ mode: 'user', returnUrl: '/trader/track-application' });
    expect(component.isUserLogin).toBe(true);
  });
});
