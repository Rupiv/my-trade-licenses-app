import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

/**
 * The API has no endpoint to read or store these settings, and nothing in the workflow reads
 * them. The page used to keep them in this browser's localStorage and report "Settings saved",
 * which changed nothing on the server. It now shows the options as unavailable until a backend
 * settings API exists; it never pretends to save.
 */
@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-settings.html',
  styleUrl: './system-settings.css',
})
export class SystemSettings {
  /** False until a server-side settings API exists. */
  readonly isConfigurable = false;
}
