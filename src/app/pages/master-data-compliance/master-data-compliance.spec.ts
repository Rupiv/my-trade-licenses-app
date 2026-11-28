import { NotificationService } from '../../shared/components/notification/notification.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MasterDataCompliance } from './master-data-compliance';
import { ensureWebStorage } from '../../testing/portal-test-utils';

describe('MasterDataCompliance', () => {
  let component: MasterDataCompliance;
  let fixture: ComponentFixture<MasterDataCompliance>;
  let http: HttpTestingController;

  beforeEach(async () => {
    ensureWebStorage();
    await TestBed.configureTestingModule({
      imports: [MasterDataCompliance],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterDataCompliance);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
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

  it('keeps the modal open on a failed save and closes + refreshes on success', () => {
    component.openModal('ZONE');
    component.zoneForm.patchValue({ zoneName: 'East' });
    component.saveModal();
    expect(component.activeModal).toBe('ZONE'); // used to close before the API answered
    http.expectOne((r) => r.method === 'POST' && r.url === '/api/api/bbmp-zones')
      .flush({ message: 'Zone name already exists' }, { status: 400, statusText: 'Bad Request' });
    expect(component.activeModal).toBe('ZONE');
    expect(component.isSaving).toBe(false);

    component.saveModal();
    http.expectOne((r) => r.method === 'POST' && r.url === '/api/api/bbmp-zones').flush('Zone inserted');
    expect(component.activeModal).toBeNull();
    expect(http.match((r) => r.method === 'GET' && r.url === '/api/api/bbmp-zones').length).toBeGreaterThan(0);
  });

  it('does not submit an empty required form', () => {
    const notify = vi.spyOn(TestBed.inject(NotificationService), 'show');
    component.openModal('TRADE_CATEGORY');
    component.saveModal();
    expect(notify).toHaveBeenCalledWith('Please fill in all required fields', 'warning');
    expect(http.match((r) => r.method === 'POST').length).toBe(0);
  });

  it('edit MOH updates that MOH by its own id and keeps its other fields', () => {
    component.selectedMLAConstituency = {
      mohID: 42, mohCode: 'M42', mohCodeOld: 'O42', mohName: 'Old', mohNativeName: 'Old-N', mohShortName: 'Old',
      zoneID: 3, constituencyID: 9, entryDate: new Date(), hoId: 7, jcId: 8, dhoId: 9, adId: 10, ddId: 11, jdId: 12
    };
    component.openModal('MLA', true);
    component.mlaForm.patchValue({ mohName: 'New name' }, { emitEvent: false });
    component.saveModal();

    // edit used to PUT /master-moh/{constituencyID} with zone/officer ids forced to 1
    const req = http.expectOne((r) => r.method === 'PUT' && r.url.startsWith('/api/api/master-moh/'));
    expect(req.request.url).toBe('/api/api/master-moh/42');
    expect(req.request.body).toMatchObject({ mohName: 'New name', mohCode: 'M42', zoneID: 3, constituencyID: 9, hoId: 7, jdId: 12 });
  });

  it('does not open an edit modal with nothing selected (it used to create a new record)', () => {
    component.openModal('ZONE_CLASSIFICATION', true);
    expect(component.activeModal).toBeNull();
  });
});
