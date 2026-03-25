import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { DsaButtonComponent } from '@dsa/design-system-angular/button';
import { DsaIconButtonComponent } from '@dsa/design-system-angular/icon-button';
import { DsaIconComponent } from '@dsa/design-system-angular/icon';
import { DsaSpinnerComponent } from '@dsa/design-system-angular/spinner';
import { DsaDialogComponent, DsaDialogFooterComponent } from '@dsa/design-system-angular/dialog';
import { DsaFormFieldComponent } from '@dsa/design-system-angular/form-field';
import { DsaInputFieldComponent } from '@dsa/design-system-angular/input-field';
import { DsaTable, DsaPrimeTemplate } from '@dsa/design-system-angular/table';
import { DsaBadgeComponent } from '@dsa/design-system-angular/badge';
import { DsaToastService } from '@dsa/design-system-angular';

import { InventoryItem, ExpiryStatus } from '../../core/models/inventory-item.model';
import { InventoryService } from '../../core/services/inventory.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { formatDisplayDate, getExpiryStatus } from '../../core/utils/date.utils';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface Column {
  field: string;
  header: string;
  width: string;
}

@Component({
  selector: 'app-items',
  imports: [
    ReactiveFormsModule,
    DsaButtonComponent,
    DsaIconButtonComponent,
    DsaIconComponent,
    DsaSpinnerComponent,
    DsaDialogComponent,
    DsaDialogFooterComponent,
    DsaFormFieldComponent,
    DsaInputFieldComponent,
    DsaTable,
    DsaPrimeTemplate,
    DsaBadgeComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './items.component.html',
  styleUrl: './items.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemsComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly mockDataService = inject(MockDataService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(DsaToastService);

  /** Mirrors `MockDataService.active` – used in the template to toggle button label/style. */
  readonly isMockDataActive = this.mockDataService.active;
  /** True while the bulk create/delete HTTP calls are in flight. */
  readonly mockDataLoading = signal(false);

  readonly items = signal<InventoryItem[]>([]);
  readonly loading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly showCreateDialog = signal(false);
  readonly itemToDelete = signal<InventoryItem | null>(null);
  readonly submitting = signal(false);
  readonly searchQuery = signal('');
  readonly eatenItemIds = signal<string[]>([]);

  readonly sortedItems = computed(() =>
    [...this.items()].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)),
  );

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const eatenIds = this.eatenItemIds();
    if (!q) return this.sortedItems();
    return this.sortedItems().filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        (item.category ?? '').toLowerCase().includes(q) ||
        (q.includes('gegessen') && eatenIds.includes(item.id)),
    );
  });

  readonly visibleItems = computed(() => {
    const q = this.searchQuery().trim();
    if (q) return this.filteredItems();
    const eatenIds = this.eatenItemIds();
    return this.filteredItems().filter(item => !eatenIds.includes(item.id));
  });

  readonly columns: Column[] = [
    { field: 'name', header: 'Name', width: '30%' },
    { field: 'category', header: 'Kategorie', width: '20%' },
    { field: 'expiryDate', header: 'Ablaufdatum', width: '20%' },
    { field: 'status', header: 'Status', width: '15%' },
    { field: 'actions', header: '', width: '15%' },
  ];

  readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    expiryDate: ['', Validators.required],
    category: [''],
  });

  readonly ExpiryStatus = ExpiryStatus;

  ngOnInit(): void {
    this.loadItems();
  }

  getExpiryStatus = getExpiryStatus;
  formatDisplayDate = formatDisplayDate;

  /** Adds mock items to the local list (not persisted to backend). Removes them on second press. */
  toggleMockData(): void {
    if (this.mockDataLoading()) return;

    if (this.isMockDataActive()) {
      // ── Remove: DELETE every tracked ID from the backend ──────────────────
      this.mockDataLoading.set(true);
      const ids = this.mockDataService.activeIds();
      forkJoin(ids.map(id => this.inventoryService.deleteItem(id))).subscribe({
        next: () => {
          this.items.update(list => list.filter(i => !ids.includes(i.id)));
          this.eatenItemIds.update(eaten => eaten.filter(id => !ids.includes(id)));
          this.mockDataService.activeIds.set([]);
          this.mockDataService.active.set(false);
          this.mockDataLoading.set(false);
          this.toastService.success({
            title: 'Testdaten entfernt',
            description: `${ids.length} Testdatensätze wurden aus dem Backend gelöscht.`,
          });
        },
        error: () => {
          this.mockDataLoading.set(false);
          this.toastService.danger({
            title: 'Testdaten konnten nicht entfernt werden',
            description: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
          });
        },
      });
    } else {
      // ── Add: POST all 10 payloads to the backend ───────────────────────────
      this.mockDataLoading.set(true);
      forkJoin(
        this.mockDataService.createRequests.map(req => this.inventoryService.createItem(req)),
      ).subscribe({
        next: createdItems => {
          this.items.update(list => [...list, ...createdItems]);
          this.mockDataService.activeIds.set(createdItems.map(i => i.id));
          this.mockDataService.active.set(true);
          this.mockDataLoading.set(false);
          this.toastService.success({
            title: 'Testdaten hinzugefügt',
            description: `${createdItems.length} Testdatensätze wurden ins Backend gespeichert.`,
          });
        },
        error: () => {
          this.mockDataLoading.set(false);
          this.toastService.danger({
            title: 'Testdaten konnten nicht gespeichert werden',
            description: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
          });
        },
      });
    }
  }

  openCreateDialog(): void {
    this.createForm.reset();
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.submitting()) return;
    this.submitting.set(true);

    const { name, expiryDate, category } = this.createForm.value;
    this.inventoryService
      .createItem({
        name: name!,
        expiryDate: expiryDate!,
        category: category?.trim() || null,
      })
      .subscribe({
        next: item => {
          this.items.update(list => [...list, item]);
          this.submitting.set(false);
          this.showCreateDialog.set(false);
          this.toastService.success({
            title: 'Artikel hinzugefügt',
            description: `"${item.name}" wurde deinem Kühlschrank hinzugefügt.`,
          });
        },
        error: err => {
          this.submitting.set(false);
          this.toastService.danger({
            title: 'Artikel konnte nicht hinzugefügt werden',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            description: (err as { message?: string }).message ?? 'Ein unerwarteter Fehler ist aufgetreten.',
          });
        },
      });
  }

  confirmDelete(item: InventoryItem): void {
    this.itemToDelete.set(item);
  }

  isEaten(item: InventoryItem): boolean {
    return this.eatenItemIds().includes(item.id);
  }

  markAsEaten(item: InventoryItem): void {
    if (this.isEaten(item)) return;
    this.eatenItemIds.update(ids => [...ids, item.id]);
    this.toastService.success({
      title: 'Als gegessen markiert',
      description: `"${item.name}" wurde als gegessen markiert.`,
    });
  }

  cancelDelete(): void {
    this.itemToDelete.set(null);
  }

  submitDelete(): void {
    const item = this.itemToDelete();
    if (!item) return;

    this.inventoryService.deleteItem(item.id).subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.id !== item.id));
        this.eatenItemIds.update(ids => ids.filter(id => id !== item.id));
        this.itemToDelete.set(null);
        this.toastService.success({
          title: 'Artikel entfernt',
          description: `"${item.name}" wurde aus deinem Kühlschrank entfernt.`,
        });
      },
      error: () => {
        this.itemToDelete.set(null);
        this.toastService.danger({
          title: 'Artikel konnte nicht gelöscht werden',
          description: 'Ein unerwarteter Fehler ist aufgetreten.',
        });
      },
    });
  }

  private loadItems(): void {
    this.loading.set(true);
    this.inventoryService.getItems().subscribe({
      next: items => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set(
          'Die Artikel konnten nicht geladen werden. Stelle sicher, dass das Backend auf localhost:8080 läuft.',
        );
        this.loading.set(false);
      },
    });
  }
}


