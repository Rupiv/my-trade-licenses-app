import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SystemSettings } from './system-settings';
import { ensureWebStorage } from '../../testing/portal-test-utils';

describe('SystemSettings', () => {
  let component: SystemSettings;
  let fixture: ComponentFixture<SystemSettings>;

  beforeEach(async () => {
    ensureWebStorage();
    await TestBed.configureTestingModule({
      imports: [SystemSettings],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not offer a Save that only writes to the browser (no settings API exists)', () => {
    const el: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(buttons).not.toContain('Save Settings');
    expect(el.querySelector('.alert-warning')?.textContent).toContain('Not available yet');
    expect((el.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
  });
});
