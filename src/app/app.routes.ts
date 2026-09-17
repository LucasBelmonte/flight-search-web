import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Buscar passagens · Flight Search',
    loadComponent: () => import('./features/search/search-page').then((m) => m.SearchPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
