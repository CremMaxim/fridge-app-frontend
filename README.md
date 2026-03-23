# Fridge Tracker - Frontend
Angular 21 frontend for the Fridge Inventory web application.
## Prerequisites
- Node.js >= 20 LTS, npm >= 10
- Backend running on http://localhost:8080
- REWE network / VPN (for @dsa package registry)
## Install
```
npm install
```
## Start (development)
```
npm start
```
App runs at http://localhost:4200 and connects to http://localhost:8080/api/v1.
## Change backend URL
Edit src/environments/environment.ts:
```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
};
```
## Build (production)
```
npm run build
```
## Run Tests
```
npm test
```
## Project Structure
```
src/
  environments/          - Dev / prod API URL config
  app/
    core/
      models/            - InventoryItem, ApiError, ExpiryStatus
      services/          - InventoryService (HTTP client)
      utils/             - date.utils (parsing, classification)
    features/
      dashboard/         - KPI overview dashboard
      items/             - Item list, create, delete
      calendar/          - Month calendar with filter/sort
    shared/
      components/        - kpi-card, status-badge
```
## Routes
- /           -> Dashboard (KPIs + navigation)
- /items      -> Manage Items (CRUD)
- /calendar   -> Expiry Calendar (filters + day detail)
## DSA Components Used
| Feature     | DSA Component                       |
|-------------|-------------------------------------|
| Shell + nav | dsa-app-shell, DsaMenuService       |
| Buttons     | dsa-button, dsa-icon-button         |
| Table       | dsa-table                           |
| Dialogs     | dsa-dialog, dsa-dialog-footer       |
| Forms       | dsa-form-field, input[dsa-input]    |
| Category    | dsa-select (multi-select)           |
| Toast       | DsaToastService (via app-shell)     |
| Status      | dsa-badge                           |
| Icons       | dsa-icon                            |
| Loading     | dsa-spinner                         |
## Architecture Decisions
- Angular 21 standalone components with signals (signal, computed) for reactive state.
- OnPush change detection throughout for performance.
- Lazy-loaded feature routes via loadComponent.
- Centralized error mapping in InventoryService.handleError.
## Known Limitations
- No pagination (all items fetched at once).
- No authentication.
- Category input is free-text; no backend category endpoint yet.
- E2E tests not yet added.
