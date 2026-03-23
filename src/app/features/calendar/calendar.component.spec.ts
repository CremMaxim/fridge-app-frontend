import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { InventoryService } from '../../core/services/inventory.service';
import { InventoryItem, ExpiryStatus } from '../../core/models/inventory-item.model';
import { CalendarComponent } from './calendar.component';
import { toDateStr } from '../../core/utils/date.utils';

const today = toDateStr(new Date());

// Build dates relative to today for deterministic status
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

const mockItems: InventoryItem[] = [
  { id: '1', name: 'Expired Yogurt', category: 'Dairy', expiryDate: '2020-01-01', createdAt: '' },
  { id: '2', name: 'Milk', category: 'Dairy', expiryDate: addDays(3), createdAt: '' },
  { id: '3', name: 'Chicken', category: 'Meat', expiryDate: addDays(30), createdAt: '' },
  { id: '4', name: 'Beer', category: null, expiryDate: addDays(60), createdAt: '' },
];

function createServiceSpy() {
  return {
    getItems: vi.fn(() => of(mockItems)),
    createItem: vi.fn(),
    deleteItem: vi.fn(),
  };
}

describe('CalendarComponent', () => {
  let fixture: ComponentFixture<CalendarComponent>;
  let component: CalendarComponent;

  beforeEach(async () => {
    const serviceSpy = createServiceSpy();
    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        provideRouter([]),
        { provide: InventoryService, useValue: serviceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load all items by default', () => {
    expect(component.items()).toHaveLength(mockItems.length);
  });

  it('should filter to only expired items with "expired" quick filter', () => {
    component.setQuickFilter('expired');
    const result = component.filteredSortedItems();
    expect(result.every(i => i.expiryDate < today)).toBe(true);
  });

  it('should filter to only expiring-soon items with "soon" quick filter', () => {
    component.setQuickFilter('soon');
    const result = component.filteredSortedItems();
    result.forEach(i => {
      const d = new Date(i.expiryDate);
      const diff = Math.floor((d.getTime() - new Date().setHours(0,0,0,0)) / 86400000);
      expect(diff).toBeGreaterThanOrEqual(0);
      expect(diff).toBeLessThanOrEqual(7);
    });
  });

  it('should filter by category', () => {
    component.onCategoryAdded({ label: 'Dairy' });
    const result = component.filteredSortedItems();
    expect(result.every(i => i.category === 'Dairy')).toBe(true);
  });

  it('should clear category filter on allSelectionsRemoved', () => {
    component.onCategoryAdded({ label: 'Dairy' });
    component.onAllCategoriesRemoved();
    expect(component.selectedCategories()).toHaveLength(0);
  });

  it('should sort ascending by default', () => {
    component.setQuickFilter('all');
    const result = component.filteredSortedItems();
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].expiryDate <= result[i].expiryDate).toBe(true);
    }
  });

  it('should sort descending when order is desc', () => {
    component.setSortOrder('desc');
    const result = component.filteredSortedItems();
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].expiryDate >= result[i].expiryDate).toBe(true);
    }
  });

  it('should generate 6 weeks (42 days) for the calendar', () => {
    const weeks = component.calendarWeeks();
    expect(weeks).toHaveLength(6);
    weeks.forEach(w => expect(w).toHaveLength(7));
  });

  it('should navigate to previous month', () => {
    const initMonth = component.currentMonth();
    const initYear = component.currentYear();
    component.prevMonth();
    if (initMonth === 0) {
      expect(component.currentMonth()).toBe(11);
      expect(component.currentYear()).toBe(initYear - 1);
    } else {
      expect(component.currentMonth()).toBe(initMonth - 1);
    }
  });

  it('should navigate to next month', () => {
    const initMonth = component.currentMonth();
    const initYear = component.currentYear();
    component.nextMonth();
    if (initMonth === 11) {
      expect(component.currentMonth()).toBe(0);
      expect(component.currentYear()).toBe(initYear + 1);
    } else {
      expect(component.currentMonth()).toBe(initMonth + 1);
    }
  });

  it('should select a day that has items', () => {
    const weeks = component.calendarWeeks();
    const dayWithItems = weeks.flat().find(d => d.items.length > 0);
    if (dayWithItems) {
      component.selectDay(dayWithItems);
      expect(component.selectedDay()?.dateStr).toBe(dayWithItems.dateStr);
    }
  });

  it('should deselect when clicking the same day again', () => {
    const weeks = component.calendarWeeks();
    const dayWithItems = weeks.flat().find(d => d.items.length > 0);
    if (dayWithItems) {
      component.selectDay(dayWithItems);
      component.selectDay(dayWithItems);
      expect(component.selectedDay()).toBeNull();
    }
  });
});

