import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  TableBookingDetailRequest,
  TableBookingDetailResponse,
  TableBookingUpdateRequest,
  TableBookingUpdateResponse,
} from '../../models/table-booking-detail/table-booking-detail.models';
import { TableBookingService } from '../table-booking/table-booking.service';

@Injectable()
export class TableBookingDetailService {
  private readonly tableBookingService = inject(TableBookingService);

  getBookingDetail(request: TableBookingDetailRequest): Observable<TableBookingDetailResponse> {
    return this.tableBookingService.getBookingDetail(request);
  }

  updateBooking(request: TableBookingUpdateRequest): Observable<TableBookingUpdateResponse> {
    return this.tableBookingService.update(request);
  }
}
