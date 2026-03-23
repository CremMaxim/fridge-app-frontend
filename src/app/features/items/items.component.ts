import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { DsaButtonComponent } from '@dsa/design-system-angular/button';
import { DsaIconButtonComponent } from '@dsa/design-system-angular/icon-button';
import { DsaIconComponent } from '@dsa/design-system-angular/icon';
import { DsaSpinnerComponent } from '@dsa/design-system-angular/spinner';
import { DsaDialogComponent } from '@dsa/design-system-angular/dialog';
import { DsaDialogFooterComponent } from '@dsa/design-system-angular/dialog';
import { DsaFormFieldComponent } from '@dsa/design-system-angular/form-field';
import { DsaInputFieldComponent } from '@dsa/design-system-angular/input-field';
import { DsaTable, DsaPrimeTemplate } from '@dsa/design-system-angular/table';
import { DsaToastService } from '@dsa/design-system-angular';

import { InventoryItem, ExpiryStatus } from '../../core/models/inventory-item.model';
import { InventoryService } from '../../core/services/inventory.service';
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
    StatusBadgeComponent,
  ],
  templateUrl: './items.component.html',
  styleUrl: './items.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemsComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(DsaToastService);

  readonly items = signal<InventoryItem[]>([]);
  readonly loading = signal(true);
  readonly errorMsg = signal<string | null>(null);
  readonly showCreateDialog = signal(false);
  readonly itemToDelete = signal<InventoryItem | null>(null);
  readonly submitting = signal(false);

  readonly sortedItems = computed(() =>
    [...this.items()].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)),
  );

  readonly columns: Column[] = [
    { field: 'name', header: 'Name', width: '30%' },
    { field: 'category', header: 'Category', width: '20%' },
    { field: 'expiryDate', header: 'Expiry Date', width: '20%' },
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
            title: 'Item added',
            description: `"${item.name}" was added to your fridge.`,
          });
        },
        error: err => {
          this.submitting.set(false);
          this.toastService.danger({
            title: 'Failed to add item',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            description: (err as { message?: string }).message ?? 'An unexpected error occurred.',
          });
        },
      });
  }

  confirmDelete(item: InventoryItem): void {
    this.itemToDelete.set(item);
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
        this.itemToDelete.set(null);
        this.toastService.success({
          title: 'Item removed',
          description: `"${item.name}" was removed from your fridge.`,
        });
      },
      error: () => {
        this.itemToDelete.set(null);
        this.toastService.danger({
          title: 'Failed to delete item',
          description: 'An unexpected error occurred.',
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
        this.errorMsg.set('Could not load items. Make sure the backend is running on localhost:8080.');
        this.loading.set(false);
      },
    });
  }
}



