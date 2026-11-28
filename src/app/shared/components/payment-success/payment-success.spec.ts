import { NotificationService } from '../notification/notification.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PaymentSuccess } from './payment-success';

describe('PaymentSuccess', () => {
  let component: PaymentSuccess;
  let fixture: ComponentFixture<PaymentSuccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentSuccess],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentSuccess);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('tells the trader when the paid application could not be submitted automatically', () => {
    const notify = vi.spyOn(TestBed.inject(NotificationService), 'show');
    (component as any).txnId = 'GBA-TL-1-261125';
    (component as any).submissionFailed();
    expect(notify).toHaveBeenCalledTimes(1);
    const [message, type] = notify.mock.calls[0];
    expect(type).toBe('warning');
    expect(message).toContain('Complete Submission');
    expect(message).toContain('GBA-TL-1-261125');
  });

  it('only claims "submitted" once the submission succeeded', async () => {
    const render = async () => {
      fixture.componentRef.changeDetectorRef.markForCheck();
      await fixture.whenStable();
    };
    component.isLoading = false;
    component.decryptError = false;
    await render();
    const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text()).not.toContain('APPLICATION SUBMITTED SUCCESSFULLY');
    expect(text()).toContain('Submitting your application');

    (component as any).submissionFailed();
    await render();
    expect(text()).not.toContain('APPLICATION SUBMITTED SUCCESSFULLY');
    expect(text()).toContain('could not be submitted automatically');

    component.submissionError = false;
    component.submissionComplete = true;
    await render();
    expect(text()).toContain('APPLICATION SUBMITTED SUCCESSFULLY');
  });
});
