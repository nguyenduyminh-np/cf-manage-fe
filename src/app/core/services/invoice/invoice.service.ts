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
    private readonly baseUrl = 'http://localhost:8080/api/v1/invoice';

    /**
     * Tìm kiếm hóa đơn với các điều kiện lọc động.
     */
    search(request: InvoiceSearchRequest): Observable<InvoiceSearchApiResponse> {
        return this.http.post<InvoiceSearchApiResponse>(`${this.baseUrl}/search`, request);
    }

    /**
     * Lấy chi tiết một hóa đơn.
     */
    getDetail(invoiceId: number): Observable<InvoiceDetailApiResponse> {
        const body: InvoiceDetailRequest = { invoiceId };
        return this.http.post<InvoiceDetailApiResponse>(`${this.baseUrl}/get-detail`, body);
    }
}