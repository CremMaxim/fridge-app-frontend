import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  ApiError,
  CreateItemRequest,
  InventoryItem,
  UpdateItemRequest,
} from '../models/inventory-item.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/items`;

  getItems(): Observable<InventoryItem[]> {
    return this.http
      .get<InventoryItem[]>(this.baseUrl)
      .pipe(catchError(this.handleError));
  }

  createItem(request: CreateItemRequest): Observable<InventoryItem> {
    return this.http
      .post<InventoryItem>(this.baseUrl, request)
      .pipe(catchError(this.handleError));
  }

  updateItem(id: string, request: UpdateItemRequest): Observable<InventoryItem> {
    return this.http
      .put<InventoryItem>(`${this.baseUrl}/${id}`, request)
      .pipe(catchError(this.handleError));
  }

  deleteItem(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const apiError: ApiError = {
      status: err.status,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      error: (err.error as Record<string, unknown>)?.['error'] as string ?? err.statusText,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      message: (err.error as Record<string, unknown>)?.['message'] as string | undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      details: (err.error as Record<string, unknown>)?.['details'] as Record<string, string> | undefined,
    };
    return throwError(() => apiError);
  }
}

