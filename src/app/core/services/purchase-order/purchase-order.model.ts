import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  PurchaseOrderCreateRequest,
  PurchaseOrderDetailApiResponse,
  PurchaseOrderIngredientOptionsApiResponse,
  PurchaseOrderSearchApiResponse,
  PurchaseOrderSearchRequest,
  PurchaseOrderStatusUpdateRequest,
  PurchaseOrderSupplierOptionsApiResponse,
  PurchaseOrderUpdateRequest,
  PurchaseOrderVoidApiResponse,
  PurchaseOrderWarehouseOptionsApiResponse,
} from '../../models/purchase-order/purchase-order.model';

@Injectable({ providedIn: 'root' })
export class PurchaseOrderService {
  private readonly http = inject(HttpClient);

  search(request: PurchaseOrderSearchRequest): Observable<PurchaseOrderSearchApiResponse> {
    return this.http.post<PurchaseOrderSearchApiResponse>('/purchase-order/search', request);
  }

  exportExcel(request: PurchaseOrderSearchRequest): Observable<Blob> {
    return this.http.post('/purchase-order/export', request, {
      responseType: 'blob',
    });
  }

  create(request: PurchaseOrderCreateRequest): Observable<PurchaseOrderDetailApiResponse> {
    return this.http.post<PurchaseOrderDetailApiResponse>('/purchase-order/create', request);
  }

  update(request: PurchaseOrderUpdateRequest): Observable<PurchaseOrderDetailApiResponse> {
    return this.http.post<PurchaseOrderDetailApiResponse>('/purchase-order/update', request);
  }

  updateStatus(
    request: PurchaseOrderStatusUpdateRequest,
  ): Observable<PurchaseOrderVoidApiResponse> {
    return this.http.post<PurchaseOrderVoidApiResponse>('/purchase-order/status', request);
  }

  getDetail(id: number): Observable<PurchaseOrderDetailApiResponse> {
    return this.http.post<PurchaseOrderDetailApiResponse>('/purchase-order/detail', { id });
  }

  delete(id: number): Observable<PurchaseOrderVoidApiResponse> {
    return this.http.post<PurchaseOrderVoidApiResponse>('/purchase-order/delete', { id });
  }

  getWarehouseOptions(): Observable<PurchaseOrderWarehouseOptionsApiResponse> {
    return this.http.post<PurchaseOrderWarehouseOptionsApiResponse>(
      '/purchase-order/danh-sach-nha-kho',
      {},
    );
  }

  getSupplierOptions(): Observable<PurchaseOrderSupplierOptionsApiResponse> {
    return this.http.post<PurchaseOrderSupplierOptionsApiResponse>(
      '/purchase-order/danh-sach-nha-cung-cap',
      {},
    );
  }

  getIngredientsBySupplier(
    supplierId: number,
  ): Observable<PurchaseOrderIngredientOptionsApiResponse> {
    return this.http.post<PurchaseOrderIngredientOptionsApiResponse>(
      '/purchase-order/danh-sach-nguyen-lieu-theo-ncc',
      { supplierId },
    );
  }
}
