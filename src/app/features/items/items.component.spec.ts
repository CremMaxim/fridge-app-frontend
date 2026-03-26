import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { InventoryService } from '../../core/services/inventory.service';
import { MockDataService } from '../../core/services/mock-data.service';
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
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  };
}

describe('ItemsComponent', () => {
  let fixture: ComponentFixture<ItemsComponent>;
  let component: ItemsComponent;
  let serviceSpy: ReturnType<typeof createServiceSpy>;

  beforeEach(async () => {
    localStorage.clear();
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

  it('should hide eaten items from visibleItems when no search is active', () => {
    component.items.set([...mockItems]);
    component.markAsEaten(mockItems[0]);

    expect(component.visibleItems().find(i => i.id === mockItems[0].id)).toBeUndefined();
    expect(component.filteredItems().find(i => i.id === mockItems[0].id)).toBeDefined();
  });

  it('should show eaten items again when searching', () => {
    component.items.set([...mockItems]);
    component.markAsEaten(mockItems[0]);
    component.searchQuery.set('milk');

    expect(component.visibleItems().find(i => i.id === mockItems[0].id)).toBeDefined();
  });

  it('should render one actions menu per visible item row', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('dsa-menu-button')).toHaveLength(mockItems.length);
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
    expect(component.editingItem()).toBeNull();
    expect(component.createForm.value.name).toBeNull();
  });

  it('should open edit dialog and prefill the form with the selected item', () => {
    component.openEditDialog(mockItems[0]);

    expect(component.showCreateDialog()).toBe(true);
    expect(component.editingItem()).toEqual(mockItems[0]);
    expect(component.isEditMode()).toBe(true);
    expect(component.itemDialogTitle()).toBe('Artikel bearbeiten');
    expect(component.createForm.getRawValue()).toEqual({
      name: mockItems[0].name,
      expiryDate: mockItems[0].expiryDate,
      category: mockItems[0].category,
    });
  });

  it('should close create dialog', () => {
    component.showCreateDialog.set(true);
    component.editingItem.set(mockItems[0]);
    component.closeCreateDialog();
    expect(component.showCreateDialog()).toBe(false);
    expect(component.editingItem()).toBeNull();
  });

  it('should set itemToDelete on confirmDelete', () => {
    component.confirmDelete(mockItems[0]);
    expect(component.itemToDelete()).toEqual(mockItems[0]);
  });

  it('should skip the single delete dialog when the reminder is disabled', () => {
    serviceSpy.deleteItem.mockReturnValue(of(void 0));
    component.items.set([...mockItems]);
    component.skipSingleDeleteConfirmation.set(true);

    component.confirmDelete(mockItems[0]);

    expect(serviceSpy.deleteItem).toHaveBeenCalledWith(mockItems[0].id);
    expect(component.itemToDelete()).toBeNull();
    expect(component.items().find(item => item.id === mockItems[0].id)).toBeUndefined();
  });

  it('should expose expired items for bulk deletion', () => {
    expect(component.expiredItems().map(item => item.id)).toEqual(['id-2']);
  });

  it('should open the expired delete dialog when confirmation is required', () => {
    component.items.set([...mockItems]);

    component.openDeleteExpiredDialog();

    expect(component.showDeleteExpiredDialog()).toBe(true);
    expect(serviceSpy.deleteItem).not.toHaveBeenCalled();
  });

  it('should skip the expired delete dialog when the reminder is disabled', () => {
    serviceSpy.deleteItem.mockReturnValue(of(void 0));
    component.items.set([...mockItems]);
    component.skipExpiredDeleteConfirmation.set(true);

    component.openDeleteExpiredDialog();

    expect(component.showDeleteExpiredDialog()).toBe(false);
    expect(serviceSpy.deleteItem).toHaveBeenCalledWith('id-2');
    expect(component.items().find(item => item.id === 'id-2')).toBeUndefined();
  });

  it('should clear itemToDelete on cancelDelete', () => {
    component.itemToDelete.set(mockItems[0]);
    component.skipSingleDeleteConfirmation.set(true);
    component.singleDeleteDontAskAgain.set(false);
    component.cancelDelete();
    expect(component.itemToDelete()).toBeNull();
    expect(component.singleDeleteDontAskAgain()).toBe(true);
  });

  it('should delete all expired items and persist the reminder preference on confirm', () => {
    serviceSpy.deleteItem.mockReturnValue(of(void 0));
    component.items.set([...mockItems]);
    component.showDeleteExpiredDialog.set(true);
    component.bulkDeleteDontAskAgain.set(true);

    component.submitDeleteExpired();

    expect(serviceSpy.deleteItem).toHaveBeenCalledTimes(1);
    expect(serviceSpy.deleteItem).toHaveBeenCalledWith('id-2');
    expect(component.items().find(item => item.id === 'id-2')).toBeUndefined();
    expect(component.showDeleteExpiredDialog()).toBe(false);
    expect(component.skipExpiredDeleteConfirmation()).toBe(true);
    expect(localStorage.getItem('items.skipExpiredDeleteConfirmation')).toBe('true');
  });

  it('should call deleteItem and remove item from list on submitDelete', () => {
    serviceSpy.deleteItem.mockReturnValue(of(void 0));
    component.items.set([...mockItems]);
    component.eatenItemIds.set([mockItems[0].id]);
    component.itemToDelete.set(mockItems[0]);
    component.submitDelete();
    expect(serviceSpy.deleteItem).toHaveBeenCalledWith(mockItems[0].id);
    expect(component.items().find(i => i.id === mockItems[0].id)).toBeUndefined();
    expect(component.eatenItemIds().includes(mockItems[0].id)).toBe(false);
  });

  it('should persist the single delete reminder preference on confirm', () => {
    serviceSpy.deleteItem.mockReturnValue(of(void 0));
    component.items.set([...mockItems]);
    component.itemToDelete.set(mockItems[0]);
    component.singleDeleteDontAskAgain.set(true);

    component.submitDelete();

    expect(component.skipSingleDeleteConfirmation()).toBe(true);
    expect(localStorage.getItem('items.skipSingleDeleteConfirmation')).toBe('true');
  });

  it('should update an item when submitItem is called in edit mode', () => {
    const updatedItem: InventoryItem = {
      ...mockItems[0],
      name: 'Updated Milk',
      expiryDate: '2099-11-30',
    };
    serviceSpy.updateItem.mockReturnValue(of(updatedItem));
    component.items.set([...mockItems]);
    component.openEditDialog(mockItems[0]);
    component.createForm.setValue({
      name: updatedItem.name,
      expiryDate: updatedItem.expiryDate,
      category: updatedItem.category,
    });

    component.submitItem();

    expect(serviceSpy.updateItem).toHaveBeenCalledWith(mockItems[0].id, {
      name: updatedItem.name,
      expiryDate: updatedItem.expiryDate,
      category: updatedItem.category,
    });
    expect(component.items()[0]).toEqual(updatedItem);
    expect(component.showCreateDialog()).toBe(false);
    expect(component.editingItem()).toBeNull();
  });

  it('should create an item when submitItem is called in create mode', () => {
    serviceSpy.createItem.mockReturnValue(of(mockItems[0]));
    component.openCreateDialog();
    component.createForm.setValue({
      name: mockItems[0].name,
      expiryDate: mockItems[0].expiryDate,
      category: mockItems[0].category,
    });

    component.submitItem();

    expect(serviceSpy.createItem).toHaveBeenCalledWith({
      name: mockItems[0].name,
      expiryDate: mockItems[0].expiryDate,
      category: mockItems[0].category,
    });
  });

  it('should not submit the form when invalid', () => {
    serviceSpy.createItem.mockReturnValue(of(mockItems[0]));
    component.createForm.reset();

    component.submitItem();

    expect(serviceSpy.createItem).not.toHaveBeenCalled();
    expect(serviceSpy.updateItem).not.toHaveBeenCalled();
  });

  // ── toggleMockData ────────────────────────────────────────────────────────
  describe('toggleMockData', () => {
    it('should POST all createRequests to the backend and set active=true', () => {
      const mockDataService = TestBed.inject(MockDataService);
      const createdItem: InventoryItem = {
        id: 'backend-uuid',
        name: 'Milch',
        category: 'Milchprodukte',
        expiryDate: '2026-01-01',
        createdAt: new Date().toISOString(),
      };
      serviceSpy.createItem.mockReturnValue(of(createdItem));

      component.toggleMockData();

      expect(serviceSpy.createItem).toHaveBeenCalledTimes(
        mockDataService.createRequests.length,
      );
      expect(component.isMockDataActive()).toBe(true);
      expect(mockDataService.activeIds().length).toBe(
        mockDataService.createRequests.length,
      );
    });

    it('should DELETE all tracked IDs and set active=false on second press', () => {
      const mockDataService = TestBed.inject(MockDataService);
      const trackedIds = ['uuid-1', 'uuid-2', 'uuid-3'];
      mockDataService.active.set(true);
      mockDataService.activeIds.set(trackedIds);
      serviceSpy.deleteItem.mockReturnValue(of(void 0));

      component.toggleMockData();

      expect(serviceSpy.deleteItem).toHaveBeenCalledTimes(trackedIds.length);
      trackedIds.forEach(id =>
        expect(serviceSpy.deleteItem).toHaveBeenCalledWith(id),
      );
      expect(component.isMockDataActive()).toBe(false);
      expect(mockDataService.activeIds()).toHaveLength(0);
    });

    it('should set mockDataLoading=false and show toast on create error', () => {
      serviceSpy.createItem.mockReturnValue(
        throwError(() => ({ status: 500, error: 'Server Error' })),
      );

      component.toggleMockData();

      expect(component.mockDataLoading()).toBe(false);
      expect(component.isMockDataActive()).toBe(false);
    });

    it('should not re-enter while a request is in flight', () => {
      component.mockDataLoading.set(true);
      component.toggleMockData();
      expect(serviceSpy.createItem).not.toHaveBeenCalled();
    });
  });
});

