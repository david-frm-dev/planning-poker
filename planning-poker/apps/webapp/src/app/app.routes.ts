import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  // Routing Setup
  { path: '', loadComponent: () => import('./views/home/home.component').then(m => m.HomeComponent) },
  { path: 'room/:id', loadComponent: () => import('./views/poker-room/poker-room.component').then(m => m.PokerRoomComponent) },
  { path: 'playground', loadComponent: () => import('./views/playground/playground.component').then(m => m.PlaygroundComponent) },
];
