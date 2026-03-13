import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationWiseLicenses } from './application-wise-licenses';

describe('ApplicationWiseLicenses', () => {
  let component: ApplicationWiseLicenses;
  let fixture: ComponentFixture<ApplicationWiseLicenses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationWiseLicenses]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApplicationWiseLicenses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
