import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { PortalAdmin } from './pages/portal-admin/portal-admin';
import { DashboardLayout } from './layout/dashboard-layout/dashboard-layout';
import { ReportsDashboard } from './layout/reports-dashboard/reports-dashboard';
import { UsersRoles } from './pages/users-roles/users-roles';
import { SystemSettings } from './pages/system-settings/system-settings';
import { MasterDataCompliance } from './pages/master-data-compliance/master-data-compliance';
import { TraderLicenses } from './pages/trader-licenses/trader-licenses';
import { NewLicenses } from './pages/new-licenses/new-licenses';
import { ApprovingOfficer } from './pages/approving-officer/approving-officer';
import { RenewLicense } from './pages/renew-license/renew-license';
import { RenewalStatus } from './pages/renewal-status/renewal-status';
import { TrackApplication } from './pages/track-application/track-application';
import { SeniorApprovingOfficer } from './pages/senior-approving-officer/senior-approving-officer';
import { ApprovingDashboard } from './layout/approving-dashboard/approving-dashboard';
import { SeniorapprovingDashboard } from './layout/seniorapproving-dashboard/seniorapproving-dashboard';
import { ControlSheet } from './shared/components/reports/control-sheet/control-sheet';
import { NotRenewedLicenses } from './shared/components/reports/not-renewed-licenses/not-renewed-licenses';
import { RevenueCollection } from './shared/components/reports/revenue-collection/revenue-collection';
import { WardWiseLicenses } from './shared/components/reports/ward-wise-licenses/ward-wise-licenses';
import { Inspection } from './pages/inspection/inspection';
import { ViewLicensesApplication } from './pages/view-licenses-application/view-licenses-application';
import { LicenceCertificate } from './pages/licence-certificate/licence-certificate';
import { LicenceCertificateLookup } from './pages/licence-certificate-lookup/licence-certificate-lookup';
import { AdminLicenceApplications } from './pages/admin-licence-applications/admin-licence-applications';
import { AdminLicenceApplicationDetails } from './pages/admin-licence-application-details/admin-licence-application-details';
import { PaymentSuccess } from './shared/components/payment-success/payment-success';
import { PaymentFailed } from './shared/components/payment-failed/payment-failed';
import { ZoneApprovingOfficer } from './pages/zone-approving-officer/zone-approving-officer';
import { ZoneapproverDashboard } from './layout/zoneapprover-dashboard/zoneapprover-dashboard';
import { ApplicationWiseLicenses } from './shared/components/reports/application-wise-licenses/application-wise-licenses';

export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'admin',
    component: DashboardLayout,
    children: [

      {
        path: 'workflows',
        children: [
          {
            path: 'approving-officer',
            component: ApprovingOfficer
          },
          {
            path: 'senior-approving-officer',
            component: SeniorApprovingOfficer
          },
          {
            path: 'zone-approving-officer',
            component: ZoneApprovingOfficer
          }
        ]
      },

      // DEFAULT PAGE inside dashboard
      { path: '', component: PortalAdmin },

      // OTHER PAGES
      { path: 'portal-admin', component: PortalAdmin },
      { path: 'reports', component: ReportsDashboard },
      { path: 'user-roles', component: UsersRoles },
      { path: 'system-settings', component: SystemSettings },
      { path: 'master-data-compliance', component: MasterDataCompliance },
      { path: 'licence-certificate-lookup', component: LicenceCertificateLookup },
      { path: 'licence-certificate/:licensesApplicationId', component: LicenceCertificate },
      { path: 'licence-applications', component: AdminLicenceApplications },
      { path: 'licence-applications/:licenceApplicationId', component: AdminLicenceApplicationDetails },

      // REPORT PAGES (FLAT)
      { path: 'reports/control-sheet', component: ControlSheet },
      { path: 'reports/not-renewed-licenses', component: NotRenewedLicenses },
      { path: 'reports/revenue-collection', component: RevenueCollection },
      { path: 'reports/ward-wise-licenses', component: WardWiseLicenses },
      { path: 'reports/application-wise-licenses', component: ApplicationWiseLicenses },

    ]
  },

  {
    path: 'trader',
    component: DashboardLayout,
    children: [

      // DEFAULT PAGE inside dashboard
      { path: '', component: TraderLicenses },

      // OTHER PAGES
      { path: 'trader-licenses', component: TraderLicenses },
      { path: 'new-licenses', component: NewLicenses },
      { path: 'renew-license', component: RenewLicense },
      { path: 'renewal-status', component: RenewalStatus },
      { path: 'track-application', component: TrackApplication },
      { path: 'view-licenses-application/:licensesApplicationId', component: ViewLicensesApplication },
      { path: 'licence-certificate/:licensesApplicationId', component: LicenceCertificate },
      { path: 'licence-certificate-lookup', component: LicenceCertificateLookup },
      { path: 'payment-success', component: PaymentSuccess },
      { path: 'payment-failed', component: PaymentFailed }
    ]
  },
  {
    path: 'senior-approver',
    component: DashboardLayout,
    children: [

      // DEFAULT PAGE inside dashboard
      { path: '', component: SeniorapprovingDashboard },
      { path: 'senior-approving-officer', component: SeniorApprovingOfficer },
      { path: 'reports', component: ReportsDashboard },
      { path: 'inspection/:applicationNo', component: Inspection, runGuardsAndResolvers: 'always' }

      // OTHER PAGES
    ]
  },
  {
    path: 'approver',
    component: DashboardLayout,
    children: [

      // DEFAULT PAGE inside dashboard
      { path: '', component: ApprovingDashboard },
      { path: 'approving-officer', component: ApprovingOfficer },
      { path: 'reports', component: ReportsDashboard },
      { path: 'inspection/:applicationNo', component: Inspection, runGuardsAndResolvers: 'always' }

      // OTHER PAGES
    ]
  },
  {
    path: 'zone-approver',
    component: DashboardLayout,
    children: [
      { path: '', component: ZoneapproverDashboard },
      { path: 'zone-approving-officer', component: ZoneApprovingOfficer },
      { path: 'licence-applications/:licenceApplicationId', component: AdminLicenceApplicationDetails }
    ]
  },

  // HOME PAGE
  

    //Example to implement the AuthGuard
    // {
    //   path: 'dashboard',
    //   canActivate: [AuthGuard],
    //   loadComponent: () =>
    //     import('./pages/dashboard/dashboard.component')
    //       .then(m => m.DashboardComponent)
    // }

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
    {
      path: 'dashboard',
      loadComponent: () => import('./pages/dashboard/dashboard')
        .then(m => m.Dashboard)
    },
    {
      path: 'dashboard-layout',
      loadComponent: () => import('./layout/dashboard-layout/dashboard-layout')
        .then(m => m.DashboardLayout)
    },
    {
      path: 'create-account',
      loadComponent: () => import('./pages/create-account/create-account')
        .then(m => m.CreateAccount)
    },
    {
      path: 'license-registration',
      loadComponent: () => import('./pages/trade-license-registration/trade-license-registration')
        .then(m => m.TradeLicenseRegistration)
    },
    {
      path: 'senior-approving-officer',
      loadComponent: () => import('./pages/senior-approving-officer/senior-approving-officer')
        .then(m => m.SeniorApprovingOfficer)
    },
    {
      path: 'approver-renewal-list',
      loadComponent: () => import('./pages/approver-renewal-list/approver-renewal-list')
        .then(m => m.ApproverRenewalList)
    },
    // {
    //   path: 'renew-license',
    //   loadComponent: () => import('./pages/renew-license/renew-license')
    //     .then(m => m.RenewLicense)
    // },
    {
      path: 'renewal-status',
      loadComponent: () => import('./pages/renewal-status/renewal-status')
        .then(m => m.RenewalStatus)
    },
    {
      path: 'forgot-password',
      loadComponent: () => import('./pages/forgot-password/forgot-password')
        .then(m => m.ForgotPasswordComponent)
    },
    // {
    //   path: 'user-roles',
    //   loadComponent: () => import('./pages/users-roles/users-roles')
    //     .then(m => m.UsersRoles)
    // },
    // {
    //   path: 'reports-dashboard',
    //   loadComponent: () => import('./layout/reports-dashboard/reports-dashboard')
    //     .then(m => m.ReportsDashboard)
    // },
    // {
    //   path: 'portal-admin',
    //   loadComponent: () => import('./pages/portal-admin/portal-admin')
    //     .then(m => m.PortalAdmin)
    // },
    { path: '**', redirectTo: '' }
];
