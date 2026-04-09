import { Routes } from '@angular/router';

import { AdminLayoutComponent } from './layout/admin-layout/admin-layout';

import { DashboardComponent } from './pages/dashboard/dashboard';
import { MembersComponent } from './pages/members/members';
import { ComputersComponent } from './pages/computers/computers';
import { SessionsComponent } from './pages/sessions/sessions';
import { PaymentsComponent } from './pages/payments/payments';
import { ReportsComponent } from './pages/reports/reports';

import { LoginComponent } from './pages/login/login';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  { path: 'login', component: LoginComponent },

  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'members', component: MembersComponent },
      { path: 'computers', component: ComputersComponent },
      { path: 'sessions', component: SessionsComponent },
      { path: 'payments', component: PaymentsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ]
  },

  { path: '**', redirectTo: 'login' },
];