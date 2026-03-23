import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { DsaButtonComponent } from '@dsa/design-system-angular/button';
import { DsaIconComponent } from '@dsa/design-system-angular/icon';
import { DsaSpinnerComponent } from '@dsa/design-system-angular/spinner';

import { InventoryItem, ExpiryStatus } from '../../core/models/inventory-item.model';
import { InventoryService } from '../../core/services/inventory.service';
import { getExpiryStatus } from '../../core/utils/date.utils';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';

interface CategoryStat {
  name: string;
  count: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, KpiCardComponent, DsaButtonComponent, DsaIconComponent, DsaSpinnerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);

  readonly items = signal<InventoryItem[]>([]);
  readonly loading = signal(true);
  readonly errorMsg = signal<string | null>(null);

  readonly totalItems = computed(() => this.items().length);

  readonly expiredCount = computed(
    () => this.items().filter(i => getExpiryStatus(i.expiryDate) === ExpiryStatus.Expired).length,
  );

  readonly expiringSoonCount = computed(
    () => this.items().filter(i => getExpiryStatus(i.expiryDate) === ExpiryStatus.ExpiringSoon).length,
  );

  readonly freshCount = computed(
    () => this.items().filter(i => getExpiryStatus(i.expiryDate) === ExpiryStatus.Normal).length,
  );

  readonly categoryStats = computed((): CategoryStat[] => {
    const map = new Map<string, number>();
    this.items().forEach(item => {
      const cat = item.category ?? 'Uncategorized';
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  ngOnInit(): void {
    this.inventoryService.getItems().subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Could not load inventory. Make sure the backend is running on localhost:8080.');
        this.loading.set(false);
      },
    });
  }
}

