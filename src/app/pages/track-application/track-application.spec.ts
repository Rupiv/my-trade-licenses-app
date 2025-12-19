import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackApplication } from './track-application';

describe('TrackApplication', () => {
  let component: TrackApplication;
  let fixture: ComponentFixture<TrackApplication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackApplication]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrackApplication);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
