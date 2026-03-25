# Fridge App Frontend - AI Agent Guide

## Project Overview
Angular 21 standalone component frontend for a fridge inventory tracker. Uses reactive patterns with signals, signals-based computed properties, lazy-loaded routes, and REWE Design System Angular (DSA) components.

## Tech Stack & Constraints
- **Angular:** 21.2.0 (modern standalone API - no NgModules)
- **Component Pattern:** Standalone components with `imports` array
- **Templates:** Angular built-in control flow (`@if`, `@for`) in feature templates
- **State Management:** Angular signals (`signal()`, `computed()`) for reactive updates
- **Change Detection:** `ChangeDetectionStrategy.OnPush` (required on all components)
- **HTTP:** `HttpClient` with centralized error handling in `InventoryService`
- **Forms:** Reactive Forms with `FormBuilder` and validators
- **UI Components:** REWE Design System Angular (`@dsa/design-system-angular`) - see README.md for list
- **Testing:** Vitest + jsdom for unit tests; no E2E tests yet
- **Formatting:** 2-space indentation, single quotes, Prettier `printWidth: 100` (`.editorconfig`, `.prettierrc`)
- **Tooling:** Node.js >= 20 LTS, npm >= 10; `npm install` uses the REWE Artifactory registries configured in `.npmrc` and typically requires REWE network / VPN access
- **Backend:** Dev expects REST API at `http://localhost:8080/api/v1`; production replaces this with relative `/api/v1` via `src/environments/environment*.ts`

## Architecture Patterns

### 1. Core Service Layer (`src/app/core/`)
- **`InventoryService`** (singleton via `providedIn: 'root'`): HTTP client with centralized error mapping
  - Methods: `getItems()`, `createItem(request)`, `deleteItem(id)` → all return `Observable`
  - Error handler wraps `HttpErrorResponse` into typed `ApiError` interface with `status`, `error`, `message`, `details`
  - Always use `.pipe(catchError(this.handleError))` on HTTP calls
- **`MockDataService`** (singleton via `providedIn: 'root'`): provides 10 deterministic demo `CreateItemRequest` payloads with relative expiry dates and tracks backend IDs of active mock items via signals (`active`, `activeIds`)
- **Data Models** (`inventory-item.model.ts`):
  - `InventoryItem`: id, name, category (nullable), expiryDate (yyyy-MM-dd), createdAt (ISO)
  - `ExpiryStatus` enum: Expired, ExpiringSoon, Normal
  - `CreateItemRequest`: payload for POST requests
  - `ApiError`: typed error contract from backend

### 2. Feature Components (`src/app/features/`)
All feature components:
- Use standalone API with `imports: [...]`
- Inject `InventoryService` and UI services (e.g., `DsaToastService`)
- Lazy-loaded via route with `loadComponent: () => import(...).then(m => m.ComponentName)`
- Manage local state with signals (`signal()` for reactive state, `computed()` for derived state)
- Handle subscriptions directly in methods; no subscription management needed (short-lived calls)
- Show error/loading states via signals; display toast notifications on success/error

Feature-specific patterns already in the codebase:
- **`DashboardComponent`**: Read-only overview that fetches once in `ngOnInit()` and derives KPIs/category distribution entirely via `computed()`
- **`CalendarComponent`**: Keeps selected categories and selected day in signals, uses toggleable `dsa-chip` filters, and derives `availableCategories`, `filteredSortedItems`, and a Monday-first 6×7 `calendarWeeks` grid with `computed()`
- **`ItemsComponent`**: Supports backend-persisted mock data toggling using `MockDataService` + `forkJoin` (`createItem` batch on enable, `deleteItem` batch on disable)
- Missing categories are normalized to `'Ohne Kategorie'` in dashboard/calendar derived data

**Example Pattern (from `ItemsComponent`):**
```typescript
readonly items = signal<InventoryItem[]>([]);
readonly loading = signal(true);
readonly sortedItems = computed(() => [...this.items()].sort(...));

submitCreate(): void {
  if (this.createForm.invalid || this.submitting()) return;
  this.inventoryService.createItem(payload).subscribe({
    next: item => {
      this.items.update(list => [...list, item]);
      this.toastService.success({ title: '...', description: '...' });
    },
    error: err => this.toastService.danger({ title: '...', description: '...' }),
  });
}
```

### 3. Shared Components (`src/app/shared/components/`)
Small, reusable components with minimal logic:
- **`KpiCardComponent`**: Presentational card with required signal inputs (`title`, `value`, `icon`) plus optional `intent`; used by `DashboardComponent`
- **`StatusBadgeComponent`**: Maps `ExpiryStatus` to DSA badge intention/text
  - Uses `input.required<ExpiryStatus>()` to receive data
  - Uses `computed()` to derive badge intention and display text

### 4. Date Utilities (`src/app/core/utils/date.utils.ts`)
Centralized date handling (important: uses **local timezone, not UTC**):
- `parseLocalDate(dateStr)`: Parses "yyyy-MM-dd" → Date object (midnight, local)
- `todayDate()`: Returns today at midnight (local)
- `diffDays(a, b)`: Days between dates (UTC-based to avoid DST issues)
- `getExpiryStatus(expiryDate)`: Returns ExpiryStatus enum based on days until expiry
- `isExpired(expiryDate)`: Convenience helper for expired checks
- `isExpiringSoon(expiryDate)`: Convenience helper for expiring-soon checks
- `formatDisplayDate(dateStr)`: Formats "yyyy-MM-dd" using `de-DE` locale (e.g. "23. Mar. 2026")
- `toDateStr(date)`: Formats Date → "yyyy-MM-dd"

**Important:** All date strings from backend are "yyyy-MM-dd"; always use these utilities for comparisons/display.

## Routing & Navigation
- Routes defined in `src/app/app.routes.ts` (no routing module)
- All routes lazy-loaded with `loadComponent`
- Navigation via `DsaMenuService` in root `App` component
- Menu items sync with URL via `NavigationEnd` events
- `app-shell` (DSA) provides top nav, menu sidebar, and toast notifications

## DSA Component Integration
Components are imported individually (e.g., `DsaButtonComponent` from `@dsa/design-system-angular/button`).
Common imports:
- **Shell & Navigation:** `DsaAppShellComponent`, `DsaMenuService`
- **Buttons:** `DsaButtonComponent`, `DsaIconButtonComponent`
- **Chips:** `DsaChipComponent` (toggleable category filters in calendar)
- **Icons:** `DsaIconComponent`
- **Tables:** `DsaTable`, `DsaPrimeTemplate` (PrimeNG-based)
- **Dialogs:** `DsaDialogComponent`, `DsaDialogFooterComponent`
- **Forms:** `DsaFormFieldComponent`, `DsaInputFieldComponent`
- **Feedback:** `DsaBadgeComponent`, `DsaSpinnerComponent`
- **Toasts:** `DsaToastService` (service, auto-wired to app-shell)

**Examples in this repo:**
- `ItemsComponent` uses `dsa-table` with `dsaTemplate="colgroup" | "header" | "body" | "emptymessage"` templates and signal-backed dialog visibility
- `CalendarComponent` uses toggleable `dsa-chip` controls with `(valueChange)` to keep `selectedCategories` in sync

**Styling:** DSA CSS loaded globally in `angular.json`; use DSA design tokens (CSS custom properties) for colors/spacing.

## Testing Patterns
- Test setup in `src/test-setup.ts`
- Unit tests use `Vitest` + `jsdom` + Angular `TestBed`
- `src/test-setup.ts` polyfills `window.matchMedia` and `ResizeObserver` so DSA `app-shell` and related components can render under jsdom
- **HTTP Mocking:** Use `HttpTestingController` (inject from `provideHttpClientTesting()`)
- **Service Tests:** Mock HTTP responses with `httpMock.expectOne()` + `req.flush()`
- **Component Tests:** Import standalone components directly into `TestBed`, provide `provideRouter([])` for router dependencies, and stub `InventoryService` with `vi.fn()` returning `of(...)` / `throwError(...)`
- All HTTP errors should be tested as `ApiError` type
- `calendar.component.spec.ts` currently references removed quick-filter/sort APIs; align tests to the current chip-based category filtering API before relying on that spec file as a template

**Example (from `inventory.service.spec.ts`):**
```typescript
it('should propagate error as ApiError on HTTP 400', () => {
  let errorResult: unknown;
  service.getItems().subscribe({ error: e => (errorResult = e) });
  const req = httpMock.expectOne(BASE_URL);
  req.flush(
    { status: 400, error: 'Bad Request', message: 'Invalid data' },
    { status: 400, statusText: 'Bad Request' },
  );
  expect((errorResult as { status: number }).status).toBe(400);
});
```

## File Organization
```
src/app/
  core/
    models/         ← Data contracts (InventoryItem, ExpiryStatus, ApiError)
    services/       ← InventoryService + specs
    utils/          ← Date utilities + specs
  features/
    dashboard/      ← KPI overview (signals, computed, read-only)
    items/          ← CRUD operations (signals, forms, dialogs)
    calendar/       ← Month calendar view (lazy-loaded)
  shared/
    components/     ← StatusBadgeComponent, KpiCardComponent (reusable)
  app.ts            ← Root component (app-shell + routing outlet)
  app.routes.ts     ← Lazy-loaded routes
  app.config.ts     ← Providers (HttpClient, Router, ErrorListeners)
```

## Key Commands
```bash
npm install            # Install dependencies (requires REWE Artifactory access from .npmrc)
npm start              # Serve on :4200, dev mode
npm run build          # Production build
npm run watch          # Watch build for development
npm test               # Run unit tests (Vitest)
```

## Known Limitations
- No pagination (all items loaded at once)
- No authentication/authorization
- Category input is free-text; no server category endpoint yet
- E2E tests not implemented
- Backend must run locally on :8080 (or configure in `environment.ts`)

## Common Tasks
1. **Add new feature route:** Create component in `features/`, add to `app.routes.ts` with `loadComponent`, add menu item in `App.ngOnInit()`
2. **Add service method:** Extend `InventoryService`, use `this.http.method()`, wrap with `.pipe(catchError(this.handleError))`
3. **Add component:** Use standalone API, inject services, manage signals, emit toasts on state changes
4. **Add test:** Use `HttpTestingController`, mock with `req.flush()`, verify subscription handlers
5. **Update styling:** Use DSA tokens (CSS custom properties); never add inline px/colors without design tokens

