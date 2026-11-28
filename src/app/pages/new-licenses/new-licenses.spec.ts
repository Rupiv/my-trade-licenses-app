import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GoogleMapsModule } from '@angular/google-maps';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NewLicenses } from './new-licenses';
import { GoogleMapsService } from '../../core/services/google-maps.service';

// The Google Maps JS API is loaded at runtime by GoogleMapsService and is not
// available under jsdom, so swap <google-map> for an inert stub.
@Component({ selector: 'google-map', template: '' })
class GoogleMapStub {
  @Input() height?: string;
  @Input() width?: string;
  @Input() center?: unknown;
  @Input() zoom?: number;
  @Output() mapInitialized = new EventEmitter<unknown>();
  @Output() mapClick = new EventEmitter<unknown>();
}

// Node >= 25 ships an experimental global `localStorage` that is undefined unless
// --localstorage-file is passed, shadowing jsdom's Storage; give the test an in-memory one.
function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    key: (i: number) => Array.from(data.keys())[i] ?? null,
    removeItem: (k: string) => { data.delete(k); },
    setItem: (k: string, v: string) => { data.set(k, String(v)); },
  };
}

describe('NewLicenses', () => {
  let component: NewLicenses;
  let fixture: ComponentFixture<NewLicenses>;

  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewLicenses],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .overrideComponent(NewLicenses, {
      remove: { imports: [GoogleMapsModule] },
      add: { imports: [GoogleMapStub] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewLicenses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // <google-map> reads google.maps on init, so it must wait for the Maps script.
  it('shows a loading placeholder until the Maps script has loaded, then renders the map', () => {
    const maps = TestBed.inject(GoogleMapsService);
    const el: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();
    expect(el.querySelector('google-map')).toBeNull();
    expect(el.textContent).toContain('Loading map...');

    maps.loaded.set(true);
    fixture.detectChanges();
    expect(el.querySelector('google-map')).not.toBeNull();
  });

  it('explains when the Maps script could not be loaded', () => {
    TestBed.inject(GoogleMapsService).failed.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The map could not be loaded');
  });

  // Existing fee rule (must match LicenceFeeCalculator on the API):
  // trade fees + max(power HP, generator HP) x 100 + 500
  it('calculates the licence fee with the existing formula', () => {
    component.tradeGrid = [
      { major: '', majorID: 1, minor: '', minorID: 1, sub: '', tradeSubID: 1, rate: 1200 },
      { major: '', majorID: 1, minor: '', minorID: 2, sub: '', tradeSubID: 2, rate: 800 },
    ] as any;
    component.powerHP = 3;
    component.generatorHP = 5;
    component.calculateFee();
    expect(component.powerFee).toBe(500);
    expect(component.licenseFee).toBe(1200 + 800 + 500 + 500);
  });

  it('sends both HP values with the draft so the API can recompute the amount', () => {
    component.powerHP = 7;
    component.generatorHP = 2.5;
    const payload = (component as any).buildDraftPayloadForUpdate();
    expect(payload.powerHP).toBe(7);
    expect(payload.generatorHP).toBe(2.5);
  });

  it('sends 0 for empty HP fields (same as the fee calculation)', () => {
    component.powerHP = null as any;
    component.generatorHP = undefined as any;
    const payload = (component as any).buildDraftPayloadForUpdate();
    expect(payload.powerHP).toBe(0);
    expect(payload.generatorHP).toBe(0);
  });

  it('lets a restored draft with trades leave the Trade step without re-picking a trade', async () => {
    component.currentStep = 2;
    component.selectedMajor = null as any;
    component.selectedMinor = null as any;
    component.selectedSub = null as any;
    component.tradeGrid = [
      { major: 'M', majorID: 1, minor: 'm', minorID: 1, sub: 's', tradeSubID: 1, rate: 100 },
    ] as any;
    await component.nextStep();
    expect(component.currentStep).toBe(3);
  });

  it('still asks for a trade when none has been added', async () => {
    component.currentStep = 2;
    component.tradeGrid = [];
    component.selectedMajor = null as any;
    await component.nextStep();
    expect(component.currentStep).toBe(2);
  });

  it('names the real payment gateway and shows no placeholder rate', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('BillDesk');
    expect(text).toContain('Easebuzz');
    expect(text).not.toContain('Rate: --');
  });
});
