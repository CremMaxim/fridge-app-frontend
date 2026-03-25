import { Injectable, signal } from '@angular/core';

import { CreateItemRequest } from '../models/inventory-item.model';
import { toDateStr } from '../utils/date.utils';

/** Returns a Date offset by `days` from today. */
function addDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Provides a fixed set of demo item payloads covering every ExpiryStatus
 * (Abgelaufen, Läuft bald ab, Frisch) across four categories plus the
 * uncategorised case.
 *
 * All expiry dates are computed relative to today so the statuses are always
 * correct no matter when the app is loaded.
 *
 * After the items are created in the backend via `InventoryService.createItem()`,
 * store the returned IDs in `activeIds` so the component can bulk-delete them
 * later.
 */
@Injectable({ providedIn: 'root' })
export class MockDataService {
  /** Whether mock items are currently persisted in the backend. */
  readonly active = signal(false);

  /**
   * Backend-assigned IDs of the currently active mock items.
   * Set by the component after successful creation; cleared after deletion.
   */
  readonly activeIds = signal<string[]>([]);

  /**
   * 10 demo payloads — max 4 categories, all three expiry statuses represented.
   * Dates are recalculated each time the service is instantiated.
   */
  readonly createRequests: CreateItemRequest[];

  constructor() {
    this.createRequests = [
      // ── Abgelaufen ────────────────────────────────────────────────────────
      { name: 'Milch',          category: 'Milchprodukte',  expiryDate: toDateStr(addDays(-2)) },
      { name: 'Hähnchenbrust',  category: 'Fleisch & Fisch', expiryDate: toDateStr(addDays(-5)) },
      { name: 'Käse',           category: 'Milchprodukte',  expiryDate: toDateStr(addDays(-8)) },

      // ── Läuft bald ab (0–7 Tage) ──────────────────────────────────────────
      { name: 'Lachs',          category: 'Fleisch & Fisch', expiryDate: toDateStr(addDays(1))  },
      { name: 'Joghurt',        category: 'Milchprodukte',  expiryDate: toDateStr(addDays(4))  },
      { name: 'Äpfel',          category: 'Gemüse & Obst',  expiryDate: toDateStr(addDays(6))  },

      // ── Frisch (> 7 Tage) ─────────────────────────────────────────────────
      { name: 'Butter',         category: 'Milchprodukte',  expiryDate: toDateStr(addDays(14)) },
      { name: 'Karotten',       category: 'Gemüse & Obst',  expiryDate: toDateStr(addDays(21)) },
      { name: 'Orangensaft',    category: 'Getränke',       expiryDate: toDateStr(addDays(30)) },
      { name: 'Mineralwasser',  category: null,             expiryDate: toDateStr(addDays(90)) },
    ];
  }
}
