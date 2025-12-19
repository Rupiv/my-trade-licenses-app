import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortalAdmin } from './portal-admin';

describe('PortalAdmin', () => {
  let component: PortalAdmin;
  let fixture: ComponentFixture<PortalAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortalAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PortalAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
