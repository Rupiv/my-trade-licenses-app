import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RevenueCollection } from './revenue-collection';

describe('RevenueCollection', () => {
  let component: RevenueCollection;
  let fixture: ComponentFixture<RevenueCollection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevenueCollection],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RevenueCollection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
