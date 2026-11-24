import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../shared/components/notification/notification.service';

interface SystemSettingsModel {
  approvalFlow: string;
  highRiskThreshold: number | null;
  requireInspection: 'yes' | 'no';
  firstAlertDays: number | null;
  secondAlertDays: number | null;
  finalAlertDays: number | null;
  escalationDays: number | null;
  escalationNotification: string;
}

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-settings.html',
  styleUrl: './system-settings.css',
})
export class SystemSettings implements OnInit {
  private readonly storageKey = 'system-settings';

  constructor(
    private readonly notificationService: NotificationService,
    @Inject(PLATFORM_ID) private readonly platformId: Object
  ) {}

  readonly defaultSettings: SystemSettingsModel = {
    approvalFlow: 'approver-senior',
    highRiskThreshold: 500000,
    requireInspection: 'yes',
    firstAlertDays: 30,
    secondAlertDays: 15,
    finalAlertDays: 5,
    escalationDays: 7,
    escalationNotification: 'email-sms'
  };

  settings: SystemSettingsModel = { ...this.defaultSettings };
  lastSavedSettings: SystemSettingsModel = { ...this.defaultSettings };
  saveMessage = '';
  hasSavedState = false;

  ngOnInit(): void {
    this.loadSettings();
  }

  saveSettings(): void {
    this.lastSavedSettings = { ...this.settings };
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    }
    this.hasSavedState = true;
    this.saveMessage = `Settings saved at ${new Date().toLocaleTimeString()}`;
    this.notificationService.show('Settings saved successfully', 'success');
  }

  resetSettings(): void {
    this.settings = this.hasSavedState
      ? { ...this.lastSavedSettings }
      : { ...this.defaultSettings };
    this.saveMessage = 'Form reset to last saved values';
  }

  restoreDefaults(): void {
    this.settings = { ...this.defaultSettings };
    this.saveMessage = 'Default values restored';
  }

  get hasUnsavedChanges(): boolean {
    return JSON.stringify(this.settings) !== JSON.stringify(this.lastSavedSettings);
  }

  private loadSettings(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.settings = { ...this.defaultSettings };
      this.lastSavedSettings = { ...this.defaultSettings };
      return;
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      this.settings = { ...this.defaultSettings };
      this.lastSavedSettings = { ...this.defaultSettings };
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SystemSettingsModel>;
      this.settings = { ...this.defaultSettings, ...parsed };
      this.lastSavedSettings = { ...this.settings };
      this.hasSavedState = true;
      this.saveMessage = 'Loaded saved settings';
    } catch {
      this.settings = { ...this.defaultSettings };
      this.lastSavedSettings = { ...this.defaultSettings };
    }
  }
}
