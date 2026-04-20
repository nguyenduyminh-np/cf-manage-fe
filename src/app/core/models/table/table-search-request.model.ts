import { TableStatus } from './table.model';

export interface TableSearchRequest {
  page?: number;
  limit?: number;
  sortField?:
    | ''
    | null
    | 'id'
    | 'tableCode'
    | 'tableName'
    | 'tableStatus'
    | 'floor'
    | 'slot'
    | 'totalBooking'
    | 'lastBookingTime'
    | 'active';
  sortDir?: 'ASC' | 'DESC';
  keyword?: string | null;
  floor?: number | null;
  slot?: number | null;
  tableStatus?: TableStatus | null;
  active?: boolean | null;
}
