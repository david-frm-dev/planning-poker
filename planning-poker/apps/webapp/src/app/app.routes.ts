import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  // Routing Setup
  { path: '', loadComponent: () => import('./views/home.component').then(m => m.HomeComponent) },
  { path: 'room/:id', loadComponent: () => import('./views/poker-room.component').then(m => m.PokerRoomComponent) },
  { path: 'playground', loadComponent: () => import('./views/playground.component').then(m => m.PlaygroundComponent) },
];
