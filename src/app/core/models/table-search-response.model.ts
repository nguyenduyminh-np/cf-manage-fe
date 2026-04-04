import { ApiResponse } from './api-response.model';
import { PageData } from './page-data.model';
import { TableSummary } from './table.model';

export type TableSearchResponse = ApiResponse<PageData<TableSummary>>;
