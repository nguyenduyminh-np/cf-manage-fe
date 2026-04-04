import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { TableDetailRequest } from '../models/table-detail-request.model';
import { TableDetailResponse } from '../models/table-detail-response.model';
import { TableSearchRequest } from '../models/table-search-request.model';
import { TableSearchResponse } from '../models/table-search-response.model';

@Injectable({
  providedIn: 'root',
})
export class TableService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/table';

  search(request: TableSearchRequest): Observable<TableSearchResponse> {
    return this.http.post<TableSearchResponse>(`${this.baseUrl}/search`, request);
  }

  detail(request: TableDetailRequest): Observable<TableDetailResponse> {
    return this.http.post<TableDetailResponse>(`${this.baseUrl}/detail`, request);
  }
}
