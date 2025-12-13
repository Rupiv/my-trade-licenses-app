import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

export const routes: Routes = [

    { path: '', component: Home },

  // future routes
  //   { path: 'login', loadComponent: () => import('./pages/login/login.component')
  //     .then(m => m.LoginComponent)
  //   },
  //   { path: 'trader/apply', loadComponent: () => import('./pages/apply/apply.component')
  //     .then(m => m.ApplyComponent)
  //   },

  // fallback
  { path: '**', redirectTo: '' }
];
