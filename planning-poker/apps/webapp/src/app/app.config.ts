import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideZard } from "./shared/core";
import { getApp, initializeApp, provideFirebaseApp } from "@angular/fire/app";
import {getDatabase, provideDatabase} from "@angular/fire/database";
import { initializeAppCheck, provideAppCheck, ReCaptchaV3Provider } from "@angular/fire/app-check";
import { environment } from "../environments/environment";


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideZard(),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideDatabase(() => getDatabase()),

    provideAppCheck(() => {
      const provider = new ReCaptchaV3Provider(environment.recaptureToken);
      return initializeAppCheck(getApp(), {
        provider,
        isTokenAutoRefreshEnabled: true
      });
    })
  ],
};
