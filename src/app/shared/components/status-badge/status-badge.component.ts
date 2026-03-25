import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DsaBadgeComponent } from '@dsa/design-system-angular/badge';
import { ExpiryStatus } from '../../../core/models/inventory-item.model';

type DsaBadgeIntention =
  | 'neutral'
  | 'info'
  | 'danger'
  | 'success'
  | 'warning'
  | 'cat-1'
  | 'cat-2'
  | 'cat-3'
  | 'cat-4'
  | 'cat-5'
  | 'cat-6'
  | 'cat-7'
  | 'cat-8';

@Component({
  selector: 'app-status-badge',
  imports: [DsaBadgeComponent],
  template: `<dsa-badge [intention]="intention()" [text]="text()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input.required<ExpiryStatus>();

  readonly intention = computed((): DsaBadgeIntention => {
    switch (this.status()) {
      case ExpiryStatus.Expired:
        return 'danger';
      case ExpiryStatus.ExpiringSoon:
        return 'warning';
      default:
        return 'success';
    }
  });

  readonly text = computed((): string => {
    switch (this.status()) {
      case ExpiryStatus.Expired:
        return 'Abgelaufen';
      case ExpiryStatus.ExpiringSoon:
        return 'Läuft bald ab';
      default:
        return 'Frisch';
    }
  });
}

