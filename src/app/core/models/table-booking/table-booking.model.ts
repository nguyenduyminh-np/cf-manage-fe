import { ApiResponse } from '../base/api-response.model';
import { PageData } from '../base/page-data.model';

export type TableBookingSortField =
  | 'id'
  | 'expectedArriveTime'
  | 'checkInAt'
  | 'expectedCheckOut'
  | 'checkOutAt'
  | 'bookingStatus'
  | 'customerName'
  | 'phoneNumber'
  | 'depositAmount'
  | 'createdAt';

export type TableBookingSortDir = 'asc' | 'desc';

export interface TableBookingCreateRequest {
  tableId: number;
  expectedArriveTime: string;
  expectedCheckOut: string;
  customerName?: string;
  phoneNumber?: string;
  depositAmount?: number;
  depositPaid?: boolean;
  depositPaidAt?: string | null;
  depositForfeited?: boolean;
  depositTxnRef?: string | null;
  bookingStatus?: string;
  note?: string;
  active?: boolean;
  isWalkIn?: boolean;
}

export interface TableBookingUpdateRequest extends TableBookingCreateRequest {
  bookingId: number;
}

export interface TableBookingSearchRequest {
  page?: number;
  limit?: number;
  sortField?: TableBookingSortField;
  sortDir?: TableBookingSortDir;
  tableId?: number;
  bookingStatus?: string;
  customerName?: string;
  phoneNumber?: string;
  checkInAt?: string;
  checkOutAt?: string;
  active?: boolean;
}

export interface TableBookingUpdateStatusRequest {
  bookingId: number;
  bookingStatus: string;
  checkInAt?: string;
  checkOutAt?: string;
}

export interface TableBookingCheckOutRequest {
  bookingId: number;
  checkOutAt?: string | null;
}

export interface TableBookingCheckInRequest {
  bookingId: number;
  checkInAt?: string | null;
  force?: boolean;
}

export interface TableBookingDetailRequest {
  bookingId: number;
}

export interface TableBookingDetailData {
  bookingId: number;
  tableId: number;
  tableCode: string;
  tableName: string;
  expectedArriveTime: string | null;
  checkInAt: string | null;
  expectedCheckOut: string | null;
  checkOutAt: string | null;
  bookingStatus: string;
  bookingStatusName: string;
  customerName: string | null;
  phoneNumber: string | null;
  depositAmount: number | null;
  depositPaid: boolean | null;
  depositPaidAt: string | null;
  depositForfeited: boolean | null;
  depositTxnRef: string | null;
  note: string | null;
  accountId: number | null;
  accountUsername: string | null;
  accountFullName: string | null;
  active: boolean | null;
  createdAt: string | null;
}

export interface TableBookingResponse {
  bookingId: number;
  tableId: number;
  tableCode: string;
  tableName: string;
  expectedArriveTime: string | null;
  checkInAt: string | null;
  expectedCheckOut: string | null;
  checkOutAt: string | null;
  bookingStatus: string;
  bookingStatusName: string;
  customerName: string;
  phoneNumber: string;
  depositAmount: number | null;
  depositPaid: boolean;
  depositPaidAt: string | null;
  depositForfeited: boolean;
  depositTxnRef: string | null;
  note: string | null;
  accountId: number | null;
  accountUsername: string | null;
  accountFullName: string | null;
  active: boolean;
  createdAt: string | null;
}

export interface TableBookingCheckOutData {
  bookingId: number;
  bookingStatus: string;
  bookingStatusName: string;
  checkInAt: string | null;
  checkOutAt: string | null;
}

export type TableBookingCreateResponse = ApiResponse<TableBookingResponse>;
export type TableBookingUpdateResponse = ApiResponse<TableBookingResponse>;
export type TableBookingUpdateStatusResponse = ApiResponse<TableBookingResponse>;
export type TableBookingCheckInResponse = ApiResponse<TableBookingResponse>;
export type TableBookingCheckOutResponse = ApiResponse<TableBookingCheckOutData>;
export type TableBookingSearchResponse = ApiResponse<PageData<TableBookingResponse>>;
export type TableBookingDetailResponse = ApiResponse<TableBookingDetailData>;
import { TuiDay, TuiTime } from '@taiga-ui/cdk/date-time';
import { TableAvailableResponseDTO } from '../table/table.model';

export type BookingStatusCode = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'CANCELLED';
export type BookingStatusTag = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type DateTimeControlValue = readonly [TuiDay, TuiTime | null] | null;

export type PosTableBookingDialogInput =
  | number
  | {
      tableId?: number | null;
      tableID?: number | null;
      tableName?: string | null;
      walkIn?: boolean;
    }
  | null
  | undefined;

export interface PosTableBookingDialogResult {
  bookingId: number;
  tableId: number;
}

export interface SelectOption {
  value: number | null;
  label: string;
}

export interface BookingStatusOption {
  value: BookingStatusCode;
  code: BookingStatusTag;
  label: string;
  description: string;
}

export interface TableSearchQuery {
  floor: number | null;
  seat: number | null;
  keyword: string;
}

export interface TableCard extends Omit<TableAvailableResponseDTO, 'tableId' | 'id'> {
  tableId: number;
}

export interface BookingRequestPayload {
  tableId: number;
  expectedArriveTime: string;
  expectedCheckOut: string;
  customerName: string;
  phoneNumber: string;
  depositAmount: number | null;
  depositPaid: boolean;
  depositPaidAt: string | null;
  bookingStatus: BookingStatusCode;
  note: string;
  isWalkIn?: boolean;
}
