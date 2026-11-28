import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environment';


@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {

  private readonly platformId = inject(PLATFORM_ID);
  private isLoaded = false;

  /**
   * True once the Maps JavaScript API is available. `<google-map>` reads `google.maps` as soon as
   * it is created, so pages must not render it before this is true (e.g. on a direct link to the
   * new-licence form the page renders before the script has finished loading).
   */
  readonly loaded = signal(false);
  /** True when the script could not be loaded (offline, blocked, invalid key). */
  readonly failed = signal(false);

  loadGoogleMaps(): void {
    // The script tag can only be added in the browser; on the server (SSR) `document` does not
    // exist and touching it aborted the whole render.
    if (this.isLoaded || !isPlatformBrowser(this.platformId)) return;

    if (typeof google !== 'undefined' && google.maps) {
      this.isLoaded = true;
      this.loaded.set(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places,drawing&region=IN`;
    script.async = true;
    script.onload = () => this.loaded.set(true);
    script.onerror = () => this.failed.set(true);

    document.body.appendChild(script);

    this.isLoaded = true;
  }
}
