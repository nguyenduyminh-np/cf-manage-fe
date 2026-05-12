export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  /** Danh sách cảnh báo mềm (HTTP 200 nhưng có advisory). Null / undefined nếu không có. */
  warnings?: string[] | null;
}
