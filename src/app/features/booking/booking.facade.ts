import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  debounce,
  catchError,
  distinctUntilChanged,
  filter,
  map,
  of,
  pairwise,
  startWith,
  Subject,
  switchMap,
  tap,
  timer,
} from 'rxjs';

import { TableSearchRequest } from '../../core/models/table-search-request.model';
import { TableStatus, TableSummary } from '../../core/models/table.model';
import { TableService } from '../../core/services/table.service';

export type FloorValue = 1 | 2 | 3;
export type SeatFilterValue = number | null;
export type StatusFilterValue = TableStatus | null;
export type FloorFilterValue = FloorValue | null;

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

interface BookingTableMetadata {
  label: string;
  value: string;
}

export interface BookingTable extends TableSummary {
  metadata: BookingTableMetadata[];
}

export interface BookingSearchFormValue {
  keyword: string;
  seats: SeatFilterValue;
  status: StatusFilterValue;
  floor: FloorFilterValue;
}

interface BookingState {
  tables: BookingTable[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  filters: BookingSearchFormValue;
  loadStatus: LoadStatus;
  loadError: string;
}

const INITIAL_STATE: BookingState = {
  tables: [],
  currentPage: 1,
  totalPages: 1,
  totalElements: 0,
  pageSize: 12,
  filters: {
    keyword: '',
    seats: null,
    status: null,
    floor: null,
  },
  loadStatus: 'idle',
  loadError: '',
};

@Injectable()
export class BookingFacade {
  private readonly tableService = inject(TableService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly state = signal<BookingState>(INITIAL_STATE);
  private readonly loadTrigger$ = new Subject<void>();
  private readonly filterChange$ = new Subject<BookingSearchFormValue>();

  readonly pageSize = computed(() => this.state().pageSize);
  readonly isLoading = computed(() => this.state().loadStatus === 'loading');
  readonly loadError = computed(() => this.state().loadError);
  readonly pagedTables = computed(() => this.state().tables);
  readonly totalCount = computed(() => this.state().totalElements);
  readonly totalPages = computed(() => this.state().totalPages);

  readonly currentPageWithinRange = computed(() => {
    const snapshot = this.state();
    return Math.max(1, Math.min(snapshot.currentPage, snapshot.totalPages));
  });

  readonly visibleCount = computed(() => this.pagedTables().length);

  readonly countStart = computed(() => {
    const visible = this.visibleCount();
    if (visible === 0) {
      return 0;
    }

    return (this.currentPageWithinRange() - 1) * this.pageSize() + 1;
  });

  readonly countEnd = computed(() => {
    const visible = this.visibleCount();
    if (visible === 0) {
      return 0;
    }

    return this.countStart() + visible - 1;
  });

  readonly visiblePageNumbers = computed(() => {
    const totalPages = this.totalPages();

    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const page = this.currentPageWithinRange();

    if (page <= 2) {
      return [1, 2, 3];
    }

    if (page >= totalPages - 1) {
      return [totalPages - 2, totalPages - 1, totalPages];
    }

    return [page - 1, page, page + 1];
  });

  constructor() {
    this.setupFilterPipeline();
    this.setupLoadPipeline();
  }

  initialize(initialFilters: BookingSearchFormValue): void {
    this.patchState({
      filters: this.normalizeFilters(initialFilters),
      currentPage: 1,
    });
    this.loadTrigger$.next();
  }

  onFiltersChanged(formValue: BookingSearchFormValue): void {
    this.filterChange$.next(formValue);
  }

  forceReload(): void {
    this.loadTrigger$.next();
  }

  goToPage(page: number): void {
    const nextPage = Math.min(Math.max(page, 1), this.totalPages());

    if (nextPage === this.currentPageWithinRange()) {
      return;
    }

    this.patchState({ currentPage: nextPage });
    this.loadTrigger$.next();
  }

  private setupFilterPipeline(): void {
    this.filterChange$
      .pipe(
        map((formValue) => this.normalizeFilters(formValue)),
        distinctUntilChanged((previous, current) => this.areFiltersEqual(previous, current)),
        startWith(this.state().filters),
        pairwise(),
        tap(([, filters]) => {
          this.patchState({
            filters,
            currentPage: 1,
          });
        }),
        filter(([previous, current]) => this.shouldTriggerLoad(previous, current)),
        debounce(([previous, current]) => timer(this.resolveDebounceMs(previous, current))),
        tap(() => this.loadTrigger$.next()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private setupLoadPipeline(): void {
    this.loadTrigger$
      .pipe(
        tap(() => {
          this.patchState({
            loadStatus: 'loading',
            loadError: '',
          });
        }),
        switchMap(() =>
          this.tableService.search(this.buildRequest()).pipe(
            map((response) => {
              if (!response) {
                throw new Error('Empty response');
              }

              const tableList = response.data?.data ?? [];

              return {
                tables: tableList.map((table) => this.toBookingTable(table)),
                totalElements: response.data?.totalElements ?? tableList.length,
                totalPages: Math.max(1, response.data?.totalPages ?? 1),
                currentPage: (response.data?.pageNo ?? 0) + 1,
                loadStatus: 'success' as const,
                loadError: '',
              };
            }),
            catchError(() =>
              of({
                tables: [],
                totalElements: 0,
                totalPages: 1,
                currentPage: 1,
                loadStatus: 'error' as const,
                loadError: 'Không tải được danh sách bàn. Vui lòng thử lại.',
              }),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.patchState(result);
      });
  }

  private patchState(patch: Partial<BookingState>): void {
    this.state.update((current) => ({ ...current, ...patch }));
  }

  private buildRequest(): TableSearchRequest {
    const snapshot = this.state();
    const normalizedKeyword = this.normalizeKeywordForSearch(snapshot.filters.keyword);

    return {
      page: snapshot.currentPage - 1,
      limit: snapshot.pageSize,
      sortField: 'lastBookingTime',
      sortDir: 'DESC',
      keyword: normalizedKeyword || null,
      floor: snapshot.filters.floor,
      slot: snapshot.filters.seats,
      tableStatus: snapshot.filters.status,
      active: null,
    };
  }

  private normalizeFilters(formValue: BookingSearchFormValue): BookingSearchFormValue {
    return {
      keyword: formValue.keyword.trim(),
      seats: formValue.seats,
      status: formValue.status,
      floor: formValue.floor,
    };
  }

  private areFiltersEqual(
    previous: BookingSearchFormValue,
    current: BookingSearchFormValue,
  ): boolean {
    return (
      previous.keyword === current.keyword &&
      previous.seats === current.seats &&
      previous.status === current.status &&
      previous.floor === current.floor
    );
  }

  private shouldTriggerLoad(
    previous: BookingSearchFormValue,
    current: BookingSearchFormValue,
  ): boolean {
    if (this.hasNonKeywordFilterChanged(previous, current)) {
      return true;
    }

    return (
      this.normalizeKeywordForSearch(previous.keyword) !==
      this.normalizeKeywordForSearch(current.keyword)
    );
  }

  private resolveDebounceMs(
    previous: BookingSearchFormValue,
    current: BookingSearchFormValue,
  ): number {
    if (this.hasNonKeywordFilterChanged(previous, current)) {
      return 0;
    }

    return 350;
  }

  private hasNonKeywordFilterChanged(
    previous: BookingSearchFormValue,
    current: BookingSearchFormValue,
  ): boolean {
    return (
      previous.seats !== current.seats ||
      previous.status !== current.status ||
      previous.floor !== current.floor
    );
  }

  private normalizeKeywordForSearch(value: string): string {
    const normalized = value.trim();

    // Ignore overly-short keywords to reduce noisy requests while typing.
    if (normalized.length > 0 && normalized.length < 2) {
      return '';
    }

    return normalized;
  }

  private toBookingTable(table: TableSummary): BookingTable {
    return {
      ...table,
      metadata: [
        { label: 'Mã bàn', value: table.tableCode },
        { label: 'Tầng', value: `Tầng ${table.floor}` },
        { label: 'Số chỗ', value: `${table.slot}` },
        { label: 'Lần đặt gần nhất', value: this.formatTime(table.lastBookingTime) },
      ],
    };
  }

  private formatTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(parsedDate);
  }
}
