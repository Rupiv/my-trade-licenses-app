import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';

import { TradeLicenseRegistration } from './trade-license-registration';
import { isDeclaredRoute } from '../../testing/portal-test-utils';

describe('TradeLicenseRegistration', () => {
  let component: TradeLicenseRegistration;
  let fixture: ComponentFixture<TradeLicenseRegistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeLicenseRegistration],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TradeLicenseRegistration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links to the working New Application route', () => {
    fixture.detectChanges();
    const a = (fixture.nativeElement as HTMLElement).querySelector('a[href]')!;
    expect(a.getAttribute('href')).toBe('/trader/new-licenses');
    expect(isDeclaredRoute(a.getAttribute('href')!)).toBe(true);
  });
});
