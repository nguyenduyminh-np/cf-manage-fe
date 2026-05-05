import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AccountSearchRequest,
  AccountCreateRequest,
  AccountUpdateRequest,
  AccountSearchApiResponse,
  AccountDetailApiResponse,
  AccountDeleteApiResponse,
} from '../../models/account/account.model'; // điều chỉnh đường dẫn

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  /**
   * Tìm kiếm tài khoản (phân trang, lọc, sắp xếp).
   */
  search(request: AccountSearchRequest): Observable<AccountSearchApiResponse> {
    return this.http.post<AccountSearchApiResponse>('/account/search', request);
  }

  /**
   * Xuất danh sách tài khoản ra file Excel.
   */
  exportExcel(request: AccountSearchRequest): Observable<Blob> {
    return this.http.post('/account/export', request, {
      responseType: 'blob',
    });
  }

  /**
   * Tạo mới tài khoản.
   */
  create(request: AccountCreateRequest): Observable<AccountDetailApiResponse> {
    return this.http.post<AccountDetailApiResponse>('/account/create', request);
  }

  /**
   * Cập nhật tài khoản.
   */
  update(request: AccountUpdateRequest): Observable<AccountDetailApiResponse> {
    return this.http.post<AccountDetailApiResponse>('/account/update', request);
  }

  /**
   * Xóa mềm (khóa) tài khoản.
   */
  delete(id: number): Observable<AccountDeleteApiResponse> {
    return this.http.post<AccountDeleteApiResponse>('/account/delete', { id });
  }

  /**
   * Xem chi tiết tài khoản.
   */
  getDetail(id: number): Observable<AccountDetailApiResponse> {
    return this.http.post<AccountDetailApiResponse>('/account/detail', { id });
  }
}
