import { CommonModule } from '@angular/common';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  CORPORATION_TEMPLATES,
  GBA_TEMPLATE_ASSETS,
} from '../../core/config/corporation-templates.config';
import {
  LICENCE_DOCUMENTS,
  LICENCE_DOCUMENT_RULES,
  NEW_LICENCE_STEPS,
} from '../../core/config/licence-documents.config';
import {
  PORTAL_CONTACT,
  hasPortalContact,
  helplineHref,
} from '../../core/config/portal-contact.config';
import { PortalLink, PortalSessionService } from '../../core/services/portal-session.service';

interface FaqItem {
  question: string;
  answer: string;
  action?: PortalLink & { label: string };
}

/**
 * Public Help & Support page: user guide, required documents, FAQs and contact details.
 * Opened from the Home page header, hero, "Need Help" card and footer (/support#guide, #documents,
 * #faq, #contact). Content is taken from the portal's own configuration and workflows.
 */
@Component({
  selector: 'app-support',
  imports: [CommonModule, RouterModule],
  templateUrl: './support.html',
  styleUrl: './support.css',
})
export class Support {
  private readonly session = inject(PortalSessionService);

  readonly isSignedIn = this.session.isSignedIn;
  readonly dashboardLink = this.session.dashboardLink;

  readonly sections = [
    { id: 'guide', label: 'User Guide', icon: 'bi-book' },
    { id: 'documents', label: 'Required Documents', icon: 'bi-file-earmark-pdf' },
    { id: 'faq', label: 'FAQs', icon: 'bi-question-circle' },
    { id: 'contact', label: 'Contact', icon: 'bi-telephone' },
  ];

  readonly applicationSteps = NEW_LICENCE_STEPS;
  readonly documents = LICENCE_DOCUMENTS;
  readonly documentRules = LICENCE_DOCUMENT_RULES;
  readonly mandatoryDocumentCount = LICENCE_DOCUMENTS.filter((d) => d.required).length;

  readonly corporations = CORPORATION_TEMPLATES.map((c) => ({ code: c.code, fullName: c.fullName }));
  readonly departmentName = GBA_TEMPLATE_ASSETS.departmentName;

  readonly contact = PORTAL_CONTACT;
  readonly hasContact = hasPortalContact(PORTAL_CONTACT);
  readonly helplineHref = helplineHref;

  /** Quick actions; targets depend on whether a trader is signed in. */
  readonly quickActions = computed<(PortalLink & { label: string; icon: string; description: string })[]>(() => [
    {
      label: 'Apply for New License',
      icon: 'bi-file-earmark-plus',
      description: this.session.isTrader() ? 'Start a new application' : 'Create an account with your mobile number',
      ...this.session.applyLink(),
    },
    {
      label: 'Track Application',
      icon: 'bi-geo-alt',
      description: 'Status and history of your applications',
      ...this.session.trackLink(),
    },
    {
      label: 'My Licenses',
      icon: 'bi-patch-check',
      description: 'Applications, payments and certificates',
      ...this.session.myLicencesLink(),
    },
  ]);

  readonly faqs = computed<FaqItem[]>(() => [
    {
      question: 'Who needs a trade licence?',
      answer:
        'Every establishment must obtain a valid Trade License before commencing or carrying on any business within the jurisdiction of the Greater Bengaluru Authority. Operating without one may lead to penalties, prosecution or other enforcement action.',
    },
    {
      question: 'How do I create an account and sign in?',
      answer:
        'Traders and business owners register with their mobile number and sign in with a one-time password (OTP) sent to it. Approving officers and administrators sign in with their username and password.',
      action: { label: 'Create account', link: '/create-account' },
    },
    {
      question: 'How is the licence fee calculated?',
      answer:
        'The fee is calculated automatically from the trades you select, the zone classification of the premises and any power / generator details. The full trade and fee summary is shown on the Preview step before you pay.',
    },
    {
      question: 'Can I save my application and pay later?',
      answer:
        'Yes. On the Preview step choose "Save & Pay Later". The application is kept under "My Licenses" in your dashboard, where "Pay Now" completes the payment.',
    },
    {
      question: 'My payment failed. What should I do?',
      answer:
        'Open "My Licenses" in your dashboard and choose "Pay Now" for that application to retry the payment.',
      action: { label: 'Open my licenses', ...this.session.traderLink('trader-licenses') },
    },
    {
      question: 'How do I know the status of my application?',
      answer:
        'Use Track Application to see the current status and the full timeline of every action taken on your application. You also receive SMS updates when the application is received and when a decision is made.',
      action: { label: 'Track application', ...this.session.trackLink() },
    },
    {
      question: 'When can I download my licence certificate?',
      answer:
        'Once the application is approved, open it in Track Application and download the licence certificate as a PDF. The payment acknowledgement is available from the same screen after a confirmed payment.',
    },
    {
      question: 'How do I renew my licence?',
      answer:
        'Online renewal is not available on this portal yet. For renewal of an existing licence, contact the Public Health Department of your city corporation (see Contact below).',
    },
    {
      question: 'My ward is shown as "not yet open for applications".',
      answer:
        'Applications are accepted only for wards that have been opened on the portal. If your ward is not open yet, contact the office of your city corporation listed under Contact below.',
    },
    {
      question: 'Which file format can I upload?',
      answer: `Documents must be uploaded as ${LICENCE_DOCUMENT_RULES.acceptedFormat} files of less than ${LICENCE_DOCUMENT_RULES.maxFileSizeMb} MB each.`,
    },
  ]);

  /** Index of the expanded FAQ (the first one starts open); null when all are collapsed. */
  readonly openFaq = signal<number | null>(0);

  constructor() {
    afterNextRender(() => this.session.refresh());
  }

  toggleFaq(index: number): void {
    this.openFaq.update((open) => (open === index ? null : index));
  }
}
