/**
 * Public contact details shown on the Home page footer and the Help & Support page.
 *
 * Only set a value here once it is the officially published one for the portal. An empty value is
 * hidden everywhere (no placeholder is ever shown), and the pages fall back to directing citizens to
 * the Public Health Department of their city corporation.
 */
export interface PortalContactDetails {
  /** Helpline number, e.g. '1800-425-0000'. */
  readonly helpline: string;
  /** Support e-mail address. */
  readonly email: string;
  /** Support desk working hours, e.g. 'Mon-Sat: 9:00 AM - 6:00 PM'. */
  readonly officeHours: string;
}

export const PORTAL_CONTACT: PortalContactDetails = {
  helpline: '',
  email: '',
  officeHours: '',
};

/** True when at least one contact channel is configured. */
export function hasPortalContact(contact: PortalContactDetails = PORTAL_CONTACT): boolean {
  return !!(contact.helpline.trim() || contact.email.trim());
}

/** `tel:` link for the helpline (digits and a leading + only). */
export function helplineHref(helpline: string): string {
  return `tel:${helpline.replace(/[^\d+]/g, '')}`;
}
