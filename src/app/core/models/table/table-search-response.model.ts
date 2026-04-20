import { ApiResponse } from '../base/api-response.model';
import { PageData } from '../base/page-data.model';
import { TableSummary } from './table.model';

export type TableSearchResponse = ApiResponse<PageData<TableSummary>>;
