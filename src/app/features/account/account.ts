import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellClickedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  GridSizeChangedEvent,
  ICellRendererParams,
  RowDoubleClickedEvent,
  ValueFormatterParams,
  ValueGetterParams,
} from 'ag-grid-community';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  BehaviorSubject,
  catchError,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  AccountCreateRequest,
  AccountListItem,
  AccountSearchRequest,
  AccountUpdateRequest,
} from '../../core/models/account/account.model';
import { AccountService } from '../../core/services/account/account.service';
import { AccountFormDialog } from '../../shared/components/dialogs/account-form-dialog/account-form-dialog';
import { AccountDeleteDialog } from '../../shared/components/dialogs/account-delete-dialog/account-delete-dialog';

interface PageViewState<T> {
  isLoading: boolean;
  error: string | null;
  rowData: T[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

interface AccountSearchFilters {
  username: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  roleId: string;
  isActive: string;
  fromBirthDate: string;
  toBirthDate: string;
}

interface AccountQuery {
  page: number;
  limit: number;
  sortField?: string;
  sortDir?: string;
  filters: AccountSearchFilters;
}

@Component({
  standalone: true,
  selector: 'app-account',
  imports: [AsyncPipe, AgGridAngular, FormsModule, TuiButton],
  templateUrl: './account.html',
  styleUrl: './account.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account implements OnDestroy {
  private readonly accountService = inject(AccountService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private fitRafId: number | null = null;
  private debounceId: number | null = null;
  private readonly DEBOUNCE_MS = 500;
  protected readonly isExporting = signal(false);

  protected readonly activeStatusOptions = [
    { label: 'Tất cả', value: '' },
    { label: 'Đang hoạt động', value: 'true' },
    { label: 'Ngừng hoạt động', value: 'false' },
  ];
  protected readonly pageSizeOptions = [10, 20, 50];

  private readonly querySubject = new BehaviorSubject<AccountQuery>({
    page: 0,
    limit: 20,
    sortField: 'createdAt',
    sortDir: 'desc',
    filters: {
      username: '',
      fullName: '',
      email: '',
      phoneNumber: '',
      roleId: '',
      isActive: '',
      fromBirthDate: '',
      toBirthDate: '',
    },
  });

  protected readonly state$: Observable<PageViewState<AccountListItem>> = this.querySubject.pipe(
    switchMap((q) => this.fetchAccounts(q)),
    tap((s) => (this.latestState = s)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private latestState: PageViewState<AccountListItem> | null = null;
  private gridApi: GridApi<AccountListItem> | null = null;

  protected searchFilters: AccountSearchFilters = {
    username: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    roleId: '',
    isActive: '',
    fromBirthDate: '',
    toBirthDate: '',
  };

  protected readonly columnDefs: ColDef<AccountListItem>[] = [
    {
      headerName: 'STT',
      valueGetter: (p: ValueGetterParams<AccountListItem>) =>
        (p.node?.rowIndex ?? 0) +
        1 +
        (this.latestState?.currentPage ?? 0) * (this.latestState?.pageSize ?? 20),
      flex: 0.5,
      minWidth: 68,
      maxWidth: 88,
      pinned: 'left',
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-bold',
    },
    {
      headerName: 'Tên đăng nhập',
      field: 'username',
      minWidth: 160,
      flex: 1.2,
      sortable: true,
      filter: true,
      valueFormatter: (p: ValueFormatterParams<AccountListItem>) => p.value || '—',
      cellRenderer: (p: ICellRendererParams<AccountListItem>) => {
        const username = p.data?.username ?? '—';
        return `<span class="acc-username-cell">${username}</span>`;
      },
    },
    {
      headerName: 'Họ và tên',
      field: 'fullName',
      minWidth: 200,
      flex: 1.8,
      sortable: true,
      filter: true,
      valueFormatter: (p: ValueFormatterParams<AccountListItem>) => p.value || '—',
    },
    {
      headerName: 'Email',
      field: 'email',
      minWidth: 200,
      flex: 1.6,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<AccountListItem>) => p.value || '—',
    },
    {
      headerName: 'Số điện thoại',
      field: 'phoneNumber',
      minWidth: 150,
      flex: 1.2,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<AccountListItem>) => p.value || '—',
    },
    {
      headerName: 'Vai trò',
      field: 'roleName',
      minWidth: 140,
      flex: 1.1,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<AccountListItem>) => p.value || '—',
    },
    {
      headerName: 'Ngày sinh',
      field: 'dateOfBirth',
      minWidth: 140,
      flex: 1.1,
      sortable: false,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<AccountListItem>) => this.fmtDate(p.value),
    },
    {
      headerName: 'Trạng thái',
      field: 'isActive',
      minWidth: 150,
      flex: 1.1,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<AccountListItem>) => {
        const ok = p.value === true;
        return `<span class="status-badge status-badge--${ok ? 'active' : 'inactive'}">${
          ok ? 'Đang hoạt động' : 'Ngừng hoạt động'
        }</span>`;
      },
    },
    {
      headerName: 'Ngày tạo',
      field: 'createdAt',
      minWidth: 160,
      flex: 1.2,
      sortable: true,
      filter: false,
      valueFormatter: (p: ValueFormatterParams<AccountListItem>) => this.fmtDT(p.value),
    },
    {
      headerName: 'Thao tác',
      colId: 'acc-actions',
      cellRenderer: () =>
        `<span class="material-symbols-outlined action-icon action-icon--edit" data-action="edit" title="Chỉnh sửa">edit</span>` +
        `<span class="material-symbols-outlined action-icon action-icon--delete" data-action="delete" title="Khóa">lock</span>`,
      width: 110,
      minWidth: 110,
      maxWidth: 130,
      flex: 0,
      pinned: 'right',
      lockPinned: true,
      suppressSizeToFit: true,
      sortable: false,
      filter: false,
      cellClass: 'cell-center cell-actions',
    },
  ];

  protected readonly defaultColDef: ColDef = { resizable: true, minWidth: 100, flex: 1 };

  ngOnDestroy(): void {
    if (this.fitRafId !== null) cancelAnimationFrame(this.fitRafId);
  }

  protected onGridReady(e: GridReadyEvent<AccountListItem>): void {
    this.gridApi = e.api;
    this.fitGrid();
  }

  protected onGridSizeChanged(_e: GridSizeChangedEvent<AccountListItem>): void {
    this.fitGrid();
  }

  private fitGrid(): void {
    const api = this.gridApi;
    if (!api) return;
    if (this.fitRafId !== null) cancelAnimationFrame(this.fitRafId);
    this.fitRafId = requestAnimationFrame(() => {
      this.fitRafId = null;
      api.sizeColumnsToFit({ defaultMinWidth: 80 });
    });
  }

  protected onCellClicked(e: CellClickedEvent<AccountListItem>): void {
    if (e.colDef.colId !== 'acc-actions' || !e.data) return;
    const action = (e.event?.target as HTMLElement)
      ?.closest('[data-action]')
      ?.getAttribute('data-action');
    if (action === 'edit') this.openEditDialog(e.data);
    else if (action === 'delete') this.openDeleteDialog(e.data);
  }

  protected onRowDoubleClicked(e: RowDoubleClickedEvent<AccountListItem>): void {
    if (e.data) this.openEditDialog(e.data);
  }

  protected applySearch(): void {
    const c = this.querySubject.getValue();
    this.querySubject.next({ ...c, page: 0, filters: { ...this.searchFilters } });
  }

  protected onFiltersChanged(): void {
    if (this.debounceId) clearTimeout(this.debounceId);
    this.debounceId = window.setTimeout(() => this.applySearch(), this.DEBOUNCE_MS);
  }

  protected resetSearch(): void {
    this.searchFilters = {
      username: '',
      fullName: '',
      email: '',
      phoneNumber: '',
      roleId: '',
      isActive: '',
      fromBirthDate: '',
      toBirthDate: '',
    };
    this.applySearch();
  }

  protected exportExcel(): void {
    if (this.isExporting()) return;

    const q = this.querySubject.getValue();
    const request = this.buildSearchRequest({
      ...q,
      page: 0,
      limit: this.latestState?.totalElements || q.limit,
    });

    this.isExporting.set(true);
    this.accountService
      .exportExcel(request)
      .pipe(
        finalize(() => this.isExporting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => this.downloadExcel(blob),
        error: (e) => console.error('Không thể xuất Excel danh sách tài khoản.', e),
      });
  }

  protected setPageSize(s: number): void {
    const c = this.querySubject.getValue();
    if (c.limit === s) return;
    this.querySubject.next({ ...c, page: 0, limit: s });
  }

  protected prevPage(): void {
    const c = this.querySubject.getValue();
    if (c.page > 0) this.querySubject.next({ ...c, page: c.page - 1 });
  }

  protected nextPage(): void {
    const c = this.querySubject.getValue();
    if (this.latestState && c.page < this.latestState.totalPages - 1)
      this.querySubject.next({ ...c, page: c.page + 1 });
  }

  protected canPrev(s: PageViewState<AccountListItem> | null): boolean {
    return !!s && s.currentPage > 0 && !s.isLoading;
  }

  protected canNext(s: PageViewState<AccountListItem> | null): boolean {
    return !!s && s.currentPage < s.totalPages - 1 && !s.isLoading;
  }

  protected pageSummary(s: PageViewState<unknown> | null): string {
    if (!s) return 'Trang 1/1';
    return `Trang ${s.currentPage + 1}/${s.totalPages}`;
  }

  protected openCreateDialog(): void {
    this.dialogService
      .open<AccountCreateRequest | null>(
        new PolymorpheusComponent(AccountFormDialog, this.injector),
        { data: { mode: 'create', account: null }, size: 'm', dismissible: true, closeable: false },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.accountService
          .create(payload as AccountCreateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
      });
  }

  private openEditDialog(account: AccountListItem): void {
    this.dialogService
      .open<AccountUpdateRequest | null>(
        new PolymorpheusComponent(AccountFormDialog, this.injector),
        { data: { mode: 'edit', account }, size: 'm', dismissible: true, closeable: false },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (!payload) return;
        this.accountService
          .update(payload as AccountUpdateRequest)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
      });
  }

  private openDeleteDialog(account: AccountListItem): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(AccountDeleteDialog, this.injector), {
        data: { account },
        size: 's',
        dismissible: true,
        closeable: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.accountService
          .delete(account.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({ next: () => this.refresh(), error: (e) => console.error(e) });
      });
  }

  private refresh(): void {
    this.querySubject.next(this.querySubject.getValue());
  }

  private fetchAccounts(q: AccountQuery): Observable<PageViewState<AccountListItem>> {
    const req = this.buildSearchRequest(q);

    return this.accountService.search(req).pipe(
      map((r) => ({
        isLoading: false,
        error: null,
        rowData: r.data.rows,
        currentPage: r.data.pageNo,
        pageSize: r.data.pageSize,
        totalElements: r.data.totalElements,
        totalPages: r.data.totalPages,
      })),
      startWith({
        isLoading: true,
        error: null,
        rowData: [],
        currentPage: 0,
        pageSize: q.limit,
        totalElements: 0,
        totalPages: 1,
      }),
      catchError(() =>
        of({
          isLoading: false,
          error: 'Không thể tải danh sách tài khoản.',
          rowData: [],
          currentPage: 0,
          pageSize: q.limit,
          totalElements: 0,
          totalPages: 1,
        }),
      ),
    );
  }

  private buildSearchRequest(q: AccountQuery): AccountSearchRequest {
    const f = q.filters;
    const active = f.isActive === 'true' ? true : f.isActive === 'false' ? false : undefined;
    const roleId = f.roleId ? Number(f.roleId) : undefined;

    return {
      page: q.page,
      limit: q.limit,
      sortField: q.sortField,
      sortDir: q.sortDir,
      username: f.username || undefined,
      fullName: f.fullName || undefined,
      email: f.email || undefined,
      phoneNumber: f.phoneNumber || undefined,
      roleId: Number.isFinite(roleId) ? roleId : undefined,
      isActive: active,
      fromBirthDate: f.fromBirthDate || undefined,
      toBirthDate: f.toBirthDate || undefined,
    };
  }

  private downloadExcel(blob: Blob): void {
    const fileName = `DANH_SACH_TAI_KHOAN_${Date.now()}.xlsx`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private fmtDate(iso: string): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(iso));
  }

  private fmtDT(iso: string): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );
  }
}
