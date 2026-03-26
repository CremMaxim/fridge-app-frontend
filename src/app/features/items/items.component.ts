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
import { DsaCheckboxComponent } from '@dsa/design-system-angular/checkbox';
import { DsaIconComponent } from '@dsa/design-system-angular/icon';
import {
  DsaMenuButtonComponent,
  DsaMenuButtonDividerComponent,
  DsaMenuButtonItemComponent,
} from '@dsa/design-system-angular/menu-button';
import { DsaSpinnerComponent } from '@dsa/design-system-angular/spinner';
import { DsaDialogComponent, DsaDialogFooterComponent } from '@dsa/design-system-angular/dialog';
import { DsaFormFieldComponent } from '@dsa/design-system-angular/form-field';
import { DsaInputFieldComponent } from '@dsa/design-system-angular/input-field';
import { DsaTable, DsaPrimeTemplate } from '@dsa/design-system-angular/table';
import {
  DsaButtonToggleComponent,
  DsaButtonToggleGroupComponent,
} from '@dsa/design-system-angular/toggle-button-group';
import { DsaBadgeComponent } from '@dsa/design-system-angular/badge';
import { DsaToastService } from '@dsa/design-system-angular';

import {
  InventoryItem,
  ExpiryStatus,
  UpdateItemRequest,
} from '../../core/models/inventory-item.model';
import { InventoryService } from '../../core/services/inventory.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { formatDisplayDate, getExpiryStatus } from '../../core/utils/date.utils';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface Column {
  field: string;
  header: string;
  width: string;
}

type SortOption = 'expiryAsc' | 'expiryDesc';

const SKIP_EXPIRED_DELETE_CONFIRMATION_KEY = 'items.skipExpiredDeleteConfirmation';
const SKIP_SINGLE_DELETE_CONFIRMATION_KEY = 'items.skipSingleDeleteConfirmation';

@Component({
  selector: 'app-items',
  imports: [
    ReactiveFormsModule,
    DsaButtonComponent,
    DsaCheckboxComponent,
    DsaIconComponent,
    DsaMenuButtonComponent,
    DsaMenuButtonItemComponent,
    DsaMenuButtonDividerComponent,
    DsaSpinnerComponent,
    DsaDialogComponent,
    DsaDialogFooterComponent,
    DsaFormFieldComponent,
    DsaInputFieldComponent,
    DsaTable,
    DsaPrimeTemplate,
    DsaButtonToggleGroupComponent,
    DsaButtonToggleComponent,
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
  readonly editingItem = signal<InventoryItem | null>(null);
  readonly itemToDelete = signal<InventoryItem | null>(null);
  readonly showDeleteExpiredDialog = signal(false);
  readonly submitting = signal(false);
  readonly deleteExpiredSubmitting = signal(false);
  readonly searchQuery = signal('');
  readonly sortOption = signal<SortOption>('expiryAsc');
  readonly eatenItemIds = signal<string[]>([]);
  readonly skipSingleDeleteConfirmation = signal(this.readStoredBoolean(SKIP_SINGLE_DELETE_CONFIRMATION_KEY));
  readonly skipExpiredDeleteConfirmation = signal(this.readSkipExpiredDeleteConfirmation());
  readonly singleDeleteDontAskAgain = signal(this.skipSingleDeleteConfirmation());
  readonly bulkDeleteDontAskAgain = signal(this.skipExpiredDeleteConfirmation());
  readonly isEditMode = computed(() => this.editingItem() !== null);
  readonly itemDialogTitle = computed(() =>
    this.isEditMode() ? 'Artikel bearbeiten' : 'Neuen Artikel hinzufügen',
  );
  readonly itemDialogSubmitLabel = computed(() =>
    this.isEditMode() ? 'Speichern' : 'Hinzufügen',
  );

  readonly sortedItems = computed(() =>
    [...this.items()].sort((a, b) => {
      const result = a.expiryDate.localeCompare(b.expiryDate);
      return this.sortOption() === 'expiryDesc' ? result * -1 : result;
    }),
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

  readonly expiredItems = computed(() =>
    this.items().filter(item => getExpiryStatus(item.expiryDate) === ExpiryStatus.Expired),
  );

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
            this.removeItemsByIds(ids);
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
    this.editingItem.set(null);
    this.createForm.reset();
    this.showCreateDialog.set(true);
  }

  openEditDialog(item: InventoryItem): void {
    this.editingItem.set(item);
    this.createForm.reset({
      name: item.name,
      expiryDate: item.expiryDate,
      category: item.category ?? '',
    });
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
    this.editingItem.set(null);
  }

  submitItem(): void {
    if (this.createForm.invalid || this.submitting()) return;
    this.submitting.set(true);

    const { name, expiryDate, category } = this.createForm.value;
    const request: UpdateItemRequest = {
      name: name!,
      expiryDate: expiryDate!,
      category: category?.trim() || null,
    };
    const editingItem = this.editingItem();

    if (editingItem) {
      this.inventoryService.updateItem(editingItem.id, request).subscribe({
        next: updatedItem => {
          this.items.update(list =>
            list.map(item => (item.id === updatedItem.id ? updatedItem : item)),
          );
          this.submitting.set(false);
          this.showCreateDialog.set(false);
          this.editingItem.set(null);
          this.toastService.success({
            title: 'Artikel aktualisiert',
            description: `"${updatedItem.name}" wurde aktualisiert.`,
          });
        },
        error: err => {
          this.submitting.set(false);
          this.toastService.danger({
            title: 'Artikel konnte nicht aktualisiert werden',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            description: (err as { message?: string }).message ?? 'Ein unerwarteter Fehler ist aufgetreten.',
          });
        },
      });
      return;
    }

    this.inventoryService.createItem(request).subscribe({
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
    if (this.skipSingleDeleteConfirmation()) {
      this.submitDelete(item);
      return;
    }

    this.itemToDelete.set(item);
    this.singleDeleteDontAskAgain.set(this.skipSingleDeleteConfirmation());
  }

  openDeleteExpiredDialog(): void {
    if (this.deleteExpiredSubmitting() || this.expiredItems().length === 0) return;

    if (this.skipExpiredDeleteConfirmation()) {
      this.submitDeleteExpired();
      return;
    }

    this.bulkDeleteDontAskAgain.set(this.skipExpiredDeleteConfirmation());
    this.showDeleteExpiredDialog.set(true);
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

  onSortChange(value: unknown): void {
    if (value === 'expiryAsc' || value === 'expiryDesc') {
      this.sortOption.set(value);
    }
  }

  cancelDelete(): void {
    this.itemToDelete.set(null);
    this.singleDeleteDontAskAgain.set(this.skipSingleDeleteConfirmation());
  }

  cancelDeleteExpired(): void {
    if (this.deleteExpiredSubmitting()) return;
    this.showDeleteExpiredDialog.set(false);
    this.bulkDeleteDontAskAgain.set(this.skipExpiredDeleteConfirmation());
  }

  submitDelete(itemToDelete?: InventoryItem): void {
    const item = itemToDelete ?? this.itemToDelete();
    if (!item) return;

    if (!this.skipSingleDeleteConfirmation()) {
      const skipConfirmation = this.singleDeleteDontAskAgain();
      this.skipSingleDeleteConfirmation.set(skipConfirmation);
      this.persistStoredBoolean(SKIP_SINGLE_DELETE_CONFIRMATION_KEY, skipConfirmation);
    }

    this.inventoryService.deleteItem(item.id).subscribe({
      next: () => {
        this.removeItemsByIds([item.id]);
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

  submitDeleteExpired(): void {
    const expiredItems = this.expiredItems();
    if (this.deleteExpiredSubmitting() || expiredItems.length === 0) {
      return;
    }

    if (this.showDeleteExpiredDialog()) {
      const skipConfirmation = this.bulkDeleteDontAskAgain();
      this.skipExpiredDeleteConfirmation.set(skipConfirmation);
      this.persistSkipExpiredDeleteConfirmation(skipConfirmation);
    }

    const expiredIds = expiredItems.map(item => item.id);
    this.deleteExpiredSubmitting.set(true);

    forkJoin(expiredIds.map(id => this.inventoryService.deleteItem(id))).subscribe({
      next: () => {
        this.removeItemsByIds(expiredIds);
        this.showDeleteExpiredDialog.set(false);
        this.bulkDeleteDontAskAgain.set(this.skipExpiredDeleteConfirmation());
        this.deleteExpiredSubmitting.set(false);
        this.toastService.success({
          title: 'Abgelaufene Artikel entfernt',
          description:
            expiredIds.length === 1
              ? '1 abgelaufener Artikel wurde dauerhaft gelöscht.'
              : `${expiredIds.length} abgelaufene Artikel wurden dauerhaft gelöscht.`,
        });
      },
      error: err => {
        this.deleteExpiredSubmitting.set(false);
        this.toastService.danger({
          title: 'Abgelaufene Artikel konnten nicht gelöscht werden',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          description: (err as { message?: string }).message ?? 'Ein unerwarteter Fehler ist aufgetreten.',
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

  private readSkipExpiredDeleteConfirmation(): boolean {
    return this.readStoredBoolean(SKIP_EXPIRED_DELETE_CONFIRMATION_KEY);
  }

  private persistSkipExpiredDeleteConfirmation(value: boolean): void {
    this.persistStoredBoolean(SKIP_EXPIRED_DELETE_CONFIRMATION_KEY, value);
  }

  private readStoredBoolean(key: string): boolean {
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  }

  private persistStoredBoolean(key: string, value: boolean): void {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Ignore storage failures and fall back to in-memory state only.
    }
  }

  private removeItemsByIds(ids: string[]): void {
    const idsSet = new Set(ids);

    this.items.update(list => list.filter(item => !idsSet.has(item.id)));
    this.eatenItemIds.update(itemIds => itemIds.filter(id => !idsSet.has(id)));

    const remainingMockIds = this.mockDataService.activeIds().filter(id => !idsSet.has(id));
    this.mockDataService.activeIds.set(remainingMockIds);
    this.mockDataService.active.set(remainingMockIds.length > 0);
  }
}


