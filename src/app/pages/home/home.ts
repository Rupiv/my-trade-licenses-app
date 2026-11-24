import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,              
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],     
})
export class Home {
  showDisclaimerPopup = true;

  disclaimerTitle = 'IMPORTANT NOTICE';
  disclaimerParagraphs = [
    'It is mandatory for every establishment to obtain a valid Trade License prior to commencing or carrying on any business within the jurisdiction of the Greater Bengaluru Authority.',
    'Any establishment owner found operating a business without obtaining a duly issued Trade License from the Authority shall be liable for strict legal action in accordance with the applicable laws and regulations.',
    'All business owners are hereby directed to ensure full compliance with the prescribed guidelines to avoid penalties, prosecution, or other enforcement measures.'
  ];

  get disclaimerMarqueeText(): string {
    return `${this.disclaimerTitle}: ${this.disclaimerParagraphs.join(' ')}`;
  }

  closeDisclaimerPopup(): void {
    this.showDisclaimerPopup = false;
  }

  features = [
    {
      icon: 'bi-file-earmark-text',
      title: 'Apply for New License',
      description: 'Submit applications online with document upload and instant acknowledgement'
    },
    {
      icon: 'bi-clock',
      title: 'Quick Renewal',
      description: 'Renew existing licenses with pre-filled data and automated reminders'
    },
    {
      icon: 'bi-geo-alt',
      title: 'Track Application',
      description: 'Real-time status updates and complete application history'
    },
    {
      icon: 'bi-credit-card',
      title: 'Online Payments',
      description: 'Secure payments via UPI, Cards, Net Banking with instant receipts'
    }
  ];

  stats = [
    { value: '50K+', label: 'Active Licenses' },
    { value: '24/7', label: 'Online Access' },
    { value: '99.5%', label: 'System Uptime' },
    { value: '30 Days', label: 'Avg. Processing' }
  ];

  roles = [
    {
      title: 'Trader / Business Owner',
      description: 'Apply, renew, and manage your trade licenses online',
      icon: 'bi-building',
      link: '/login',
      color: 'bg-primary'
    },
    {
      title: 'Approving/Senior Approving Officer',
      description: 'Review applications and approve licenses',
      icon: 'bi-people',
      link: '/login', //login also should be created
      color: 'bg-success'
    },
    {
      title: 'Portal Administrator',
      description: 'Manage users and monitor system',
      icon: 'bi-shield-lock',
      link: '/login', //login also should be created
      color: 'bg-dark'
    }
  ];

  footer = {
    brand: {
      title: 'GBA Trade License',
      subtitle: 'Greater Bengaluru Authority',
      description:
        'Official trade licensing portal serving businesses across Greater Bengaluru.',
      icon: 'bi-building'
    },

    quickLinks: [
      { label: 'Apply for License', link: '/new-licenses' },
      { label: 'Track Application', link: '/track-application' },
      { label: 'Renew License', link: '/renew-license' },
      { label: 'Fee Structure', link: '/fees' }
    ],

    resources: [
      { label: 'User Guide', link: '/support' },
      { label: 'FAQs', link: '/faq' },
      { label: 'Required Documents', link: '/documents' },
      { label: 'Contact Us', link: '/contact' }
    ],

    contact: {
      helpline: '1800-XXX-XXXX',
      email: 'support@gba.gov.in',
      timing: 'Mon-Sat: 9:00 AM - 6:00 PM'
    },

    copyright:
      '© 2024 Greater Bengaluru Authority. All rights reserved.'
  };

  officialBadge = {
    text: 'Official Portal of Greater Bengaluru Authority',
    icon: 'bi-check-circle-fill'
  };
}
