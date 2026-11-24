import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { viewRefreshInterceptor } from './core/interceptors/view-refresh.interceptor';
import { methodOverrideInterceptor } from './core/interceptors/method-override.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),

    // 👇 THIS IS THE FIX
    // viewRefreshInterceptor: redraw after each API response (app is zoneless)
    // methodOverrideInterceptor: PUT/DELETE sent as POST + X-HTTP-Method-Override (client firewall blocks PUT/DELETE)
    provideHttpClient(withInterceptors([viewRefreshInterceptor, methodOverrideInterceptor]), withInterceptorsFromDi()),

    // 👇 Register interceptor via DI
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
};
