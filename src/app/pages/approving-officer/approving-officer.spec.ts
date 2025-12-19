import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovingOfficer } from './approving-officer';

describe('ApprovingOfficer', () => {
  let component: ApprovingOfficer;
  let fixture: ComponentFixture<ApprovingOfficer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovingOfficer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApprovingOfficer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
