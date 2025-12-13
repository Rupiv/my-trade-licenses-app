import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
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
    { value: '3 Days', label: 'Avg. Processing' }
  ];

  roles = [
    {
      title: 'Trader / Business Owner',
      description: 'Apply, renew, and manage your trade licenses online',
      icon: 'bi-building',
      link: '/trader/login',
      color: 'bg-primary'
    },
    {
      title: 'Approving Officer',
      description: 'Review applications and approve licenses',
      icon: 'bi-people',
      link: '/approver/login',
      color: 'bg-success'
    },
    {
      title: 'Portal Administrator',
      description: 'Manage users and monitor system',
      icon: 'bi-shield-lock',
      link: '/admin/login',
      color: 'bg-dark'
    },
  ];

  // ===== FOOTER DATA =====
  footer = {
    brand: {
      title: 'GBA Trade License',
      subtitle: 'Greater Bengaluru Authority',
      description:
        'Official trade licensing portal serving businesses across Greater Bengaluru.',
      icon: 'bi-building'
    },

    quickLinks: [
      { label: 'Apply for License', link: '/trader/apply' },
      { label: 'Track Application', link: '/track' },
      { label: 'Renew License', link: '/trader/renew' },
      { label: 'Fee Structure', link: '/fees' }
    ],

    resources: [
      { label: 'User Guide', link: '/help' },
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

