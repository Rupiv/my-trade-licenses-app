import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BusinessOwner } from './business-owner';
import { ensureWebStorage, isDeclaredRoute } from '../../testing/portal-test-utils';

describe('BusinessOwner', () => {
  let component: BusinessOwner;
  let fixture: ComponentFixture<BusinessOwner>;

  beforeEach(async () => {
    ensureWebStorage();
    await TestBed.configureTestingModule({
      imports: [BusinessOwner],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusinessOwner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links only to declared routes and shows no sample licences', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).not.toContain('Sharma');
    expect(el.textContent).not.toContain('Rajesh');
    const links = Array.from(el.querySelectorAll('a[href]'));
    expect(links.length).toBe(3);
    for (const a of links) {
      expect(isDeclaredRoute(a.getAttribute('href')!)).toBe(true);
    }
  });
});
