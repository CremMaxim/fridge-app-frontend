import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { InventoryService } from '../../core/services/inventory.service';
import { InventoryItem } from '../../core/models/inventory-item.model';
import { ItemsComponent } from './items.component';

const mockItems: InventoryItem[] = [
  {
    id: 'id-1',
    name: 'Milk',
    category: 'Dairy',
    expiryDate: '2099-12-31',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'id-2',
    name: 'Old Cheese',
    category: 'Dairy',
    expiryDate: '2020-01-01',
    createdAt: '2026-03-01T10:00:00Z',
  },
];

function createServiceSpy() {
  return {
    getItems: vi.fn(() => of(mockItems)),
    createItem: vi.fn(),
    deleteItem: vi.fn(),
  };
}

describe('ItemsComponent', () => {
  let fixture: ComponentFixture<ItemsComponent>;
  let component: ItemsComponent;
  let serviceSpy: ReturnType<typeof createServiceSpy>;

  beforeEach(async () => {
    serviceSpy = createServiceSpy();
    await TestBed.configureTestingModule({
      imports: [ItemsComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService, useValue: serviceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load items on init', () => {
    expect(serviceSpy.getItems).toHaveBeenCalledOnce();
    expect(component.items()).toEqual(mockItems);
    expect(component.loading()).toBe(false);
  });

  it('should sort items by expiry date ascending', () => {
    const sorted = component.sortedItems();
    expect(sorted[0].expiryDate <= sorted[1].expiryDate).toBe(true);
  });

  it('should set loading=false and errorMsg on getItems error', async () => {
    serviceSpy.getItems.mockReturnValue(throwError(() => ({ status: 500, error: 'Server Error' })));
    component['loadItems']();
    // Wait for the observable to settle
    await fixture.whenStable();
    expect(component.loading()).toBe(false);
    expect(component.errorMsg()).not.toBeNull();
  });

  it('should open create dialog and reset form', () => {
    component.openCreateDialog();
    expect(component.showCreateDialog()).toBe(true);
    expect(component.createForm.value.name).toBeNull();
  });

  it('should close create dialog', () => {
    component.showCreateDialog.set(true);
    component.closeCreateDialog();
    expect(component.showCreateDialog()).toBe(false);
  });

  it('should set itemToDelete on confirmDelete', () => {
    component.confirmDelete(mockItems[0]);
    expect(component.itemToDelete()).toEqual(mockItems[0]);
  });

  it('should clear itemToDelete on cancelDelete', () => {
    component.itemToDelete.set(mockItems[0]);
    component.cancelDelete();
    expect(component.itemToDelete()).toBeNull();
  });

  it('should call deleteItem and remove item from list on submitDelete', () => {
    serviceSpy.deleteItem.mockReturnValue(of(void 0));
    component.items.set([...mockItems]);
    component.itemToDelete.set(mockItems[0]);
    component.submitDelete();
    expect(serviceSpy.deleteItem).toHaveBeenCalledWith(mockItems[0].id);
    expect(component.items().find(i => i.id === mockItems[0].id)).toBeUndefined();
  });

  it('should not submit create form when invalid', () => {
    serviceSpy.createItem.mockReturnValue(of(mockItems[0]));
    component.createForm.reset(); // empty = invalid
    component.submitCreate();
    expect(serviceSpy.createItem).not.toHaveBeenCalled();
  });
});

