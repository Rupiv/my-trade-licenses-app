import { HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from '../../notification/notification.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ControlSheet } from './control-sheet';

describe('ControlSheet', () => {
  let component: ControlSheet;
  let fixture: ComponentFixture<ControlSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlSheet],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlSheet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the API message when the report is refused (403 for non-admin officers)', () => {
    const notify = vi.spyOn(TestBed.inject(NotificationService), 'show');
    const http = TestBed.inject(HttpTestingController);
    const req = http.match(r => r.url.includes('reports/control-sheet'))[0];
    expect(req).toBeTruthy();
    req.flush({ message: 'This report is available to administrators only.' }, { status: 403, statusText: 'Forbidden' });
    expect(notify).toHaveBeenCalledWith('This report is available to administrators only.', 'warning');
  });
});
