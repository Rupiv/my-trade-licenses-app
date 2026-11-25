import { NotificationService } from '../../shared/components/notification/notification.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterDataCompliance } from './master-data-compliance';

describe('MasterDataCompliance', () => {
  let component: MasterDataCompliance;
  let fixture: ComponentFixture<MasterDataCompliance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterDataCompliance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterDataCompliance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reports a failed master-data save with the API message', () => {
    const notify = vi.spyOn(TestBed.inject(NotificationService), 'show');
    (component as any).showSaveError({ error: { message: 'Zone name already exists' } });
    expect(notify).toHaveBeenCalledWith('Zone name already exists', 'error');
  });

  it('never shows an HTML error page as the message', () => {
    const notify = vi.spyOn(TestBed.inject(NotificationService), 'show');
    (component as any).showSaveError({ error: '<html>Unauthorized Activity</html>' });
    expect(notify).toHaveBeenCalledWith('Unable to save. Please try again.', 'error');
  });
});
