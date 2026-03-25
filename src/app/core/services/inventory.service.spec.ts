import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { InventoryService } from './inventory.service';
import { InventoryItem } from '../models/inventory-item.model';

const BASE_URL = 'http://localhost:8080/api/v1/items';

const mockItems: InventoryItem[] = [
  {
    id: 'a1b2c3d4-0000-0000-0000-000000000001',
    name: 'Milk',
    category: 'Dairy',
    expiryDate: '2026-04-01',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'a1b2c3d4-0000-0000-0000-000000000002',
    name: 'Eggs',
    category: null,
    expiryDate: '2026-03-25',
    createdAt: '2026-03-01T10:00:00Z',
  },
];

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── getItems ──────────────────────────────────────────────────────────
  describe('getItems', () => {
    it('should GET from /api/v1/items and return an array', () => {
      let result: InventoryItem[] | undefined;
      service.getItems().subscribe(items => (result = items));

      const req = httpMock.expectOne(BASE_URL);
      expect(req.request.method).toBe('GET');
      req.flush(mockItems);

      expect(result).toEqual(mockItems);
    });

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
  });

  // ─── createItem ────────────────────────────────────────────────────────
  describe('createItem', () => {
    it('should POST to /api/v1/items and return the created item', () => {
      const payload = { name: 'Butter', category: 'Dairy', expiryDate: '2026-04-10' };
      let result: InventoryItem | undefined;
      service.createItem(payload).subscribe(item => (result = item));

      const req = httpMock.expectOne(BASE_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);

      const created: InventoryItem = {
        id: 'new-uuid',
        ...payload,
        createdAt: '2026-03-23T08:00:00Z',
      };
      req.flush(created);

      expect(result).toEqual(created);
    });
  });

  // ─── updateItem ────────────────────────────────────────────────────────
  describe('updateItem', () => {
    it('should PUT to /api/v1/items/:id and return the updated item', () => {
      const id = 'a1b2c3d4-0000-0000-0000-000000000001';
      const payload = { name: 'Butter', category: 'Dairy', expiryDate: '2026-04-10' };
      let result: InventoryItem | undefined;
      service.updateItem(id, payload).subscribe(item => (result = item));

      const req = httpMock.expectOne(`${BASE_URL}/${id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);

      const updated: InventoryItem = {
        id,
        ...payload,
        createdAt: '2026-03-23T08:00:00Z',
      };
      req.flush(updated);

      expect(result).toEqual(updated);
    });

    it('should propagate update errors as ApiError', () => {
      const id = 'a1b2c3d4-0000-0000-0000-000000000001';
      let errorResult: unknown;

      service.updateItem(id, {
        name: 'Butter',
        category: 'Dairy',
        expiryDate: '2026-04-10',
      }).subscribe({ error: e => (errorResult = e) });

      const req = httpMock.expectOne(`${BASE_URL}/${id}`);
      req.flush(
        { status: 400, error: 'Bad Request', message: 'Invalid data' },
        { status: 400, statusText: 'Bad Request' },
      );

      expect((errorResult as { status: number }).status).toBe(400);
    });
  });

  // ─── deleteItem ────────────────────────────────────────────────────────
  describe('deleteItem', () => {
    it('should DELETE /api/v1/items/:id', () => {
      const id = 'a1b2c3d4-0000-0000-0000-000000000001';
      let called = false;
      service.deleteItem(id).subscribe(() => (called = true));

      const req = httpMock.expectOne(`${BASE_URL}/${id}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(called).toBe(true);
    });

    it('should propagate 404 as ApiError', () => {
      const id = 'non-existent';
      let errorResult: unknown;
      service.deleteItem(id).subscribe({ error: e => (errorResult = e) });

      const req = httpMock.expectOne(`${BASE_URL}/${id}`);
      req.flush(
        { status: 404, error: 'Not Found', message: 'Item not found' },
        { status: 404, statusText: 'Not Found' },
      );

      expect((errorResult as { status: number }).status).toBe(404);
    });
  });
});

