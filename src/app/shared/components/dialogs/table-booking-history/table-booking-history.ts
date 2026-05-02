import '../../../../ag-grid.setup';

import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  Injector,
  inject,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiDialogService } from '@taiga-ui/core';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  GridSizeChangedEvent,
  ICellRendererParams,
  RowDoubleClickedEvent,
} from 'ag-grid-community';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { injectContext } from '@taiga-ui/polymorpheus';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import {
  TableBookingHistoryItem,
  TableBookingSearchRequest,
  TableBookingSortDir,
  TableBookingSortField,
} from '../../../../core/models/table-booking-history/table-booking-history.models';
import { PosTableBookingDialogResult } from '../../../../core/models/table-booking/table-booking.model';

import { PosTableBooking } from '../pos-table-booking/pos-table-booking';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableBookingHistoryService } from '../../../../core/services/table-booking-history/table-booking-history.service';
import { TableBookingDetail } from '../table-booking-detail/table-booking-detail';
import { ActionCellRender } from '../../action-cell-render/action-cell-render';

interface BookingGridRow extends TableBookingHistoryItem {
  stt: number;
  expectedArriveTimeDisplay: string;
  checkInAtDisplay: string;
  expectedCheckOutDisplay: string;
  checkOutAtDisplay: string;
  depositAmountDisplay: string;
  createdAtDisplay: string;
  depositPaidDisplay: string;
  depositForfeitedDisplay: string;
  activeDisplay: string;
}

type TableBookingHistoryDialogInput = number | { tableId: number; tableName?: string | null };

interface TableBookingHistoryViewState {
  isLoading: boolean;
  error: string | null;
  rowData: BookingGridRow[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

interface TableBookingHistoryQuery {
  page: number;
  limit: number;
  source: TableBookingHistoryDataSource;
  filters: TableBookingHistoryFilters;
}

type TableBookingHistoryDataSource = 'search' | 'pending-job';

interface TableBookingHistoryFilters {
  bookingStatus: string;
  customerName: string;
  phoneNumber: string;
  checkInAt: string;
  checkOutAt: string;
  sortField: TableBookingSortField;
  sortDir: TableBookingSortDir;
  active: string;
}

type SearchDropdown = 'bookingStatus' | 'active' | 'pageSize';

@Component({
  standalone: true,
  selector: 'app-table-booking-history',
  imports: [AsyncPipe, AgGridAngular, FormsModule, TuiButton],
  providers: [TableBookingHistoryService],
  templateUrl: './table-booking-history.html',
  styleUrl: './table-booking-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableBookingHistory {
  // UI timing and cleanup.
  // Input: none.
  // Output: debounce window for auto-filter calls and timer cleanup.
  private static readonly FILTER_DEBOUNCE_MS = 700;
  private static readonly ADVANCED_CLOSE_APPLY_DELAY_MS = 450;

  // Service and dialog dependencies.
  // Input: Angular/Taiga injection context.
  // Output: handles used for data loading and dialog completion.
  private readonly tableBookingHistoryService = inject(TableBookingHistoryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly dialogService = inject(TuiDialogService);
  private readonly dialogContext =
    injectContext<TuiDialogContext<void, TableBookingHistoryDialogInput>>();

  // Query stream.
  // Input: page, limit, and filter updates.
  // Output: observable state consumed by the template.
  private readonly querySubject = new BehaviorSubject<TableBookingHistoryQuery>({
    page: 1,
    limit: 10,
    source: 'pending-job',
    filters: this.createDefaultFilters(),
  });
  private gridApi: GridApi<BookingGridRow> | null = null;
  private latestState: TableBookingHistoryViewState | null = null;
  private fitGridRafId: number | null = null;
  private filterDebounceTimerId: number | null = null;
  private hasPendingAdvancedFilterChanges = false;

  // Dialog metadata.
  // Input: injected dialog payload.
  // Output: resolved table id and fallback display name.
  readonly tableId: number | null = this.resolveDialogTableId(this.dialogContext.data);
  readonly initialTableName: string = this.resolveDialogTableName(this.dialogContext.data);

  // Outbound events.
  // Input: user actions inside the dialog.
  // Output: signals emitted to the parent flow.
  readonly closed = output<void>();
  readonly createBooking = output<number>();

  // Search form configuration.
  // Input: none.
  // Output: fixed option lists and mutable filter state.
  protected readonly pageSizeOptions = [10, 20, 50, 100] as const;
  protected readonly defaultPageSize = 10;
  protected readonly bookingStatusOptions = [
    { label: 'Tất cả trạng thái', value: '' },
    { label: 'Chờ xác nhận', value: 'PENDING_CONFIRMATION' },
    { label: 'Đã xác nhận', value: 'CONFIRMED' },
    { label: 'Đã huỷ', value: 'CANCELLED' },
    { label: 'Hoàn thành', value: 'COMPLETED' },
    { label: 'Đã hết hạn', value: 'EXPIRED' },
  ] as const;
  protected readonly sortFieldOptions = [
    { label: 'Check-in', value: 'checkInAt' },
    { label: 'Check-out', value: 'checkOutAt' },
    { label: 'Trạng thái booking', value: 'bookingStatus' },
    { label: 'Tên khách', value: 'customerName' },
    { label: 'Số điện thoại', value: 'phoneNumber' },
    { label: 'Tiền cọc', value: 'depositAmount' },
    { label: 'Ngày tạo', value: 'createdAt' },
  ] as const;
  protected readonly sortDirOptions = [
    { label: 'Giảm dần', value: 'desc' },
    { label: 'Tăng dần', value: 'asc' },
  ] as const;
  protected readonly activeOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Đang hoạt động', value: 'true' },
    { label: 'Ngừng hoạt động', value: 'false' },
  ] as const;
  protected readonly searchFilters: TableBookingHistoryFilters = this.createDefaultFilters();
  protected openedDropdown: SearchDropdown | null = null;
  protected advancedSearchOpen = false;
  protected readonly rowBuffer = 6;
  protected readonly valueCache = true;
  protected readonly animateRows = false;
  protected readonly suppressColumnMoveAnimation = true;

  // Derived trigger labels.
  // Input: current filter state.
  // Output: label text rendered inside custom select buttons.
  protected get selectedBookingStatusLabel(): string {
    return (
      this.bookingStatusOptions.find((option) => option.value === this.searchFilters.bookingStatus)
        ?.label ?? this.bookingStatusOptions[0].label
    );
  }

  protected get selectedActiveLabel(): string {
    return (
      this.activeOptions.find((option) => option.value === this.searchFilters.active)?.label ??
      this.activeOptions[0].label
    );
  }

  protected get hasAdvancedFiltersApplied(): boolean {
    return (
      !!this.searchFilters.phoneNumber.trim() ||
      !!this.searchFilters.active.trim() ||
      this.searchFilters.sortField !== 'checkInAt' ||
      this.searchFilters.sortDir !== 'desc'
    );
  }

  // View state pipeline.
  // Input: current query subject value.
  // Output: loading/data/error state for the template and grid.
  protected readonly detailState$: Observable<TableBookingHistoryViewState> =
    this.querySubject.pipe(
      switchMap(({ page, limit, source, filters }) =>
        this.fetchState(this.tableId, page, limit, source, filters),
      ),
      tap((state) => {
        this.latestState = state;
        this.onStateRendered(state);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  // Cleanup hook.
  // Input: component destroy.
  // Output: clears any pending debounce timer.
  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.filterDebounceTimerId !== null) {
        clearTimeout(this.filterDebounceTimerId);
      }
    });
  }

  // Grid defaults.
  // Input: none.
  // Output: shared AG Grid column behavior.
  protected readonly defaultColDef: ColDef<BookingGridRow> = {
    sortable: true,
    resizable: true,
    minWidth: 90,
    flex: 1,
    filter: true,
    menuTabs: ['filterMenuTab'],
  };
  // Grid columns.
  // Input: booking row fields.
  // Output: table structure for the history list.
  protected readonly columnDefs: ColDef<BookingGridRow>[] = [
    {
      headerName: 'STT',
      field: 'stt',
      flex: 0.55,
      minWidth: 72,
      maxWidth: 90,
      cellClass: 'cell-center cell-bold',
      sortable: true,
      filter: true,
      pinned: 'left',
    },
    {
      headerName: 'Mã booking',
      field: 'bookingId',
      minWidth: 120,
      flex: 0.8,
      cellClass: 'cell-bold',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Tên bàn',
      field: 'tableName',
      minWidth: 120,
      flex: 1,
      cellClass: 'cell-bold',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Mã bàn',
      field: 'tableCode',
      minWidth: 100,
      maxWidth: 130,
      flex: 0.75,
      cellClass: 'cell-center cell-chip',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Trạng thái',
      field: 'bookingStatusName',
      minWidth: 150,
      flex: 1.2,
      cellRenderer: ({ value, data }: ICellRendererParams<BookingGridRow>) => {
        const label = typeof value === 'string' && value.trim() ? value : '-';
        return `<span class="booking-status ${this.resolveStatusClass(data?.bookingStatus)}">${label}</span>`;
      },
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Tên khách',
      field: 'customerName',
      minWidth: 150,
      flex: 1.2,
      cellClass: 'cell-bold',
      sortable: true,
      filter: true,
    },
    { headerName: 'SĐT', field: 'phoneNumber', minWidth: 130, flex: 1 },
    {
      headerName: 'Thời gian đến dự kiến',
      field: 'expectedArriveTimeDisplay',
      minWidth: 160,
      flex: 1.35,
      cellClass: 'cell-compact',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Dự kiến trả bàn',
      field: 'expectedCheckOutDisplay',
      minWidth: 150,
      flex: 1.35,
      cellClass: 'cell-compact',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Check-in',
      field: 'checkInAtDisplay',
      minWidth: 130,
      flex: 1.1,
      cellClass: 'cell-compact',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Check-out',
      field: 'checkOutAtDisplay',
      minWidth: 130,
      flex: 1.1,
      cellClass: 'cell-compact',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Tiền cọc',
      field: 'depositAmountDisplay',
      minWidth: 120,
      flex: 0.95,
      cellClass: 'cell-right cell-bold',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Đã đóng cọc',
      field: 'depositPaidDisplay',
      minWidth: 120,
      flex: 0.9,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Ghi chú',
      field: 'note',
      minWidth: 180,
      flex: 1.5,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Người đặt',
      field: 'accountFullName',
      minWidth: 150,
      flex: 1.2,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Hoạt động',
      field: 'activeDisplay',
      minWidth: 110,
      flex: 0.9,
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Ngày tạo',
      field: 'createdAtDisplay',
      minWidth: 140,
      flex: 1.15,
      cellClass: 'cell-compact',
      sortable: true,
      filter: true,
    },
    {
      headerName: 'Thao tác',
      colId: 'actions',
      pinned: 'right',
      lockPinned: true,
      width: 180,
      minWidth: 180,
      maxWidth: 200,
      suppressSizeToFit: true,
      sortable: false,
      filter: false,
      cellRenderer: ActionCellRender,
      cellRendererParams: {
        onDeleted: () => this.refreshGrid(),
      },
    },
  ];

  // Grid lifecycle.
  // Input: AG Grid events.
  // Output: stores grid API and resizes columns.
  protected onGridReady(event: GridReadyEvent<BookingGridRow>): void {
    this.gridApi = event.api;
    this.fitGridWidth();
    this.onStateRendered(this.latestState);
  }

  protected onGridSizeChanged(_event: GridSizeChangedEvent<BookingGridRow>): void {
    this.fitGridWidth();
  }

  protected onRowDoubleClicked(event: RowDoubleClickedEvent<BookingGridRow>): void {
    const bookingId = event.data?.bookingId;

    if (typeof bookingId === 'number' && Number.isFinite(bookingId) && bookingId > 0) {
      this.openBookingDetail(bookingId);
    }
  }

  // Pagination controls.
  // Input: current query state.
  // Output: updates page number and triggers a reload.
  protected previousPage(): void {
    const currentQuery = this.querySubject.getValue();
    const currentPage = currentQuery.page;
    if (currentPage > 1) {
      this.querySubject.next({ ...currentQuery, page: currentPage - 1 });
    }
  }

  protected nextPage(): void {
    const currentQuery = this.querySubject.getValue();
    this.querySubject.next({ ...currentQuery, page: currentQuery.page + 1 });
  }

  // Custom filter dropdowns.
  // Input: dropdown key or selected value.
  // Output: open state changes and debounced query updates.
  protected toggleDropdown(target: SearchDropdown): void {
    this.advancedSearchOpen = target === 'active' ? this.advancedSearchOpen : false;
    this.openedDropdown = this.openedDropdown === target ? null : target;
  }

  protected toggleAdvancedSearch(): void {
    this.openedDropdown = null;
    if (this.advancedSearchOpen) {
      this.advancedSearchOpen = false;
      this.flushAdvancedFiltersIfNeeded();
      return;
    }

    this.advancedSearchOpen = true;
  }

  protected closeAdvancedSearch(): void {
    this.openedDropdown = null;
    this.advancedSearchOpen = false;
    this.flushAdvancedFiltersIfNeeded();
  }

  protected setBookingStatus(value: string): void {
    if (this.searchFilters.bookingStatus === value) {
      this.openedDropdown = null;
      return;
    }

    this.searchFilters.bookingStatus = value;
    this.openedDropdown = null;
    this.onFiltersChanged();
  }

  protected setActive(value: string): void {
    if (this.searchFilters.active === value) {
      this.openedDropdown = null;
      return;
    }

    this.searchFilters.active = value;
    this.openedDropdown = null;
    this.onAdvancedFiltersChanged();
  }

  protected setPageSize(pageSize: number): void {
    if (!this.pageSizeOptions.includes(pageSize as (typeof this.pageSizeOptions)[number])) {
      return;
    }

    const currentQuery = this.querySubject.getValue();
    if (currentQuery.limit === pageSize) {
      this.openedDropdown = null;
      return;
    }

    this.openedDropdown = null;
    this.querySubject.next({
      page: 1,
      limit: pageSize,
      source: currentQuery.source,
      filters: { ...currentQuery.filters },
    });
  }

  // Outside click handler.
  // Input: document click.
  // Output: closes any open custom select popup.
  @HostListener('document:click')
  protected closeDropdown(): void {
    const shouldFlushAdvancedFilters = this.advancedSearchOpen;
    this.openedDropdown = null;
    this.advancedSearchOpen = false;

    if (shouldFlushAdvancedFilters) {
      this.flushAdvancedFiltersIfNeeded();
    }
  }

  // Manual refresh.
  // Input: none.
  // Output: re-emits current query state.
  protected retry(): void {
    this.querySubject.next(this.querySubject.getValue());
  }

  // Page size selector.
  // Input: change event from the footer select.
  // Output: updates page size and resets to page 1.
  protected onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const nextPageSize = Number(target?.value);

    if (!this.pageSizeOptions.includes(nextPageSize as (typeof this.pageSizeOptions)[number])) {
      return;
    }

    const currentQuery = this.querySubject.getValue();
    if (currentQuery.limit === nextPageSize) {
      return;
    }

    this.querySubject.next({
      page: 1,
      limit: nextPageSize,
      source: currentQuery.source,
      filters: { ...currentQuery.filters },
    });
  }

  // Explicit form submit.
  // Input: search form submit.
  // Output: normalizes filters and reloads immediately.
  protected applySearch(): void {
    this.openedDropdown = null;
    this.advancedSearchOpen = false;
    const currentQuery = this.querySubject.getValue();
    this.querySubject.next({
      page: 1,
      limit: currentQuery.limit,
      source: 'search',
      filters: this.normalizeFilters(this.searchFilters),
    });
  }

  protected searchPendingJob(): void {
    this.openedDropdown = null;
    this.advancedSearchOpen = false;

    if (this.filterDebounceTimerId !== null) {
      clearTimeout(this.filterDebounceTimerId);
      this.filterDebounceTimerId = null;
    }

    const currentQuery = this.querySubject.getValue();
    this.querySubject.next({
      page: 1,
      limit: currentQuery.limit,
      source: 'pending-job',
      filters: this.normalizeFilters(this.searchFilters),
    });
  }

  // Auto-search entry point.
  // Input: filter changes from inputs or dropdowns.
  // Output: debounced call to applySearch().
  protected onFiltersChanged(): void {
    this.hasPendingAdvancedFilterChanges = false;
    if (this.filterDebounceTimerId !== null) {
      clearTimeout(this.filterDebounceTimerId);
    }

    this.filterDebounceTimerId = window.setTimeout(() => {
      this.filterDebounceTimerId = null;
      this.applySearch();
    }, TableBookingHistory.FILTER_DEBOUNCE_MS);
  }

  protected onAdvancedFiltersChanged(): void {
    this.hasPendingAdvancedFilterChanges = true;

    if (!this.advancedSearchOpen) {
      this.flushAdvancedFiltersIfNeeded();
    }
  }

  // Reset search form.
  // Input: none.
  // Output: restores defaults and triggers a reload.
  protected resetSearch(): void {
    Object.assign(this.searchFilters, this.createDefaultFilters());
    this.hasPendingAdvancedFilterChanges = false;
    this.advancedSearchOpen = false;
    this.applySearch();
  }

  private flushAdvancedFiltersIfNeeded(): void {
    if (!this.hasPendingAdvancedFilterChanges) {
      return;
    }

    if (this.filterDebounceTimerId !== null) {
      clearTimeout(this.filterDebounceTimerId);
    }

    this.filterDebounceTimerId = window.setTimeout(() => {
      this.filterDebounceTimerId = null;
      this.hasPendingAdvancedFilterChanges = false;
      this.applySearch();
    }, TableBookingHistory.ADVANCED_CLOSE_APPLY_DELAY_MS);
  }

  // Pagination guards.
  // Input: current view state.
  // Output: booleans for button enable/disable state.
  protected canGoPrevious(state: TableBookingHistoryViewState | null): boolean {
    return !!state && state.currentPage > 1 && !state.isLoading;
  }

  protected canGoNext(state: TableBookingHistoryViewState | null): boolean {
    return !!state && state.currentPage < state.totalPages && !state.isLoading;
  }

  // Pagination labels.
  // Input: current view state.
  // Output: human-readable page and result summaries.
  protected pageSummary(state: TableBookingHistoryViewState | null): string {
    if (!state) {
      return 'Trang 1/1';
    }

    return `Trang ${state.currentPage}/${state.totalPages}`;
  }

  protected resultSummary(state: TableBookingHistoryViewState | null): string {
    if (!state || !state.totalElements) {
      return 'Không có dữ liệu lịch sử đặt bàn';
    }

    const start = (state.currentPage - 1) * state.pageSize + 1;
    const end = Math.min(state.currentPage * state.pageSize, state.totalElements);
    return `Hiển thị ${start}-${end}/${state.totalElements} lịch sử`;
  }

  // Dialog actions.
  // Input: none.
  // Output: closes the dialog or emits a create-booking request.
  protected close(): void {
    this.dialogContext?.completeWith();
    this.closed.emit();
  }

  protected openCreateBooking(): void {
    const tableId = this.tableId;
    if (tableId && tableId > 0) {
      this.createBooking.emit(tableId);
    }

    this.dialogService
      .open<PosTableBookingDialogResult | null>(
        new PolymorpheusComponent(PosTableBooking, this.injector),
        {
          data: {
            tableId: tableId ?? undefined,
            tableName: this.displayTableName(this.latestState),
          },
          size: 'auto',
          dismissible: true,
          closeable: false,
        },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.retry();

        if (result.bookingId > 0) {
          this.openBookingDetail(result.bookingId);
        }
      });
  }

  private openBookingDetail(bookingId: number): void {
    this.dialogService
      .open(new PolymorpheusComponent(TableBookingDetail, this.injector), {
        data: { bookingId },
        size: 'auto',
        dismissible: true,
        closeable: true,
        label: '',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  // Data fetch pipeline.
  // Input: table id, page, page size, and normalized filters.
  // Output: observable loading/data/error state.
  private fetchState(
    tableId: number | null,
    page: number,
    limit: number,
    source: TableBookingHistoryDataSource,
    filters: TableBookingHistoryFilters,
  ): Observable<TableBookingHistoryViewState> {
    const backendPageIndex = Math.max(0, page - 1);

    if (!tableId || tableId <= 0) {
      return of({
        isLoading: false,
        error: 'Thiếu mã bàn để tải lịch sử đặt bàn.',
        rowData: [],
        currentPage: page,
        pageSize: limit,
        totalElements: 0,
        totalPages: 1,
      });
    }

    const request: TableBookingSearchRequest = {
      page: backendPageIndex,
      limit,
      sortField: filters.sortField,
      sortDir: filters.sortDir,
      tableId,
      ...(filters.bookingStatus ? { bookingStatus: filters.bookingStatus } : {}),
      ...(filters.customerName ? { customerName: filters.customerName } : {}),
      ...(filters.phoneNumber ? { phoneNumber: filters.phoneNumber } : {}),
      ...(filters.active !== '' ? { active: filters.active === 'true' } : {}),
      ...(filters.checkInAt ? { checkInAt: filters.checkInAt } : {}),
      ...(filters.checkOutAt ? { checkOutAt: filters.checkOutAt } : {}),
    };

    const request$ =
      source === 'pending-job'
        ? this.tableBookingHistoryService.searchPendingAndConfirmedBookings(request)
        : this.tableBookingHistoryService.search(request);

    return request$.pipe(
      map((response) => {
        const pageData = response?.data;
        const items = this.extractItems(pageData);
        const mappedRows = items.map((item, index) => this.toGridRow(item, index, page, limit));

        return {
          isLoading: false,
          error: null,
          rowData: mappedRows,
          currentPage: Number.isFinite(pageData?.pageNo) ? (pageData?.pageNo ?? 0) + 1 : page,
          pageSize: limit,
          totalElements: pageData?.totalElements ?? 0,
          totalPages: Math.max(1, pageData?.totalPages ?? 1),
        };
      }),
      startWith({
        isLoading: true,
        error: null,
        rowData: [],
        currentPage: page,
        pageSize: limit,
        totalElements: 0,
        totalPages: 1,
      }),
      catchError((error) => {
        void error;
        return of({
          isLoading: false,
          error: 'Không tải được lịch sử đặt bàn. Vui lòng thử lại.',
          rowData: [],
          currentPage: page,
          pageSize: limit,
          totalElements: 0,
          totalPages: 1,
        });
      }),
    );
  }

  private resolveDialogTableId(
    data: TableBookingHistoryDialogInput | null | undefined,
  ): number | null {
    if (typeof data === 'number' && Number.isFinite(data) && data > 0) {
      return data;
    }

    if (data && typeof data === 'object') {
      const tableId = data.tableId;
      if (Number.isFinite(tableId) && tableId > 0) {
        return tableId;
      }
    }

    return null;
  }

  private resolveDialogTableName(data: TableBookingHistoryDialogInput | null | undefined): string {
    if (data && typeof data === 'object') {
      const tableName = data.tableName;
      if (typeof tableName === 'string' && tableName.trim()) {
        return tableName.trim();
      }
    }

    return '-';
  }

  // Header label helper.
  // Input: current state.
  // Output: display name shown in the dialog header.
  protected displayTableName(state: TableBookingHistoryViewState | null): string {
    const firstRowName = state?.rowData[0]?.tableName;

    if (typeof firstRowName === 'string' && firstRowName.trim()) {
      return firstRowName.trim();
    }

    return this.initialTableName;
  }

  // Row mapper.
  // Input: API item, row index, page, and page size.
  // Output: grid-ready row with formatted fields.
  private toGridRow(
    item: TableBookingHistoryItem,
    rowIndex: number,
    page: number,
    pageSize: number,
  ): BookingGridRow {
    return {
      ...item,
      stt: (page - 1) * pageSize + rowIndex + 1,
      expectedArriveTimeDisplay: this.formatDateTime(item.expectedArriveTime),
      checkInAtDisplay: this.formatDateTime(item.checkInAt),
      expectedCheckOutDisplay: this.formatDateTime(item.expectedCheckOut),
      checkOutAtDisplay: this.formatDateTime(item.checkOutAt),
      depositAmountDisplay: this.formatCurrency(item.depositAmount),
      createdAtDisplay: this.formatDateTime(item.createdAt),
      depositPaidDisplay: item.depositPaid ? 'Đã đóng' : 'Chưa đóng',
      depositForfeitedDisplay: item.depositForfeited ? 'Phạt cọc' : 'Không',
      activeDisplay: item.active ? 'Có' : 'Không',
    };
  }

  // Array extraction helper.
  // Input: unknown backend payload.
  // Output: normalized booking item array.
  private extractItems(pageData: unknown): TableBookingHistoryItem[] {
    const payload = pageData as
      | {
          data?: unknown;
          content?: unknown;
          items?: unknown;
          records?: unknown;
          result?: unknown;
          rows?: unknown;
        }
      | null
      | undefined;

    const candidate =
      payload?.data ??
      payload?.content ??
      payload?.items ??
      payload?.records ??
      payload?.result ??
      payload?.rows;

    if (Array.isArray(candidate)) {
      return candidate as TableBookingHistoryItem[];
    }

    return [];
  }

  // Status badge helper.
  // Input: booking status code.
  // Output: CSS class modifier for status badge styling.
  private resolveStatusClass(statusCode: string | null | undefined): string {
    switch ((statusCode || '').toUpperCase()) {
      case 'CONFIRMED':
        return 'booking-status--confirmed';
      case 'PENDING':
        return 'booking-status--pending';
      case 'CANCELLED':
        return 'booking-status--cancelled';
      case 'COMPLETED':
        return 'booking-status--completed';
      default:
        return 'booking-status--default';
    }
  }

  // Date formatter.
  // Input: ISO/date string.
  // Output: localized date-time string or fallback dash.
  private formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(parsed);
  }

  // Currency formatter.
  // Input: amount value.
  // Output: localized VND string.
  private formatCurrency(value: number | null | undefined): string {
    const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount)} đ`;
  }

  // Default filter factory.
  // Input: none.
  // Output: fresh filter object with empty values.
  private createDefaultFilters(): TableBookingHistoryFilters {
    return {
      bookingStatus: '',
      customerName: '',
      phoneNumber: '',
      checkInAt: '',
      checkOutAt: '',
      sortField: 'checkInAt',
      sortDir: 'desc',
      active: '',
    };
  }

  // Filter normalizer.
  // Input: mutable form filter state.
  // Output: trimmed API-safe filter object.
  private normalizeFilters(filters: TableBookingHistoryFilters): TableBookingHistoryFilters {
    return {
      bookingStatus: filters.bookingStatus.trim(),
      customerName: filters.customerName.trim(),
      phoneNumber: filters.phoneNumber.trim(),
      checkInAt: filters.checkInAt.trim(),
      checkOutAt: filters.checkOutAt.trim(),
      sortField: filters.sortField,
      sortDir: filters.sortDir,
      active: filters.active.trim(),
    };
  }

  // Grid resize helper.
  // Input: current grid API.
  // Output: schedules size-to-fit on the next animation frame.
  private fitGridWidth(): void {
    const gridApi = this.gridApi;

    if (!gridApi) {
      return;
    }

    if (this.fitGridRafId !== null) {
      cancelAnimationFrame(this.fitGridRafId);
    }

    this.fitGridRafId = requestAnimationFrame(() => {
      this.fitGridRafId = null;
      gridApi.sizeColumnsToFit({ defaultMinWidth: 80 });
    });
  }

  // Grid render sync.
  // Input: latest rendered state.
  // Output: keeps overlays aligned with loading/data state.
  protected onStateRendered(_state: TableBookingHistoryViewState | null): void {
    // Overlays are driven by template bindings ([loading] and rowData).
  }

  private refreshGrid(): void {
    const currentQuery = this.querySubject.getValue();
    this.querySubject.next(currentQuery);
  }
}
