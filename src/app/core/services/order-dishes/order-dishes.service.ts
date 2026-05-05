import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BulkUpdateStatusRequest,
  BulkUpdateStatusResponse,
  OrderHistorySearchRequest,
  OrderHistorySearchResponse,
} from '../../models/order-dishes/order-dishes.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrderDishesHistoryService {
  private readonly http = inject(HttpClient);

  search(request: OrderHistorySearchRequest): Observable<OrderHistorySearchResponse> {
    return this.http.post<OrderHistorySearchResponse>('/dish-order/order-history', request);
  }

  exportExcel(request: OrderHistorySearchRequest): Observable<Blob> {
    return this.http.post('/dish-order/order-history/export', request, {
      responseType: 'blob',
    });
  }

  // service
  updateStatusBulk(body: BulkUpdateStatusRequest): Observable<BulkUpdateStatusResponse> {
    return this.http.post<BulkUpdateStatusResponse>('/dish-order/update-status', body);
  }
}
