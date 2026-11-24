import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import {
  ApplicationView,
  ViewLicensesApplicationService,
} from '../view-licenses-application/view-licenses-application.service';
import {
  CorporationTemplateService,
  ResolvedCorporationTemplate,
} from '../../core/services/corporation-template.service';
import {
  GbaAcknowledgement,
  GbaAcknowledgementData,
} from '../../shared/components/gba-acknowledgement/gba-acknowledgement';
import {
  AcknowledgementBlocker,
  acknowledgementBlocker,
  buildAcknowledgementData,
  findSuccessfulPayment,
} from '../../shared/utils/gba-document.mapper';
import { downloadBlob, renderElementToPdfBlob, safeFileToken } from '../../shared/utils/dom-pdf.util';
import { NotificationService } from '../../shared/components/notification/notification.service';

const BLOCKER_MESSAGES: Record<AcknowledgementBlocker | 'no-template', string> = {
  'not-submitted': 'The acknowledgement is available once the application has been submitted.',
  'awaiting-submission':
    'Payment was received but the application has not been submitted yet. Complete the submission from the application page.',
  'no-successful-payment':
    'No successful payment was found for this application. The acknowledgement is issued only after the payment gateway confirms the payment.',
  'no-gba-corporation': 'The payment acknowledgement is available only for applications under a GBA corporation.',
  'no-template': 'No acknowledgement template is configured for this corporation.',
};

/**
 * Corporation-specific payment acknowledgement (page 2 of the corporation PDF).
 *
 * Route: <section>/licence-acknowledgement/:licenceApplicationId
 *   - default: the SUBMITTED application id (officer screens, Track Application)
 *   - ?source=draft: the draft (Licence_Application_Temp) id used by the trader's View page
 *
 * Rendered only for a submitted application with a gateway-confirmed (SUCCESS) payment.
 */
@Component({
  selector: 'app-licence-acknowledgement',
  imports: [CommonModule, GbaAcknowledgement],
  templateUrl: './licence-acknowledgement.html',
  styleUrl: './licence-acknowledgement.css',
  encapsulation: ViewEncapsulation.None,
})
export class LicenceAcknowledgement implements OnInit {
  loading = true;
  downloading = false;
  errorMessage = '';
  template: ResolvedCorporationTemplate | null = null;
  data: GbaAcknowledgementData | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly location: Location,
    private readonly viewService: ViewLicensesApplicationService,
    private readonly corporationTemplates: CorporationTemplateService,
    private readonly notificationService: NotificationService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('licenceApplicationId'));
    if (!Number.isFinite(id) || id <= 0) {
      this.fail('Invalid application id.');
      return;
    }

    const isDraftId = this.route.snapshot.queryParamMap.get('source') === 'draft';
    const view$: Observable<ApplicationView> = isDraftId
      ? this.viewService.getApplication(id)
      : this.viewService.getSubmittedApplication(id);

    view$.pipe(timeout(15000)).subscribe({
      next: (view) => this.onViewLoaded(view),
      error: () => this.fail('Unable to load the application details.'),
    });
  }

  private onViewLoaded(view: ApplicationView): void {
    const blocker = acknowledgementBlocker(view);
    const payment = findSuccessfulPayment(view?.payments);
    if (blocker || !payment) {
      this.fail(BLOCKER_MESSAGES[blocker ?? 'no-successful-payment']);
      return;
    }

    this.corporationTemplates.resolve(view.gba?.corporationName).subscribe((template) => {
      if (!template) {
        this.fail(BLOCKER_MESSAGES['no-template']);
        return;
      }
      this.template = template;
      this.data = buildAcknowledgementData(view, payment);
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  private fail(message: string): void {
    this.errorMessage = message;
    this.loading = false;
    this.cdr.markForCheck();
  }

  goBack(): void {
    this.location.back();
  }

  print(): void {
    document.body.classList.add('is-printing');
    setTimeout(() => window.print(), 0);
  }

  @HostListener('window:afterprint')
  onAfterPrint(): void {
    document.body.classList.remove('is-printing');
  }

  async download(): Promise<void> {
    const target = document.querySelector('.licence-ack-page .acknowledgement') as HTMLElement | null;
    if (!target || !this.data) {
      return;
    }
    this.downloading = true;
    try {
      const blob = await renderElementToPdfBlob(target, 'download');
      const token = safeFileToken(this.data.applicationReferenceNumber, 'acknowledgement');
      downloadBlob(blob, `Acknowledgement_${token}.pdf`);
    } catch (error) {
      console.error('Failed to generate acknowledgement pdf', error);
      this.notificationService.show('Failed to download acknowledgement PDF.', 'error');
    } finally {
      this.downloading = false;
      this.cdr.markForCheck();
    }
  }
}
