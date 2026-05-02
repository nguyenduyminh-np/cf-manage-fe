import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  DishCategorySearchRequest,
  DishCategorySearchApiResponse,
  DishCategoryCreateRequest,
  DishCategoryUpdateRequest,
  DishCategoryDetailApiResponse,
  DishCategoryDeleteApiResponse,
  DishCategoryOptionsApiResponse,
} from '../../models/dish-category/dish-category.model'; 

@Injectable({ providedIn: 'root' })
export class DishCategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/dish-category';

  /**
   * Tìm kiếm danh mục động (phân trang, lọc, sắp xếp).
   */
  search(request: DishCategorySearchRequest): Observable<DishCategorySearchApiResponse> {
    return this.http.post<DishCategorySearchApiResponse>(`${this.baseUrl}/search`, request);
  }

  /**
   * Tạo mới danh mục.
   */
  create(request: DishCategoryCreateRequest): Observable<DishCategoryDetailApiResponse> {
    return this.http.post<DishCategoryDetailApiResponse>(`${this.baseUrl}/create`, request);
  }

  /**
   * Cập nhật danh mục.
   */
  update(request: DishCategoryUpdateRequest): Observable<DishCategoryDetailApiResponse> {
    return this.http.post<DishCategoryDetailApiResponse>(`${this.baseUrl}/update`, request);
  }

  /**
   * Xóa mềm danh mục (set active = false).
   */
  delete(id: number): Observable<DishCategoryDeleteApiResponse> {
    return this.http.post<DishCategoryDeleteApiResponse>(`${this.baseUrl}/delete`, { id });
  }

  /**
   * Lấy chi tiết một danh mục.
   */
  getDetail(id: number): Observable<DishCategoryDetailApiResponse> {
    return this.http.post<DishCategoryDetailApiResponse>(`${this.baseUrl}/detail`, { id });
  }

    /**
   * Lấy danh sách danh mục active để làm dropdown.
   */
  getOptions(): Observable<DishCategoryOptionsApiResponse> {
    return this.http.post<DishCategoryOptionsApiResponse>(`${this.baseUrl}/options`, {});
  }
}