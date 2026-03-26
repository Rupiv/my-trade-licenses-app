import { Injectable } from '@angular/core';
import { environment } from '../../../environment';


@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {

  private isLoaded = false;

  loadGoogleMaps(): void {
    if (this.isLoaded) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places,drawing&region=IN`;
    script.async = true;

    document.body.appendChild(script);

    this.isLoaded = true;
  }
}