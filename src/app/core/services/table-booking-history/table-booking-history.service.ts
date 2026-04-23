import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TableBookingService } from '../table-booking/table-booking.service';
import {
  DeleteTableBookingRequest,
  DeleteTableBookingResponse,
  TableBookingSearchRequest,
  TableBookingSearchResponse,
} from '../../models/table-booking/table-booking.model';

@Injectable()
export class TableBookingHistoryService {
  private readonly tableBookingService = inject(TableBookingService);

  search(request: TableBookingSearchRequest): Observable<TableBookingSearchResponse> {
    return this.tableBookingService.search(request);
  }

  searchPendingAndConfirmedBookings(
    request: TableBookingSearchRequest,
  ): Observable<TableBookingSearchResponse> {
    return this.tableBookingService.searchPendingAndConfirmedBookings(request);
  }

  delete(request: DeleteTableBookingRequest): Observable<DeleteTableBookingResponse> {
    return this.tableBookingService.delete(request);
  }
}
