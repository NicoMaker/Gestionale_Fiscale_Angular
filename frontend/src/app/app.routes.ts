import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage) },
  { path: 'clienti', loadComponent: () => import('./pages/clienti').then((m) => m.ClientiPage) },
  { path: 'scadenzario', loadComponent: () => import('./pages/scadenzario').then((m) => m.ScadenzarioPage) },
  { path: 'globale', loadComponent: () => import('./pages/globale').then((m) => m.GlobalePage) },
  { path: 'sintesi', loadComponent: () => import('./pages/sintesi').then((m) => m.SintesiPage) },
  { path: 'adempimenti', loadComponent: () => import('./pages/adempimenti').then((m) => m.AdempimentiPage) },
  { path: 'tipologie', loadComponent: () => import('./pages/tipologie').then((m) => m.TipologiePage) },
  { path: 'appunti', loadComponent: () => import('./pages/appunti').then((m) => m.AppuntiPage) },
  { path: 'note', loadComponent: () => import('./pages/note').then((m) => m.NotePage) },
  { path: 'cestino', loadComponent: () => import('./pages/cestino').then((m) => m.CestinoPage) },
  { path: 'scorciatoie', loadComponent: () => import('./pages/scorciatoie').then((m) => m.ScorciatoiePage) },
  { path: '**', redirectTo: 'dashboard' },
];
