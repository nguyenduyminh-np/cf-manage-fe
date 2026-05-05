import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  InvoiceSearchRequest,
  InvoiceDetailRequest,
  InvoiceSearchApiResponse,
  InvoiceDetailApiResponse,
} from '../../models/invoice/invoice.model';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);

  /**
   * Tìm kiếm hóa đơn với các điều kiện lọc động.
   */
  search(request: InvoiceSearchRequest): Observable<InvoiceSearchApiResponse> {
    return this.http.post<InvoiceSearchApiResponse>('/invoice/search', request);
  }

  exportExcel(request: InvoiceSearchRequest): Observable<Blob> {
    return this.http.post('/invoice/export', request, {
      responseType: 'blob',
    });
  }

  /**
   * Lấy chi tiết một hóa đơn.
   */
  getDetail(invoiceId: number): Observable<InvoiceDetailApiResponse> {
    const body: InvoiceDetailRequest = { invoiceId };
    return this.http.post<InvoiceDetailApiResponse>('/invoice/get-detail', body);
  }
}
