import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

export const routes: Routes = [

  // HOME PAGE
  { path: '', component: Home },

  // APPLY NEW TRADE LICENSE
  {
    path: 'trader/apply',
    loadComponent: () =>
      import('./pages/trader/apply')
        .then(m => m.Apply)
  },

 
    {
      path: 'login',
      loadComponent: () => import('./pages/login/login')
        .then(m => m.Login)
    },
    {
      path: 'approving-officer',
      loadComponent: () => import('./pages/approving-officer/approving-officer')
        .then(m => m.ApprovingOfficer)
    },
    {
      path: 'business-owner',
      loadComponent: () => import('./pages/business-owner/business-owner')
        .then(m => m.BusinessOwner)
    },
    {
      path: 'new-licenses',
      loadComponent: () => import('./pages/new-licenses/new-licenses')
        .then(m => m.NewLicenses)
    },
    {
      path: 'portal-admin',
      loadComponent: () => import('./pages/portal-admin/portal-admin')
        .then(m => m.PortalAdmin)
    },
    {
      path: 'support',
      loadComponent: () => import('./pages/support/support')
        .then(m => m.Support)
    },
    {
      path: 'track-application',
      loadComponent: () => import('./pages/track-application/track-application')
        .then(m => m.TrackApplication)
    },
    {
      path: 'trader-licenses',
      loadComponent: () => import('./pages/trader-licenses/trader-licenses')
        .then(m => m.TraderLicenses)
    },
    { path: '**', redirectTo: '' }
];
