import { HttpInterceptorFn } from '@angular/common/http';

/**
 * The client data-centre firewall (gbatrade.karnataka.gov.in) blocks every HTTP PUT / DELETE and
 * answers with its own "Unauthorized Activity Has Been Detected" HTML page, so saving drafts,
 * updating and deleting failed with "Unexpected token '<' ... is not valid JSON".
 *
 * Every PUT / DELETE / PATCH to the API is therefore sent as POST with the header
 * X-HTTP-Method-Override; the API (app.UseHttpMethodOverride) restores the real method, so the
 * same endpoints and permission checks apply.
 */
const OVERRIDDEN = new Set(['PUT', 'DELETE', 'PATCH']);

export const methodOverrideInterceptor: HttpInterceptorFn = (req, next) => {
  if (!OVERRIDDEN.has(req.method) || !req.url.includes('/api/')) {
    return next(req);
  }

  return next(
    req.clone({
      method: 'POST',
      // DELETE usually has no body; POST needs one for some proxies
      body: req.body ?? {},
      setHeaders: { 'X-HTTP-Method-Override': req.method },
    })
  );
};
