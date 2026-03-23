import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { DsaButtonComponent } from '@dsa/design-system-angular/button';
import { DsaIconButtonComponent } from '@dsa/design-system-angular/icon-button';
import { DsaIconComponent } from '@dsa/design-system-angular/icon';
import { DsaSpinnerComponent } from '@dsa/design-system-angular/spinner';
import { DsaFormFieldComponent } from '@dsa/design-system-angular/form-field';
import { DsaSelectComponent, DsaSelectItem } from '@dsa/design-system-angular/select';
import { FormsModule } from '@angular/forms';

import { InventoryItem, ExpiryStatus } from '../../core/models/inventory-item.model';
import { InventoryService } from '../../core/services/inventory.service';
import {
  getExpiryStatus,
  formatDisplayDate,
  toDateStr,
} from '../../core/utils/date.utils';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

export type QuickFilter = 'all' | 'expired' | 'soon';
export type SortOrder = 'asc' | 'desc';

export interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: InventoryItem[];
  hasExpired: boolean;
  hasExpiringSoon: boolean;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

@Component({
  selector: 'app-calendar',
  imports: [
    FormsModule,
    DsaButtonComponent,
    DsaIconButtonComponent,
    DsaIconComponent,
    DsaSpinnerComponent,
    DsaFormFieldComponent,
    DsaSelectComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);

  readonly WEEK_DAYS = WEEK_DAYS;

  readonly items = signal<InventoryItem[]>([]);
  readonly loading = signal(true);
  readonly errorMsg = signal<string | null>(null);

  // Navigation: current month/year
  private readonly today = new Date();
  readonly currentYear = signal(this.today.getFullYear());
  readonly currentMonth = signal(this.today.getMonth()); // 0-based

  // Filters
  readonly quickFilter = signal<QuickFilter>('all');
  readonly sortOrder = signal<SortOrder>('asc');
  readonly selectedCategories = signal<string[]>([]);

  // Selected day detail
  readonly selectedDay = signal<CalendarDay | null>(null);

  readonly currentMonthLabel = computed(() => {
    return new Date(this.currentYear(), this.currentMonth(), 1).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  });

  readonly availableCategories = computed((): DsaSelectItem[] => {
    const cats = new Set<string>();
    this.items().forEach(i => cats.add(i.category ?? 'Uncategorized'));
    return Array.from(cats)
      .sort()
      .map(c => ({ label: c }));
  });

  readonly filteredSortedItems = computed((): InventoryItem[] => {
    let result = this.items();
    const qf = this.quickFilter();
    if (qf === 'expired') {
      result = result.filter(i => getExpiryStatus(i.expiryDate) === ExpiryStatus.Expired);
    } else if (qf === 'soon') {
      result = result.filter(i => getExpiryStatus(i.expiryDate) === ExpiryStatus.ExpiringSoon);
    }
    const cats = this.selectedCategories();
    if (cats.length > 0) {
      result = result.filter(i => cats.includes(i.category ?? 'Uncategorized'));
    }
    const ord = this.sortOrder();
    return [...result].sort((a, b) => {
      const cmp = a.expiryDate.localeCompare(b.expiryDate);
      return ord === 'asc' ? cmp : -cmp;
    });
  });

  readonly calendarWeeks = computed((): CalendarDay[][] => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const todayStr = toDateStr(new Date());

    const itemsByDate = new Map<string, InventoryItem[]>();
    this.filteredSortedItems().forEach(item => {
      const existing = itemsByDate.get(item.expiryDate) ?? [];
      itemsByDate.set(item.expiryDate, [...existing, item]);
    });

    const firstDay = new Date(year, month, 1);
    // Make grid start on Monday: Sun=0 → offset=6, Mon=1 → offset=0, …
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);

    const days: CalendarDay[] = [];
    const cursor = new Date(gridStart);
    for (let i = 0; i < 42; i++) {
      const ds = toDateStr(cursor);
      const dayItems = itemsByDate.get(ds) ?? [];
      days.push({
        date: new Date(cursor),
        dateStr: ds,
        dayNumber: cursor.getDate(),
        isCurrentMonth: cursor.getMonth() === month,
        isToday: ds === todayStr,
        items: dayItems,
        hasExpired: dayItems.some(it => getExpiryStatus(it.expiryDate) === ExpiryStatus.Expired),
        hasExpiringSoon: dayItems.some(it => getExpiryStatus(it.expiryDate) === ExpiryStatus.ExpiringSoon),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeks: CalendarDay[][] = [];
    for (let w = 0; w < 6; w++) {
      weeks.push(days.slice(w * 7, w * 7 + 7));
    }
    return weeks;
  });

  readonly getExpiryStatus = getExpiryStatus;
  readonly formatDisplayDate = formatDisplayDate;
  readonly ExpiryStatus = ExpiryStatus;

  ngOnInit(): void {
    this.inventoryService.getItems().subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Could not load items. Make sure the backend is running on localhost:8080.');
        this.loading.set(false);
      },
    });
  }

  prevMonth(): void {
    const m = this.currentMonth();
    if (m === 0) {
      this.currentMonth.set(11);
      this.currentYear.update(y => y - 1);
    } else {
      this.currentMonth.update(v => v - 1);
    }
    this.selectedDay.set(null);
  }

  nextMonth(): void {
    const m = this.currentMonth();
    if (m === 11) {
      this.currentMonth.set(0);
      this.currentYear.update(y => y + 1);
    } else {
      this.currentMonth.update(v => v + 1);
    }
    this.selectedDay.set(null);
  }

  goToToday(): void {
    this.currentYear.set(this.today.getFullYear());
    this.currentMonth.set(this.today.getMonth());
    this.selectedDay.set(null);
  }

  setQuickFilter(filter: QuickFilter): void {
    this.quickFilter.set(filter);
    this.selectedDay.set(null);
  }

  setSortOrder(order: SortOrder): void {
    this.sortOrder.set(order);
  }

  onCategoryAdded(item: DsaSelectItem): void {
    this.selectedCategories.update(cats => [...cats, item.label]);
  }

  onCategoryRemoved(item: DsaSelectItem): void {
    this.selectedCategories.update(cats => cats.filter(c => c !== item.label));
  }

  onAllCategoriesRemoved(): void {
    this.selectedCategories.set([]);
  }

  selectDay(day: CalendarDay): void {
    if (day.items.length === 0) {
      this.selectedDay.set(null);
      return;
    }
    const current = this.selectedDay();
    this.selectedDay.set(current?.dateStr === day.dateStr ? null : day);
  }

  clearDaySelection(): void {
    this.selectedDay.set(null);
  }
}

