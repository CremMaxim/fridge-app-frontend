export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  expiryDate: string; // yyyy-MM-dd
  createdAt: string;  // ISO datetime
}

export interface CreateItemRequest {
  name: string;
  category: string | null;
  expiryDate: string;
}

export interface UpdateItemRequest {
  name: string;
  category: string | null;
  expiryDate: string;
}

export interface ApiError {
  status: number;
  error: string;
  message?: string;
  details?: Record<string, string>;
}

export enum ExpiryStatus {
  Expired = 'expired',
  ExpiringSoon = 'expiringSoon',
  Normal = 'normal',
}

