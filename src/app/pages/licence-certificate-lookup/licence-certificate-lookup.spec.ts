import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';

import { LicenceCertificateLookup } from './licence-certificate-lookup';

@Component({ template: '' })
class Stub {}

describe('LicenceCertificateLookup', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LicenceCertificateLookup],
      providers: [
        provideRouter([
          {
            path: 'admin',
            children: [
              { path: 'licence-certificate-lookup', component: LicenceCertificateLookup },
              { path: 'licence-certificate/:licensesApplicationId', component: Stub },
            ],
          },
          {
            path: 'trader',
            children: [
              { path: 'licence-certificate-lookup', component: LicenceCertificateLookup },
              { path: 'licence-certificate/:licensesApplicationId', component: Stub },
            ],
          },
        ]),
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
  });

  async function open(url: string): Promise<LicenceCertificateLookup> {
    const { RouterTestingHarness } = await import('@angular/router/testing');
    const harness = await RouterTestingHarness.create();
    return harness.navigateByUrl(url, LicenceCertificateLookup);
  }

  it('requires an application number', async () => {
    const lookup = await open('/trader/licence-certificate-lookup');
    lookup.applicationNumber = '   ';
    lookup.generate();
    expect(lookup.errorMessage).toBe('Please enter an application number.');
  });

  it('stays in the admin section and opens the certificate as staff', async () => {
    const lookup = await open('/admin/licence-certificate-lookup');
    lookup.applicationNumber = ' N123 ';
    lookup.generate();
    await new Promise((r) => setTimeout(r));
    expect(router.url).toBe('/admin/licence-certificate/N123?from=admin');
  });

  it('stays in the trader section for traders', async () => {
    const lookup = await open('/trader/licence-certificate-lookup');
    lookup.applicationNumber = 'N123';
    lookup.generate();
    await new Promise((r) => setTimeout(r));
    expect(router.url).toBe('/trader/licence-certificate/N123');
  });
});
