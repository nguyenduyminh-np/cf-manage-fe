import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  DishSearchRequest,
  DishCreateRequest,
  DishUpdateRequest,
  DishListApiResponse,
  DishSearchApiResponse,
  DishDetailApiResponse,
  DishDeleteApiResponse,
} from '../../models/dish/dish.model'; // điều chỉnh đường dẫn thực tế

@Injectable({ providedIn: 'root' })
export class DishService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/dish';

  //deprecated
  //   /**
  //    * Lấy danh sách món (menu) – hỗ trợ lọc active (true/false).
  //    * Gửi optional body, nếu không truyền -> lấy mặc định (active = true).
  //    */
  //   list(body?: { active?: boolean }): Observable<DishListApiResponse> {
  //     return this.http.post<DishListApiResponse>(`${this.baseUrl}/list`, body ?? {});
  //   }

  /**
   * Tìm kiếm món ăn động (phân trang, lọc, sắp xếp).
   */
  search(request: DishSearchRequest): Observable<DishSearchApiResponse> {
    return this.http.post<DishSearchApiResponse>(`${this.baseUrl}/search`, request);
  }

  exportExcel(request: DishSearchRequest): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/export`, request, {
      responseType: 'blob',
    });
  }

  /**
   * Tạo mới món ăn.
   */
  create(request: DishCreateRequest): Observable<DishDetailApiResponse> {
    return this.http.post<DishDetailApiResponse>(`${this.baseUrl}/create`, request);
  }

  /**
   * Cập nhật món ăn.
   */
  update(request: DishUpdateRequest): Observable<DishDetailApiResponse> {
    return this.http.post<DishDetailApiResponse>(`${this.baseUrl}/update`, request);
  }

  /**
   * Xoá mềm món ăn (active = false).
   */
  delete(id: number): Observable<DishDeleteApiResponse> {
    return this.http.post<DishDeleteApiResponse>(`${this.baseUrl}/delete`, { id });
  }

  /**
   * Lấy chi tiết món ăn.
   */
  getDetail(id: number): Observable<DishDetailApiResponse> {
    return this.http.post<DishDetailApiResponse>(`${this.baseUrl}/detail`, { id });
  }
}
