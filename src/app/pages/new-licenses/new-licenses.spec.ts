import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewLicenses } from './new-licenses';

describe('NewLicenses', () => {
  let component: NewLicenses;
  let fixture: ComponentFixture<NewLicenses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewLicenses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewLicenses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
