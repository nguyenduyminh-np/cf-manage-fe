export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'BOOKED';

export interface TableSummary {
  tableId: number;
  tableCode: string;
  tableName: string;
  tableStatus: TableStatus;
  tableStatusName: string;
  floor: number;
  slot: number;
  totalBooking: number;
  lastBookingTime: string | null;
  active: boolean;
}

export interface TableDetail extends TableSummary {
  description?: string;
}
