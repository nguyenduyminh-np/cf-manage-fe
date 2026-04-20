export interface PageData<T> {
  data: T[];
  pageNo: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}
