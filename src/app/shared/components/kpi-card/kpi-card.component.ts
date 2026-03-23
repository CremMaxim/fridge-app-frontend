import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DsaIconComponent } from '@dsa/design-system-angular/icon';

export type KpiCardIntent = 'default' | 'danger' | 'warning' | 'success';

@Component({
  selector: 'app-kpi-card',
  imports: [DsaIconComponent],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<number>();
  readonly icon = input.required<string>();
  readonly intent = input<KpiCardIntent>('default');
}

