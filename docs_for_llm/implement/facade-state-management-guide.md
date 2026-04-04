# Hướng dẫn implement Facade Pattern + quản lý state cho màn hình bảng trong Angular

Tài liệu này được viết dựa trên cách triển khai hiện tại của module `PaymentChannelTable`, `PaymentChannelTableFacade` và `PaymentService`.

Mục tiêu của tài liệu:
- Chuẩn hóa cách dùng **Facade Pattern** trong Angular.
- Xác định rõ vai trò của **Component**, **Facade**, **Service**.
- Đề xuất cách quản lý **local feature state** bằng `signal`, `computed`, `effect`, kết hợp `RxJS` cho side effect bất đồng bộ.
- Đưa ra mẫu implement có thể tái sử dụng cho các màn CRUD / table khác.

---

## 1. Mục tiêu kiến trúc

Với một màn hình kiểu bảng dữ liệu có:
- tìm kiếm
- phân trang
- chọn nhiều dòng
- import / export
- update trạng thái hàng loạt
- thao tác với grid library

thì mục tiêu tốt nhất là tách thành 3 lớp:

### 1.1. Component
Chỉ chịu trách nhiệm:
- render UI
- nhận event từ template / grid / input
- gọi method từ facade

### 1.2. Facade
Chịu trách nhiệm:
- giữ state của feature
- tính toán selector / derived state
- xử lý luồng thao tác của người dùng
- gọi service
- đồng bộ loading / error / selection / reload

### 1.3. Service
Chỉ chịu trách nhiệm:
- gọi HTTP API
- trả về Observable đã typed
- map dữ liệu kỹ thuật nếu cần
- không chứa UI state

---

## 2. Kiến trúc hiện tại đang đúng ở đâu

Triển khai hiện tại đã đi đúng hướng ở các điểm sau:

### 2.1. Component làm UI shell
`PaymentChannelTable` đang khá mỏng:
- expose state từ facade ra template
- chuyển event UI xuống facade
- giữ AG Grid API ở cấp component

Đây là hướng đúng vì component không ôm business logic.

### 2.2. Facade giữ orchestration
`PaymentChannelTableFacade` đang quản lý:
- danh sách dữ liệu
- loading state
- import/export/update state
- paging
- selection
- nghiệp vụ approval

Đây là vai trò chuẩn của facade trong module feature.

### 2.3. Service giữ HTTP logic
`PaymentService` đang tương đối sạch:
- mỗi method tương ứng một endpoint
- ít trộn business UI vào service

Đây là điều nên giữ nguyên.

---

## 3. Facade pattern nên được hiểu như thế nào

Facade không phải là một service thường.

Facade là **lớp trung gian giữa UI và data/business flow**.

### 3.1. UI không nên biết
Component không nên biết:
- API nào được gọi
- request search được build như thế nào
- rule nào cho phép approve/reject
- khi import lỗi thì xử lý file lỗi ra sao
- khi action thành công có cần reload hay clear selection hay không

### 3.2. UI chỉ nên biết
Component chỉ nên biết:
- hiển thị gì
- nút nào có thể bấm
- khi có event thì gọi command nào

### 3.3. Facade cung cấp cho UI
Facade nên cung cấp:
- state để render
- selectors để bật/tắt UI
- commands để UI gọi

Ví dụ:
- `vm()`
- `isLoading()`
- `canApprove()`
- `search(criteria)`
- `changePage(page)`
- `approve(action)`

---

## 4. Kết hợp Signals và RxJS như thế nào cho đúng

### 4.1. Signals dùng cho synchronous UI state
Nên dùng `signal()` cho:
- rows
- selected ids
- filters
- page
- pageSize
- totalPages
- totalElements
- operation status
- error message

### 4.2. Computed dùng cho selector
Nên dùng `computed()` cho:
- `isEmpty`
- `selectedRows`
- `selectedStatus`
- `hasMixedStatus`
- `canSubmit`
- `canApprove`
- `canReject`
- `canCancel`
- `canRenew`

### 4.3. RxJS dùng cho async side effects
Nên dùng RxJS cho:
- gọi API search
- cancel request cũ bằng `switchMap`
- xử lý import/export
- chain reload sau action
- debounce thao tác reload nếu cần

### 4.4. Tư duy chuẩn
- **Signals** = state + selector
- **RxJS** = async orchestration

Không nên dùng một trong hai để làm tất cả mọi việc.

---

## 5. Vấn đề trong cách triển khai hiện tại

Dù kiến trúc hiện tại tốt, vẫn có một số điểm nên refactor để pattern ổn định hơn.

### 5.1. State đang bị tách quá nhiều signal rời
Hiện có nhiều signal riêng lẻ:
- `rowData`
- `selectedRows`
- `isLoading`
- `isExporting`
- `isImporting`
- `isUpdatingStatus`
- `currentPage`
- `totalPages`
- `totalElements`
- `pageSize`
- `criteria`

Vấn đề:
- khó snapshot state
- khó patch nhiều field cùng lúc
- khó test hơn
- dễ phân tán logic cập nhật state

### 5.2. Đang lưu `selectedRows` thay vì `selectedIds`
Lưu full object của row làm state selection dễ bị stale khi reload.

Khuyến nghị:
- lưu `selectedIds`
- derive `selectedRows` từ `rows`

### 5.3. Dùng `effect()` để tự động reload
Kiểu:
- state đổi
- effect chạy
- gọi reload
- Subject phát tín hiệu
- pipeline RxJS thực thi

Cách này chạy được nhưng flow hơi ẩn.

Khuyến nghị:
- command nào thay đổi state cần reload thì gọi `load()` trực tiếp

### 5.4. Dùng effect để bắn cảnh báo
Nếu dùng `effect()` để show warning khi selection mixed status, có thể gây spam toast.

Khuyến nghị:
- hiển thị inline warning
- hoặc chỉ validate và thông báo khi user bấm action

### 5.5. Facade đang trộn state với UI bridge event
Ví dụ `onClearSelection$` là event bridge để component gọi `gridApi.deselectAll()`.

Điều này chấp nhận được, nhưng cần nhận thức rõ:
- đây là **UI adapter event**
- không phải domain state

---

## 6. Pattern facade được khuyến nghị

Facade nên có 4 phần rõ ràng.

### 6.1. Private writable state
```ts
private readonly state = signal<PaymentChannelTableState>(initialState);
```

### 6.2. Public selectors
```ts
readonly rows = computed(() => this.state().rows);
readonly isLoading = computed(() => this.state().loadStatus === 'loading');
readonly selectedRows = computed(() => {
  const ids = new Set(this.state().selectedIds);
  return this.state().rows.filter(row => ids.has(row.id));
});
```

### 6.3. Public commands
```ts
search(criteria: PaymentChannelNativeSearchCriteria): void {}
resetSearch(): void {}
changePage(page: number): void {}
changePageSize(size: number): void {}
setSelection(rows: PaymentChannelTableData[]): void {}
approve(action: ApprovalAction): void {}
importExcel(file: File): void {}
exportExcel(): void {}
```

### 6.4. Private async pipelines
```ts
private setupLoadPipeline(): void {}
private load(): void {}
private runApprove(action: ApprovalAction): void {}
private runImport(file: File): void {}
private runExport(): void {}
```

---

## 7. Mẫu state nên dùng

```ts
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface PaymentChannelTableState {
  rows: PaymentChannelTableData[];
  selectedIds: number[];

  filters: PaymentChannelNativeSearchCriteria;
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;

  loadStatus: AsyncStatus;
  importStatus: AsyncStatus;
  exportStatus: AsyncStatus;
  approvalStatus: AsyncStatus;

  errorMessage: string | null;
}

export const initialState: PaymentChannelTableState = {
  rows: [],
  selectedIds: [],
  filters: {},
  page: 0,
  pageSize: 10,
  totalPages: 0,
  totalElements: 0,
  loadStatus: 'idle',
  importStatus: 'idle',
  exportStatus: 'idle',
  approvalStatus: 'idle',
  errorMessage: null,
};
```

### Lợi ích
- toàn bộ state gom về một chỗ
- dễ reset về trạng thái ban đầu
- dễ test và debug
- dễ patch state theo transaction

---

## 8. Patch helper nên có

```ts
private patchState(patch: Partial<PaymentChannelTableState>): void {
  this.state.update(current => ({ ...current, ...patch }));
}
```

### Lợi ích
- update state nhất quán
- giảm lặp code
- dễ audit luồng biến đổi state

---

## 9. Selectors nên triển khai như thế nào

### 9.1. Basic selectors
```ts
readonly rows = computed(() => this.state().rows);
readonly page = computed(() => this.state().page);
readonly pageSize = computed(() => this.state().pageSize);
readonly totalPages = computed(() => this.state().totalPages);
readonly totalElements = computed(() => this.state().totalElements);

readonly isLoading = computed(() => this.state().loadStatus === 'loading');
readonly isImporting = computed(() => this.state().importStatus === 'loading');
readonly isExporting = computed(() => this.state().exportStatus === 'loading');
readonly isUpdatingStatus = computed(() => this.state().approvalStatus === 'loading');
```

### 9.2. Selection selectors
```ts
readonly selectedRows = computed(() => {
  const ids = new Set(this.state().selectedIds);
  return this.state().rows.filter(r => ids.has(r.id));
});

readonly hasSelection = computed(() => this.state().selectedIds.length > 0);
```

### 9.3. Business selectors
```ts
readonly selectedStatus = computed(() => {
  const rows = this.selectedRows();
  if (rows.length === 0) return null;

  const first = rows[0].paraStatusCode;
  return rows.every(r => r.paraStatusCode === first) ? first : null;
});

readonly hasMixedStatus = computed(() => {
  const rows = this.selectedRows();
  if (rows.length <= 1) return false;

  const first = rows[0].paraStatusCode;
  return rows.some(r => r.paraStatusCode !== first);
});
```

### 9.4. Capability selectors
```ts
readonly canSubmit = computed(() =>
  this.isAdmin() && this.selectedStatus() === PARA_STATUS.NEW,
);

readonly canApprove = computed(() =>
  this.isAdmin() && this.selectedStatus() === PARA_STATUS.PENDING,
);

readonly canReject = computed(() =>
  this.isAdmin() && this.selectedStatus() === PARA_STATUS.PENDING,
);

readonly canCancel = computed(() =>
  this.isAdmin() && this.selectedStatus() === PARA_STATUS.APPROVED,
);

readonly canRenew = computed(() => {
  const status = this.selectedStatus();
  return this.isAdmin() && status !== null && [PARA_STATUS.REJECTED, PARA_STATUS.DELETED].includes(status);
});
```

---

## 10. Commands nên explicit, không nên ẩn

### 10.1. Search
```ts
search(filters: PaymentChannelNativeSearchCriteria): void {
  this.patchState({
    filters: filters ?? {},
    page: 0,
    selectedIds: [],
  });
  this.load();
}
```

### 10.2. Reset search
```ts
resetSearch(): void {
  this.patchState({
    filters: {},
    page: 0,
    selectedIds: [],
  });
  this.load();
}
```

### 10.3. Change page
```ts
changePage(page: number): void {
  this.patchState({
    page,
    selectedIds: [],
  });
  this.load();
}
```

### 10.4. Change page size
```ts
changePageSize(size: number): void {
  const validSize = Math.max(1, Math.min(1000, Math.floor(size) || 10));

  this.patchState({
    page: 0,
    pageSize: validSize,
    selectedIds: [],
  });
  this.load();
}
```

### 10.5. Set selection
```ts
setSelection(rows: PaymentChannelTableData[]): void {
  this.patchState({
    selectedIds: rows.map(r => r.id),
  });
}
```

### Tại sao command-based tốt hơn effect auto reload?
Vì nó làm flow rõ ràng:
- user action
- command được gọi
- state cập nhật
- load được trigger

Dễ đọc, dễ trace, dễ test.

---

## 11. Async loading pipeline nên triển khai thế nào

```ts
private readonly loadRequest$ = new Subject<void>();

constructor() {
  this.setupLoadPipeline();
}

private setupLoadPipeline(): void {
  this.loadRequest$
    .pipe(
      tap(() => {
        this.patchState({
          loadStatus: 'loading',
          errorMessage: null,
        });
      }),
      switchMap(() => {
        const s = this.state();

        const request = sanitizeNativeSearchRequest({
          ...s.filters,
          pageNo: s.page,
          pageSize: s.pageSize,
          sortField: 'id',
          sortDir: 'asc',
        });

        return this.paymentService.nativeSearch(request).pipe(
          map(res => ({ ok: true as const, res })),
          catchError(err => of({ ok: false as const, err })),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe(result => {
      if (!result.ok) {
        this.patchState({
          rows: [],
          totalPages: 0,
          totalElements: 0,
          loadStatus: 'error',
          errorMessage: 'Tải dữ liệu thất bại',
        });
        return;
      }

      const res: any = result.res;
      if (res?.status === 200 && res?.data) {
        this.patchState({
          rows: res.data.items ?? [],
          totalPages: res.data.totalPage ?? 0,
          totalElements: res.data.totalElements ?? 0,
          loadStatus: 'success',
        });
      } else {
        this.patchState({
          rows: [],
          totalPages: 0,
          totalElements: 0,
          loadStatus: 'success',
        });
      }
    });
}

private load(): void {
  this.loadRequest$.next();
}
```

### Điểm quan trọng
- `switchMap` để cancel request cũ
- trạng thái loading được cập nhật tập trung
- error handling nằm cùng một chỗ
- component không cần biết API hoạt động ra sao

---

## 12. Approval flow nên tổ chức thế nào

Approval là một command nghiệp vụ, nên có các bước cố định:

1. đọc selection hiện tại
2. validate selection
3. validate action phù hợp với status
4. gọi API
5. thông báo kết quả
6. clear selection
7. reload data

### Mẫu
```ts
approve(action: ApprovalAction): void {
  const rows = this.selectedRows();
  if (rows.length === 0) return;

  const currentStatus = this.selectedStatus();
  if (currentStatus === null) {
    this.notifyError('Các bản ghi được chọn phải có cùng trạng thái!');
    return;
  }

  const requiredStatuses = ACTION_REQUIRED_STATUS[action];
  if (!requiredStatuses.includes(currentStatus)) {
    this.notifyError('Action không hợp lệ với trạng thái hiện tại!');
    return;
  }

  this.runApprove(action, rows.map(r => r.id));
}
```

### Không nên
- dùng `effect()` để tự động show warning khi selection mixed status

### Nên
- validate khi user bấm action
- hoặc disable nút từ selector
- hoặc hiển thị inline notice trong UI

---

## 13. Import / Export nên thiết kế theo operation status riêng

### 13.1. Không nên chỉ dùng boolean rời rạc nếu feature còn mở rộng
Thay vì:
- `isLoading`
- `isImporting`
- `isExporting`
- `isUpdatingStatus`

nên thống nhất logic bằng status string:
- `loadStatus`
- `importStatus`
- `exportStatus`
- `approvalStatus`

### 13.2. Lợi ích
- dễ debug
- dễ mapping UI
- dễ thêm logic retry / success / error

### 13.3. Export cần chú ý phạm vi dữ liệu
Nếu export dùng `pageSize = 100` cố định thì có nguy cơ chỉ export 100 dòng đầu.

Cần thống nhất rõ một trong các cách:
- backend export theo filter, không phụ thuộc paging
- hoặc truyền `pageSize = totalElements`
- hoặc có cờ `exportAll`

---

## 14. Component nên giữ vai trò gì

### 14.1. Nên giữ
- grid api
- resize logic của grid
- DOM event handling
- file input event handling
- bridge giữa AG Grid và facade

### 14.2. Không nên giữ
- validate approval rule
- build request search
- xử lý import/export response
- logic phân quyền nghiệp vụ

### 14.3. Mẫu component tốt
```ts
onSearch(criteria: PaymentChannelNativeSearchCriteria): void {
  this.facade.search(criteria);
}

onPageChange(index: number): void {
  this.facade.changePage(index);
}

onApprove(): void {
  this.facade.approve('APPROVE');
}

onSelectionChanged(event: SelectionChangedEvent): void {
  const selected = event.api.getSelectedNodes()
    .map(n => n.data)
    .filter(Boolean) as PaymentChannelTableData[];

  this.facade.setSelection(selected);
}
```

---

## 15. Service layer nên giữ nguyên tắc nào

Service nên:
- chỉ wrap HTTP
- trả typed Observable
- không giữ state UI
- không quyết định reload hay clear selection
- không show toast

### Ví dụ tốt
```ts
importExcel(file: File): Observable<HttpResponse<Blob>> {
  const formData = new FormData();
  formData.append('file', file, file.name);

  return this.http.post(`${this.BASE_URL}/excel/import`, formData, {
    observe: 'response',
    responseType: 'blob',
  });
}
```

### Khuyến nghị thêm
- đưa `BASE_URL` sang `environment`
- siết typing để facade không phải dùng `any`

---

## 16. ViewModel pattern cho template

Nếu facade expose quá nhiều field riêng lẻ, component sẽ verbose.

Khuyến nghị:

```ts
readonly vm = computed(() => ({
  rows: this.rows(),
  isLoading: this.isLoading(),
  isImporting: this.isImporting(),
  isExporting: this.isExporting(),
  isUpdatingStatus: this.isUpdatingStatus(),
  totalPages: this.totalPages(),
  totalElements: this.totalElements(),
  hasSelection: this.hasSelection(),
  canSubmit: this.canSubmit(),
  canApprove: this.canApprove(),
  canReject: this.canReject(),
  canCancel: this.canCancel(),
  canRenew: this.canRenew(),
}));
```

### Lợi ích
- component gọn hơn
- template ít binding rời rạc hơn
- dễ chuẩn hóa pattern toàn dự án

---

## 17. Checklist refactor cho module hiện tại

### Ưu tiên cao
- [ ] Gom state rời rạc thành một object state duy nhất
- [ ] Đổi `selectedRows` thành `selectedIds`
- [ ] Bỏ `setupAutoReloadEffect()` và chuyển sang explicit `load()` trong commands
- [ ] Bỏ effect bắn alert khi mixed status
- [ ] Siết typing cho `importExcel()` và các response khác
- [ ] Thêm `errorMessage` hoặc trạng thái lỗi chuẩn hóa
- [ ] Kiểm tra lại logic export toàn bộ dữ liệu

### Ưu tiên trung bình
- [ ] Expose `vm` thay vì quá nhiều readonly field riêng lẻ
- [ ] Chuẩn hóa notify helper trong facade
- [ ] Đưa `BASE_URL` sang environment
- [ ] Chuẩn hóa pattern async status toàn module

### Ưu tiên nâng cao
- [ ] Tách base table facade dùng chung cho nhiều module
- [ ] Chuẩn hóa test strategy cho facade
- [ ] Tạo coding convention cho feature facade

---

## 18. Test strategy cho Facade

Facade là nơi nên được test nhiều nhất.

### Nên test

#### Search
- `search()` phải reset page về 0
- `search()` phải gọi load

#### Change page size
- `changePageSize()` phải validate size
- `changePageSize()` phải reset page về 0
- `changePageSize()` phải gọi load

#### Selection
- `setSelection()` phải lưu đúng `selectedIds`
- `selectedRows()` phải derive đúng từ `rows`

#### Approval
- không có selection thì không làm gì
- mixed status thì reject
- action không hợp lệ với status thì reject
- action thành công thì clear selection và reload

#### Import
- status 200 thì báo thành công và reload
- status 201 thì download file lỗi và reload
- error thì set error state hoặc notify lỗi

#### Load
- load thành công cập nhật rows/totals
- load lỗi cập nhật error state

---

## 19. Khi nào nên dùng local facade, khi nào nên dùng store lớn hơn

### Dùng local facade khi
- state chỉ phục vụ một màn hình / feature
- component tree không quá sâu
- không cần chia sẻ state toàn ứng dụng
- không cần time-travel/debug phức tạp

### Dùng store lớn hơn khi
- nhiều route/component dùng chung một state
- cần đồng bộ state trên nhiều vùng UI
- workflow phức tạp nhiều bước
- cần audit state transition nghiêm ngặt

Với module kiểu `PaymentChannelTable`, **local facade + signals + RxJS** là đủ tốt.

---

## 20. Kết luận triển khai khuyến nghị

Pattern nên áp dụng cho module này là:

### Component
- mỏng
- chỉ bind UI
- bridge event

### Facade
- giữ một object state duy nhất
- expose selectors / vm
- expose commands rõ ràng
- điều phối async flow bằng RxJS
- giữ business rule ở cấp feature

### Service
- chỉ làm HTTP
- typed rõ ràng
- không giữ UI concern

### Nguyên tắc quan trọng nhất
- **State nên tập trung**
- **Commands nên explicit**
- **Selectors nên pure**
- **Async flow nên đi qua RxJS pipeline**
- **UI side effects không nên bị treo trong passive effect một cách khó kiểm soát**

Nếu áp dụng đúng các điểm trên, module của bạn sẽ đạt được:
- dễ đọc
- dễ test
- dễ mở rộng
- dễ tái sử dụng pattern cho các màn table khác
- giảm bug do state phân tán và side effect ẩn

---

## 21. Mẫu cấu trúc thư mục khuyến nghị

```text
payment-channel/
  components/
    payment-channel-table/
      payment-channel-table.ts
      payment-channel-table.html
      payment-channel-table.css
  facades/
    payment-channel-table.facade.ts
  services/
    payment-channel.service.ts
  models/
    payment-channel-table-state.model.ts
    approve.model.ts
    payment-channel.model.ts
  utils/
    payment-channel-request.mapper.ts
    payment-channel-notify.util.ts
```

---

## 22. Quy ước coding đề xuất cho team

- Component không gọi HTTP trực tiếp.
- Component không chứa business rule.
- Service không chứa UI state.
- Mỗi feature table có một facade riêng.
- Facade giữ state bằng một object signal.
- Selectors dùng `computed()`.
- Async flow dùng RxJS pipeline.
- Reload không được trigger ngầm bằng effect nếu command có thể gọi trực tiếp.
- Selection nên lưu theo id, không lưu full object nếu không cần.
- Toast/alert nên bắn từ command flow hoặc notification service, không treo trong effect phản ứng thụ động.

---

## 23. Gợi ý lộ trình refactor thực tế

### Giai đoạn 1 - An toàn
- gom state
- thêm patch helper
- giữ nguyên API facade public hiện tại

### Giai đoạn 2 - Làm sạch flow
- bỏ auto reload effect
- đổi sang explicit load
- đổi selection sang selectedIds

### Giai đoạn 3 - Chuẩn hóa
- thêm vm selector
- chuẩn hóa async status
- chuẩn hóa notify helper
- thêm unit tests

### Giai đoạn 4 - Mở rộng tái sử dụng
- tạo base facade cho table feature chung
- trích common request builder / paging behavior

---

## 24. Tóm tắt một câu

Triển khai hiện tại của bạn có nền tảng tốt; bước tiếp theo là **chuẩn hóa facade thành command-driven local state container**, dùng **signals cho state**, **computed cho selector**, và **RxJS cho async side effects**.
