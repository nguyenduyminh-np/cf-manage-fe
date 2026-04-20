import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import {
  BehaviorSubject,
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';

import {
  TableBookingDetailData,
  TableBookingUpdateRequest,
} from '../../../../core/models/table-booking-detail/table-booking-detail.models';
import { TableBookingDetailService } from '../../../../core/services/table-booking-detail/table-booking-detail.service';

interface StatusChipUi {
  label: string;
  icon: string;
  className: string;
}

interface PaymentStatusUi {
  label: string;
  icon: string;
  className: string;
}

export interface TableBookingDetailViewModel {
  bookingCode: string;
  statusLabel: string;
  statusIcon: string;
  statusChipClass: string;
  tableName: string;
  tableCode: string;
  customerBadgeLabel: string;
  customerBadgeIcon: string;
  creatorName: string;
  creatorTimeLabel: string;
  paymentStatusLabel: string;
  paymentStatusIcon: string;
  paymentStatusClass: string;
}

export interface TableBookingDetailViewState {
  isLoading: boolean;
  error: string | null;
  vm: TableBookingDetailViewModel | null;
}

type TableBookingDetailDialogInput =
  | number
  | {
      bookingId: number;
    }
  | null
  | undefined;

const BOOKING_STATUS_UI_MAP: Record<string, StatusChipUi> = {
  PENDING_CONFIRMATION: {
    label: 'Chờ xác nhận',
    icon: 'pending',
    className: 'table-booking-detail__status-chip--pending',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    icon: 'check_circle',
    className: 'table-booking-detail__status-chip--confirmed',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: 'cancel',
    className: 'table-booking-detail__status-chip--cancelled',
  },
};

const PAYMENT_STATUS_PAID: PaymentStatusUi = {
  label: 'Đã thanh toán',
  icon: 'check_circle',
  className: 'table-booking-detail__payment-status--paid',
};

const PAYMENT_STATUS_UNPAID: PaymentStatusUi = {
  label: 'Chưa thanh toán',
  icon: 'error',
  className: 'table-booking-detail__payment-status--unpaid',
};

const PAYMENT_STATUS_UNKNOWN: PaymentStatusUi = {
  label: 'Chưa rõ trạng thái',
  icon: 'help',
  className: 'table-booking-detail__payment-status--unknown',
};

@Component({
  selector: 'app-table-booking-detail',
  imports: [NgClass, ReactiveFormsModule],
  providers: [TableBookingDetailService],
  templateUrl: './table-booking-detail.html',
  styleUrl: './table-booking-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableBookingDetail {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tableBookingDetailService = inject(TableBookingDetailService);
  private readonly dialogContext = inject(POLYMORPHEUS_CONTEXT, {
    optional: true,
  }) as TuiDialogContext<void, TableBookingDetailDialogInput> | null;
  private readonly bookingIdSubject = new BehaviorSubject<number | null | undefined>(undefined);

  private latestBookingId: number | null = null;
  private currentDetail: TableBookingDetailData | null = null;

  protected readonly isUpdating = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly updateError = signal<string | null>(null);
  protected readonly isDepositSectionLocked = signal(false);

  protected readonly bookingStatusOptions = [
    { value: 'PENDING_CONFIRMATION', label: 'Chờ xác nhận' },
    { value: 'CONFIRMED', label: 'Đã xác nhận' },
    { value: 'CANCELLED', label: 'Đã hủy' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'EXPIRED', label: 'Đã hết hạn' },
  ] as const;

  protected readonly editForm = this.fb.group({
    expectedArriveTime: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    expectedCheckOut: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    bookingStatus: this.fb.nonNullable.control('PENDING_CONFIRMATION', {
      validators: [Validators.required],
    }),
    customerName: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    phoneNumber: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.pattern(/^[0-9+()\-\s]{8,20}$/)],
    }),
    depositAmount: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    depositPaid: this.fb.nonNullable.control(false),
    note: this.fb.nonNullable.control(''),
  });

  @Output() readonly closed = new EventEmitter<void>();

  constructor() {
    const contextBookingId = this.resolveContextBookingId(this.dialogContext?.data);

    if (contextBookingId !== null) {
      this.latestBookingId = contextBookingId;
      this.bookingIdSubject.next(contextBookingId);
    }
  }

  @Input()
  set bookingId(value: number | null | undefined) {
    const normalizedBookingId = this.normalizeBookingId(value);
    this.latestBookingId = normalizedBookingId;
    this.updateError.set(null);
    this.submitAttempted.set(false);
    this.bookingIdSubject.next(value === undefined ? undefined : normalizedBookingId);
  }

  protected readonly detailState$: Observable<TableBookingDetailViewState> =
    this.bookingIdSubject.pipe(
      switchMap((bookingId) => this.fetchDetailState(bookingId)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  protected readonly detailState = toSignal(this.detailState$, {
    initialValue: this.createState({}),
  });

  protected close(): void {
    this.dialogContext?.completeWith();
    this.closed.emit();
  }

  protected retry(): void {
    this.bookingIdSubject.next(this.latestBookingId);
  }

  protected submitUpdate(): void {
    if (this.isUpdating()) {
      return;
    }

    const detail = this.currentDetail;

    if (!detail) {
      this.updateError.set('Không có dữ liệu để cập nhật. Vui lòng tải lại.');
      return;
    }

    this.submitAttempted.set(true);
    this.updateError.set(null);
    this.editForm.markAllAsTouched();

    if (this.editForm.invalid) {
      return;
    }

    const rawValue = this.editForm.getRawValue();
    const expectedArriveTime = rawValue.expectedArriveTime.trim();
    const expectedCheckOut = rawValue.expectedCheckOut.trim();
    const expectedArriveMs = new Date(expectedArriveTime).getTime();
    const expectedCheckOutMs = new Date(expectedCheckOut).getTime();

    if (!Number.isFinite(expectedArriveMs) || !Number.isFinite(expectedCheckOutMs)) {
      this.updateError.set('Thời gian đến/trả bàn không hợp lệ.');
      return;
    }

    if (expectedCheckOutMs <= expectedArriveMs) {
      this.updateError.set('Thời gian trả bàn phải lớn hơn thời gian đến.');
      return;
    }

    const isDepositLocked = this.isDepositSectionLocked();
    const normalizedDepositAmount = isDepositLocked
      ? this.normalizeDepositAmount(detail.depositAmount)
      : this.normalizeDepositAmount(rawValue.depositAmount);
    const hasDeposit = normalizedDepositAmount !== null;
    const depositPaid = isDepositLocked
      ? detail.depositPaid === true
      : hasDeposit
        ? rawValue.depositPaid
        : false;
    const depositPaidAt = isDepositLocked
      ? detail.depositPaidAt
      : hasDeposit && depositPaid
        ? (detail.depositPaidAt ?? new Date().toISOString())
        : null;
    const request: TableBookingUpdateRequest = {
      bookingId: detail.bookingId,
      tableId: detail.tableId,
      expectedArriveTime,
      expectedCheckOut,
      customerName: rawValue.customerName.trim(),
      phoneNumber: rawValue.phoneNumber.trim(),
      depositAmount: normalizedDepositAmount ?? undefined,
      depositPaid,
      depositPaidAt,
      depositForfeited: detail.depositForfeited ?? false,
      depositTxnRef: detail.depositTxnRef,
      bookingStatus: rawValue.bookingStatus.trim(),
      note: rawValue.note.trim(),
      active: detail.active ?? true,
    };

    this.isUpdating.set(true);

    this.tableBookingDetailService
      .updateBooking(request)
      .pipe(
        finalize(() => this.isUpdating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.submitAttempted.set(false);
          this.close();
        },
        error: (error: unknown) => {
          this.updateError.set(this.toUpdateErrorMessage(error));
        },
      });
  }

  protected showControlError(
    controlName:
      | 'expectedArriveTime'
      | 'expectedCheckOut'
      | 'bookingStatus'
      | 'customerName'
      | 'phoneNumber'
      | 'depositAmount',
  ): boolean {
    const control = this.editForm.controls[controlName];

    if (controlName === 'depositAmount' && this.isDepositSectionLocked()) {
      return false;
    }

    return control.invalid && (control.touched || control.dirty || this.submitAttempted());
  }

  private fetchDetailState(
    bookingId: number | null | undefined,
  ): Observable<TableBookingDetailViewState> {
    this.updateError.set(null);

    if (bookingId === undefined) {
      this.currentDetail = null;
      this.isDepositSectionLocked.set(false);
      return of(this.createState({}));
    }

    if (bookingId === null) {
      this.currentDetail = null;
      this.isDepositSectionLocked.set(false);
      return of(
        this.createState({
          error: 'bookingId không hợp lệ. bookingId bắt buộc là số lớn hơn 0.',
        }),
      );
    }

    return this.tableBookingDetailService.getBookingDetail({ bookingId }).pipe(
      map((response) => response?.data ?? null),
      map((detail) => {
        if (!detail) {
          this.currentDetail = null;
          return this.createState({ error: 'Không tìm thấy dữ liệu chi tiết đơn đặt bàn.' });
        }

        this.currentDetail = detail;
        this.isDepositSectionLocked.set(this.hasExistingDeposit(detail));
        this.patchEditForm(detail);

        return this.createState({ vm: this.toViewModel(detail) });
      }),
      startWith(this.createState({ isLoading: true })),
      catchError((error) =>
        of(
          this.createState({
            error: this.toErrorMessage(error),
          }),
        ),
      ),
    );
  }

  private patchEditForm(detail: TableBookingDetailData): void {
    const depositAmount = this.normalizeDepositAmount(detail.depositAmount);

    this.editForm.patchValue(
      {
        expectedArriveTime: this.toDateTimeLocal(detail.expectedArriveTime),
        expectedCheckOut: this.toDateTimeLocal(detail.expectedCheckOut),
        bookingStatus: detail.bookingStatus?.trim() || 'PENDING_CONFIRMATION',
        customerName: detail.customerName?.trim() || '',
        phoneNumber: detail.phoneNumber?.trim() || '',
        depositAmount,
        depositPaid: detail.depositPaid === true,
        note: detail.note?.trim() || '',
      },
      { emitEvent: false },
    );
  }

  private hasExistingDeposit(detail: TableBookingDetailData): boolean {
    const depositAmount = this.normalizeDepositAmount(detail.depositAmount);
    return (
      (typeof depositAmount === 'number' && depositAmount > 0) ||
      detail.depositPaid === true ||
      Boolean(detail.depositPaidAt?.trim())
    );
  }

  private toViewModel(detail: TableBookingDetailData): TableBookingDetailViewModel {
    const statusUi = this.resolveStatusUi(detail.bookingStatus, detail.bookingStatusName);
    const paymentStatusUi = this.resolvePaymentStatusUi(detail.depositPaid);
    const hasContact = Boolean(detail.phoneNumber?.trim());

    return {
      bookingCode: this.formatBookingCode(detail.bookingId),
      statusLabel: statusUi.label,
      statusIcon: statusUi.icon,
      statusChipClass: statusUi.className,
      tableName: this.formatText(detail.tableName),
      tableCode: this.formatText(detail.tableCode),
      customerBadgeLabel: hasContact ? 'Đã có thông tin liên hệ' : 'Chưa có số điện thoại',
      customerBadgeIcon: hasContact ? 'verified' : 'warning',
      creatorName: this.formatText(detail.accountFullName),
      creatorTimeLabel: this.formatDateTime(detail.createdAt),
      paymentStatusLabel: paymentStatusUi.label,
      paymentStatusIcon: paymentStatusUi.icon,
      paymentStatusClass: paymentStatusUi.className,
    };
  }

  private resolveStatusUi(statusCode: string, statusName?: string | null): StatusChipUi {
    const mappedStatus = BOOKING_STATUS_UI_MAP[statusCode];

    if (mappedStatus) {
      return {
        ...mappedStatus,
        label: statusName?.trim() || mappedStatus.label,
      };
    }

    return {
      label: statusName?.trim() || this.formatText(statusCode, 'Không xác định'),
      icon: 'help',
      className: 'table-booking-detail__status-chip--unknown',
    };
  }

  private resolvePaymentStatusUi(depositPaid: boolean | null): PaymentStatusUi {
    if (depositPaid === true) {
      return PAYMENT_STATUS_PAID;
    }

    if (depositPaid === false) {
      return PAYMENT_STATUS_UNPAID;
    }

    return PAYMENT_STATUS_UNKNOWN;
  }

  private createState(partial: Partial<TableBookingDetailViewState>): TableBookingDetailViewState {
    return {
      isLoading: false,
      error: null,
      vm: null,
      ...partial,
    };
  }

  private normalizeBookingId(value: number | null | undefined): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    if (value <= 0) {
      return null;
    }

    return Math.trunc(value);
  }

  private normalizeDepositAmount(value: number | null): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return null;
    }

    return value;
  }

  private toDateTimeLocal(value: string | null): string {
    const parsedDate = this.parseDate(value);

    if (!parsedDate) {
      return '';
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const hours = String(parsedDate.getHours()).padStart(2, '0');
    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private toErrorMessage(error: unknown): string {
    const parsedError = (error ?? {}) as {
      status?: number;
      error?: {
        code?: string;
        message?: string;
      };
    };

    const statusCode = parsedError.status;
    const businessCode = parsedError.error?.code;
    const backendMessage = parsedError.error?.message;

    if (statusCode === 400 && businessCode === 'INVALID_DATA') {
      return 'bookingId không hợp lệ hoặc không tồn tại booking đang active.';
    }

    if (statusCode === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }

    if (statusCode === 403) {
      return 'Bạn không có quyền truy cập chi tiết đơn đặt bàn này.';
    }

    if (statusCode === 500) {
      return 'Hệ thống đang bận. Vui lòng thử lại sau.';
    }

    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }

    return 'Không tải được chi tiết đặt bàn. Vui lòng thử lại.';
  }

  private toUpdateErrorMessage(error: unknown): string {
    const parsedError = (error ?? {}) as {
      status?: number;
      error?: {
        code?: string;
        message?: string;
      };
    };

    const statusCode = parsedError.status;
    const backendCode = parsedError.error?.code;
    const backendMessage = parsedError.error?.message;

    if (statusCode === 400 && backendCode === 'INVALID_DATA') {
      return 'Dữ liệu cập nhật chưa hợp lệ. Vui lòng kiểm tra lại thông tin.';
    }

    if (statusCode === 400 && backendCode === 'BOOKING_STATE_TRANSITION_INVALID') {
      return 'Trạng thái booking chuyển không hợp lệ. Vui lòng kiểm tra lại trạng thái cập nhật.';
    }

    if (statusCode === 401 || statusCode === 403) {
      return 'Bạn không có quyền cập nhật đơn đặt bàn này.';
    }

    if (statusCode === 409 && backendCode === 'TABLE_LOCK_BUSY') {
      return 'Đơn đặt bàn đang được xử lý bởi người khác. Vui lòng thử lại.';
    }

    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage.trim();
    }

    return 'Không thể cập nhật đơn đặt bàn. Vui lòng thử lại.';
  }

  private resolveContextBookingId(data: TableBookingDetailDialogInput): number | null {
    if (typeof data === 'number') {
      return this.normalizeBookingId(data);
    }

    if (data && typeof data === 'object') {
      return this.normalizeBookingId(data.bookingId);
    }

    return null;
  }

  private formatBookingCode(bookingId: number): string {
    return Number.isFinite(bookingId) && bookingId > 0 ? `#${bookingId}` : '-';
  }

  private formatDateTime(value: string | null): string {
    const parsedDate = this.parseDate(value);

    if (!parsedDate) {
      return '-';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(parsedDate);
  }

  private parseDate(value: string | null): Date | null {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private formatText(value: string | null | undefined, fallback = '-'): string {
    if (typeof value !== 'string') {
      return fallback;
    }

    const trimmed = value.trim();
    return trimmed || fallback;
  }
}
