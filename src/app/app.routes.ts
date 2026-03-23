import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        m => m.DashboardComponent,
      ),
  },
  {
    path: 'items',
    loadComponent: () =>
      import('./features/items/items.component').then(m => m.ItemsComponent),
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./features/calendar/calendar.component').then(
        m => m.CalendarComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
