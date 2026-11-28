import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TrackApplication } from './track-application';

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

describe('TrackApplication', () => {
  let component: TrackApplication;
  let fixture: ComponentFixture<TrackApplication>;

  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackApplication],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrackApplication);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('asks a visitor without a session to sign in instead of showing an empty search', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(component.requiresSignIn).toBe(true);
    expect(el.textContent).toContain('Sign in to track your applications');
    expect(el.querySelector('.search-box')).toBeNull();
    const signIn = Array.from(el.querySelectorAll('a')).find((a) => a.textContent?.includes('Sign In with OTP'))!;
    expect(signIn.getAttribute('href')).toBe('/login?mode=user&returnUrl=%2Ftrader%2Ftrack-application');
  });
});
