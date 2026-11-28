import { CommonModule } from '@angular/common';
import { Component, afterNextRender, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CORPORATION_TEMPLATES } from '../../core/config/corporation-templates.config';
import { LICENCE_DOCUMENTS, NEW_LICENCE_STEPS } from '../../core/config/licence-documents.config';
import {
  PORTAL_CONTACT,
  hasPortalContact,
  helplineHref,
} from '../../core/config/portal-contact.config';
import { PortalLink, PortalSessionService } from '../../core/services/portal-session.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home {
  private readonly session = inject(PortalSessionService);

  showDisclaimerPopup = true;
  navOpen = false;

  disclaimerTitle = 'IMPORTANT NOTICE';
  disclaimerParagraphs = [
    'It is mandatory for every establishment to obtain a valid Trade License prior to commencing or carrying on any business within the jurisdiction of the Greater Bengaluru Authority.',
    'Any establishment owner found operating a business without obtaining a duly issued Trade License from the Authority shall be liable for strict legal action in accordance with the applicable laws and regulations.',
    'All business owners are hereby directed to ensure full compliance with the prescribed guidelines to avoid penalties, prosecution, or other enforcement measures.'
  ];

  readonly isSignedIn = this.session.isSignedIn;
  readonly dashboardLink = this.session.dashboardLink;
  readonly applyLink = this.session.applyLink;
  readonly trackLink = this.session.trackLink;

  readonly quickLinks = computed<(PortalLink & { label: string })[]>(() => [
    { label: 'Apply for License', ...this.session.applyLink() },
    { label: 'Track Application', ...this.session.trackLink() },
    { label: 'My Licenses', ...this.session.myLicencesLink() },
  ]);

  /** Portal cards: a user already signed in with that role goes straight to the dashboard. */
  readonly roles = computed(() => {
    const roleHome = this.session.roleHome();
    const portal = (homes: string[], login: PortalLink): PortalLink & { cta: string } =>
      roleHome && homes.includes(roleHome)
        ? { link: roleHome, cta: 'Open Dashboard →' }
        : { ...login, cta: 'Access Portal →' };

    return [
      {
        title: 'Trader / Business Owner',
        description: 'Apply for, pay for, track and download your trade licenses online',
        icon: 'bi-building',
        color: 'bg-primary',
        ...portal(['/trader'], { link: '/login', queryParams: { mode: 'user' } }),
      },
      {
        title: 'Health Officials',
        description: 'Health Supervisors, Medical Officers of Health and Health Officers: review, inspect and approve applications',
        icon: 'bi-people',
        color: 'bg-success',
        ...portal(['/approver', '/zone-approver', '/senior-approver'], { link: '/login' }),
      },
      {
        title: 'Portal Administrator',
        description: 'Manage users, master data and monitor the system',
        icon: 'bi-shield-lock',
        color: 'bg-dark',
        ...portal(['/admin'], { link: '/login' }),
      },
    ];
  });

  readonly features = [
    {
      icon: 'bi-file-earmark-text',
      title: 'Apply for New License',
      description: 'Submit applications online with document upload and instant acknowledgement'
    },
    {
      icon: 'bi-patch-check',
      title: 'Licence Certificate',
      description: 'Download your licence certificate as a PDF as soon as the application is approved'
    },
    {
      icon: 'bi-geo-alt',
      title: 'Track Application',
      description: 'Status updates, SMS alerts and the complete history of every application'
    },
    {
      icon: 'bi-credit-card',
      title: 'Online Payments',
      description: 'Pay license fees through the secure online payment gateway with instant acknowledgement'
    }
  ];

  /** Facts taken from the portal's own configuration (no estimated or marketing figures). */
  readonly stats = [
    { value: String(CORPORATION_TEMPLATES.length), label: 'City Corporations Served' },
    { value: String(NEW_LICENCE_STEPS.length), label: 'Step Online Application' },
    { value: String(LICENCE_DOCUMENTS.filter((d) => d.required).length), label: 'Mandatory Documents' },
    { value: '24/7', label: 'Online Access' },
  ];

  readonly contact = PORTAL_CONTACT;
  readonly hasContact = hasPortalContact(PORTAL_CONTACT);
  readonly helplineHref = helplineHref;

  readonly footer = {
    brand: {
      title: 'GBA Trade License',
      subtitle: 'Greater Bengaluru Authority',
      description: 'Official trade licensing portal serving businesses across Greater Bengaluru.',
      icon: 'bi-building'
    },
    resources: [
      { label: 'User Guide', link: '/support', fragment: 'guide' },
      { label: 'FAQs', link: '/support', fragment: 'faq' },
      { label: 'Required Documents', link: '/support', fragment: 'documents' },
      { label: 'Contact Us', link: '/support', fragment: 'contact' }
    ] as (PortalLink & { label: string })[],
    copyright: `© ${new Date().getFullYear()} Greater Bengaluru Authority. All rights reserved.`
  };

  officialBadge = {
    text: 'Official Portal of Greater Bengaluru Authority',
    icon: 'bi-check-circle-fill'
  };

  constructor() {
    afterNextRender(() => this.session.refresh());
  }

  get disclaimerMarqueeText(): string {
    return `${this.disclaimerTitle}: ${this.disclaimerParagraphs.join(' ')}`;
  }

  closeDisclaimerPopup(): void {
    this.showDisclaimerPopup = false;
  }

  toggleNav(): void {
    this.navOpen = !this.navOpen;
  }

  closeNav(): void {
    this.navOpen = false;
  }

  signOut(): void {
    this.session.signOut();
    this.closeNav();
  }
}
