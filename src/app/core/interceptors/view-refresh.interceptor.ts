import { ApplicationRef, inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';

/**
 * The app runs zoneless (no zone.js). Components that set data inside an HTTP subscribe
 * without calling detectChanges()/markForCheck() were only redrawn on the next click
 * (e.g. Licence Applications stuck on "Loading applications...").
 *
 * After every API response / error this schedules ONE redraw in a microtask, i.e. after the
 * component's own subscribe callback has stored the data. Several responses arriving together
 * share one redraw.
 */
let refreshQueued = false;

export const viewRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const appRef = inject(ApplicationRef);

  return next(req).pipe(
    finalize(() => {
      if (refreshQueued) return;
      refreshQueued = true;
      queueMicrotask(() => {
        refreshQueued = false;
        try {
          appRef.tick();
        } catch {
          // a redraw already in progress will pick the data up
        }
      });
    })
  );
};
