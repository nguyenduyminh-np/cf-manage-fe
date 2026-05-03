import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  SupplierSearchRequest,
  SupplierCreateRequest,
  SupplierUpdateRequest,
  SupplierSearchApiResponse,
  SupplierDetailApiResponse,
  SupplierOptionsApiResponse,
  SupplierDeleteApiResponse,
} from '../../models/supplier/supplier.model'; // điều chỉnh đường dẫn thực tế

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/supplier';

  /**
   * Tìm kiếm nhà cung cấp (phân trang, lọc, sắp xếp).
   */
  search(request: SupplierSearchRequest): Observable<SupplierSearchApiResponse> {
    return this.http.post<SupplierSearchApiResponse>(`${this.baseUrl}/search`, request);
  }

  /**
   * Xuất danh sách nhà cung cấp ra Excel (tải file).
   * Note: Backend expects `isActive` but model uses `active`.
   */
  exportExcel(request: SupplierSearchRequest): Observable<Blob> {
    const exportRequest: any = { ...request };
    if (exportRequest.active !== undefined) {
      exportRequest.isActive = exportRequest.active;
      delete exportRequest.active;
    }
    return this.http.post(`${this.baseUrl}/export`, exportRequest, {
      responseType: 'blob',
    });
  }

  /**
   * Tạo mới nhà cung cấp.
   */
  create(request: SupplierCreateRequest): Observable<SupplierDetailApiResponse> {
    return this.http.post<SupplierDetailApiResponse>(`${this.baseUrl}/create`, request);
  }

  /**
   * Cập nhật nhà cung cấp.
   */
  update(request: SupplierUpdateRequest): Observable<SupplierDetailApiResponse> {
    return this.http.post<SupplierDetailApiResponse>(`${this.baseUrl}/update`, request);
  }

  /**
   * Xoá mềm nhà cung cấp (active = false).
   */
  delete(id: number): Observable<SupplierDeleteApiResponse> {
    return this.http.post<SupplierDeleteApiResponse>(`${this.baseUrl}/delete`, { id });
  }

  /**
   * Lấy chi tiết nhà cung cấp.
   */
  getDetail(id: number): Observable<SupplierDetailApiResponse> {
    return this.http.post<SupplierDetailApiResponse>(`${this.baseUrl}/detail`, { id });
  }

  /**
   * Lấy danh sách nhà cung cấp dạng options (dropdown).
   */
  getOptions(): Observable<SupplierOptionsApiResponse> {
    return this.http.post<SupplierOptionsApiResponse>(`${this.baseUrl}/options`, {});
  }
}
