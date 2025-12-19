import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TraderLicenses } from './trader-licenses';

describe('TraderLicenses', () => {
  let component: TraderLicenses;
  let fixture: ComponentFixture<TraderLicenses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TraderLicenses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TraderLicenses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
