import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

import { AuthFacade } from '../../../../../core/facade/auth.facade';
import {
  BookingRequestPayload,
  BookingStatusCode,
  BookingStatusOption,
  PosTableBookingDialogInput,
  PosTableBookingDialogResult,
  SelectOption,
  TableCard,
  TableSearchQuery,
} from '../../../../../core/models/table-booking/table-booking.model';
import { PosTableBookingService } from '../../../../../core/services/POS/pos-table-booking/pos-table-booking.service';

interface SearchFormValue {
  floor: number | null;
  seat: number | null;
  keyword: string;
}

const DATE_TIME_CONFLICT_ERROR = 'dateTimeConflict';
const OPERATING_HOURS_CONFLICT_ERROR = 'operatingHoursConflict';
const WALK_IN_NOTE_PREFIX = 'KHÁCH VÃNG LAI';
const SHOP_OPEN_HOUR = 6;
const LAST_BOOKABLE_ARRIVAL_HOUR = 20;
const SHOP_CLOSE_TOTAL_MINUTES = 24 * 60;

function buildExpectedArriveTimeLocal(dateValue: unknown, hourValue: unknown): string | null {
  if (typeof dateValue !== 'string') {
    return null;
  }

  const normalizedDate = dateValue.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return null;
  }

  const parsedHour =
    typeof hourValue === 'number'
      ? hourValue
      : typeof hourValue === 'string' && hourValue.trim()
        ? Number(hourValue)
        : Number.NaN;

  if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23) {
    return null;
  }

  return `${normalizedDate}T${String(parsedHour).padStart(2, '0')}:00`;
}

function expectedCheckoutValidator(
  arriveDateControlName: string,
  arriveHourControlName: string,
  durationControlName: string,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const arriveDateValue = control.get(arriveDateControlName)?.value;
    const arriveHourValue = control.get(arriveHourControlName)?.value;
    const durationValue = control.get(durationControlName)?.value;

    if (
      !arriveDateValue ||
      arriveHourValue === null ||
      arriveHourValue === undefined ||
      arriveHourValue === '' ||
      durationValue === null ||
      durationValue === undefined ||
      durationValue === ''
    ) {
      return null;
    }

    const arriveDateTime = buildExpectedArriveTimeLocal(arriveDateValue, arriveHourValue);

    if (!arriveDateTime) {
      return null;
    }

    const arriveTime = new Date(arriveDateTime);
    const durationHours = Number(durationValue);

    if (Number.isNaN(arriveTime.getTime()) || !Number.isFinite(durationHours)) {
      return null;
    }

    if (durationHours <= 0) {
      return { [DATE_TIME_CONFLICT_ERROR]: true };
    }

    const expectedCheckoutTime = arriveTime.getTime() + durationHours * 60 * 60 * 1000;

    return expectedCheckoutTime > arriveTime.getTime()
      ? null
      : { [DATE_TIME_CONFLICT_ERROR]: true };
  };
}

function operatingHoursValidator(
  arriveDateControlName: string,
  arriveHourControlName: string,
  durationControlName: string,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const arriveDateValue = control.get(arriveDateControlName)?.value;
    const arriveHourValue = control.get(arriveHourControlName)?.value;
    const durationValue = control.get(durationControlName)?.value;

    if (
      !arriveDateValue ||
      arriveHourValue === null ||
      arriveHourValue === undefined ||
      arriveHourValue === '' ||
      durationValue === null ||
      durationValue === undefined ||
      durationValue === ''
    ) {
      return null;
    }

    const arriveDateTime = buildExpectedArriveTimeLocal(arriveDateValue, arriveHourValue);

    if (!arriveDateTime) {
      return null;
    }

    const arriveTime = new Date(arriveDateTime);
    const durationHours = Number(durationValue);

    if (
      Number.isNaN(arriveTime.getTime()) ||
      !Number.isFinite(durationHours) ||
      durationHours <= 0
    ) {
      return null;
    }

    const dayStart = new Date(arriveTime);
    dayStart.setHours(0, 0, 0, 0);

    const arriveMinutes = Math.floor((arriveTime.getTime() - dayStart.getTime()) / (60 * 1000));
    const expectedCheckoutMinutes = arriveMinutes + durationHours * 60;
    const isConflict =
      arriveMinutes < SHOP_OPEN_HOUR * 60 || expectedCheckoutMinutes > SHOP_CLOSE_TOTAL_MINUTES;

    return isConflict ? { [OPERATING_HOURS_CONFLICT_ERROR]: true } : null;
  };
}

@Component({
  selector: 'app-pos-table-booking',
  imports: [CommonModule, ReactiveFormsModule, TuiButton],
  templateUrl: './pos-table-booking.html',
  styleUrl: './pos-table-booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosTableBooking {
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fb = inject(FormBuilder);
  private readonly authFacade = inject(AuthFacade);
  private readonly posTableBookingService = inject(PosTableBookingService);
  private readonly dialogContext =
    injectContext<
      TuiDialogContext<PosTableBookingDialogResult | null, PosTableBookingDialogInput>
    >();
  private readonly isWalkIn = this.resolveWalkIn(this.dialogContext.data);
  private readonly initialTableId = this.resolveInitialTableId(this.dialogContext.data);

  private hasAppliedInitialTableSelection = false;
  private pendingScrollTableId: number | null = null;

  protected readonly tableSearchForm = this.fb.group({
    floor: this.fb.control<number | null>(null),
    seat: this.fb.control<number | null>(null),
    keyword: this.fb.nonNullable.control(''),
  });

  protected readonly bookingForm = this.fb.group(
    {
      tableId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
      expectedArriveDate: this.fb.nonNullable.control('', { validators: [Validators.required] }),
      expectedArriveHour: this.fb.control<number | null>(null, {
        validators: [
          Validators.required,
          Validators.min(SHOP_OPEN_HOUR),
          Validators.max(LAST_BOOKABLE_ARRIVAL_HOUR),
        ],
      }),
      durationHours: this.fb.control<number | null>(null, {
        validators: [Validators.required, Validators.min(1), Validators.max(10)],
      }),
      bookingStatus: this.fb.nonNullable.control<BookingStatusCode>('PENDING_CONFIRMATION', {
        validators: [Validators.required],
      }),
      depositAmount: this.fb.control<number | null>(null),
      customerName: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      phoneNumber: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.pattern(/^[0-9+()\-\s]{8,20}$/)],
      }),
      note: this.fb.nonNullable.control(''),
    },
    {
      validators: [
        expectedCheckoutValidator('expectedArriveDate', 'expectedArriveHour', 'durationHours'),
        operatingHoursValidator('expectedArriveDate', 'expectedArriveHour', 'durationHours'),
      ],
    },
  );

  protected readonly floorOptions: SelectOption[] = [
    { value: null, label: 'Tất cả tầng' },
    { value: 1, label: 'Tầng 1' },
    { value: 2, label: 'Tầng 2' },
    { value: 3, label: 'Tầng 3' },
  ];

  protected readonly seatOptions: SelectOption[] = [
    { value: null, label: 'Tất cả số người' },
    { value: 2, label: '2 người' },
    { value: 4, label: '4 người' },
    { value: 6, label: '6 người' },
    { value: 8, label: '8 người' },
  ];

  protected readonly durationOptions: SelectOption[] = [
    { value: null, label: 'Chọn số giờ sử dụng' },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((hours) => ({
      value: hours,
      label: `${hours} giờ`,
    })),
  ];

  protected readonly expectedArriveHourOptions = Array.from(
    { length: LAST_BOOKABLE_ARRIVAL_HOUR - SHOP_OPEN_HOUR + 1 },
    (_, index) => {
      const hour = SHOP_OPEN_HOUR + index;

      return {
        value: hour,
        label: `${String(hour).padStart(2, '0')}:00`,
      };
    },
  );

  protected readonly bookingStatusOptions: BookingStatusOption[] = [
    {
      value: 'PENDING_CONFIRMATION',
      code: 'PENDING',
      label: 'Chờ xác nhận',
      description: 'Chờ nhân viên xác nhận lịch hẹn',
    },
    {
      value: 'CONFIRMED',
      code: 'CONFIRMED',
      label: 'Đã xác nhận',
      description: 'Khách đã được xác nhận đặt bàn',
    },
    {
      value: 'CANCELLED',
      code: 'CANCELLED',
      label: 'Đã hủy',
      description: 'Lịch hẹn đã bị hủy',
    },
  ];

  protected readonly availableTableCards = signal<TableCard[]>([]);
  protected readonly isSearchingTables = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly submitAttempted = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected selectedTableId(): number | null {
    return this.bookingForm.controls.tableId.value;
  }

  protected isConfirmedStatus(): boolean {
    return this.bookingForm.controls.bookingStatus.value === 'CONFIRMED';
  }

  protected tableSelectionRequiredError(): boolean {
    const control = this.bookingForm.controls.tableId;
    return control.invalid && (control.touched || this.submitAttempted());
  }

  protected dateTimeConflictError(): boolean {
    const hasConflict = this.bookingForm.hasError(DATE_TIME_CONFLICT_ERROR);

    if (!hasConflict) {
      return false;
    }

    const arriveDateControl = this.bookingForm.controls.expectedArriveDate;
    const arriveHourControl = this.bookingForm.controls.expectedArriveHour;
    const durationControl = this.bookingForm.controls.durationHours;

    return (
      this.submitAttempted() ||
      arriveDateControl.touched ||
      arriveHourControl.touched ||
      durationControl.touched ||
      arriveDateControl.dirty ||
      arriveHourControl.dirty ||
      durationControl.dirty
    );
  }

  protected operatingHoursConflictError(): boolean {
    const hasConflict = this.bookingForm.hasError(OPERATING_HOURS_CONFLICT_ERROR);

    if (!hasConflict) {
      return false;
    }

    const arriveDateControl = this.bookingForm.controls.expectedArriveDate;
    const arriveHourControl = this.bookingForm.controls.expectedArriveHour;
    const durationControl = this.bookingForm.controls.durationHours;

    return (
      this.submitAttempted() ||
      arriveDateControl.touched ||
      arriveHourControl.touched ||
      durationControl.touched ||
      arriveDateControl.dirty ||
      arriveHourControl.dirty ||
      durationControl.dirty
    );
  }

  protected longUsageWarning(): boolean {
    const durationHours = this.bookingForm.controls.durationHours.value;
    return typeof durationHours === 'number' && Number.isFinite(durationHours) && durationHours > 2;
  }

  protected disableSaveBookingButton(): boolean {
    return this.isSubmitting() || this.bookingForm.hasError(OPERATING_HOURS_CONFLICT_ERROR);
  }

  protected expectedCheckOutPreview(): string | null {
    const arriveTime = this.resolveExpectedArriveTime(
      this.bookingForm.controls.expectedArriveDate.value,
      this.bookingForm.controls.expectedArriveHour.value,
    );

    if (!arriveTime) {
      return null;
    }

    const durationHours = this.bookingForm.controls.durationHours.value;
    const expectedCheckOutIso = this.computeExpectedCheckOutIso(arriveTime, durationHours);

    return expectedCheckOutIso ? this.formatDateTimeDisplay(expectedCheckOutIso) : null;
  }

  constructor() {
    this.tableSearchForm.valueChanges
      .pipe(
        startWith(this.tableSearchForm.getRawValue()),
        debounceTime(180),
        map((value) => this.normalizeSearchQuery(value)),
        distinctUntilChanged(
          (previous, current) =>
            previous.floor === current.floor &&
            previous.seat === current.seat &&
            previous.keyword === current.keyword,
        ),
        tap(() => {
          this.isSearchingTables.set(true);
          this.searchError.set(null);
        }),
        switchMap((query) =>
          this.posTableBookingService.searchAvailableTables(query).pipe(
            map((tables) => ({
              tables,
              errorMessage: null as string | null,
            })),
            catchError((error: unknown) =>
              of({
                tables: [] as TableCard[],
                errorMessage: this.resolveSearchErrorMessage(error),
              }),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ tables, errorMessage }) => {
        this.availableTableCards.set(tables);
        this.reconcileSelectedTable(tables);
        this.searchError.set(errorMessage);
        this.isSearchingTables.set(false);
      });

    if (this.isWalkIn) {
      this.applyWalkInDefaults();
      return;
    }

    this.applyStatusState('PENDING_CONFIRMATION', false);
  }

  protected closeDialog(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.dialogContext.completeWith(null);
  }

  protected submitBooking(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.submitAttempted.set(true);
    this.submitError.set(null);
    this.bookingForm.markAllAsTouched();

    if (this.bookingForm.invalid) {
      return;
    }

    const rawValue = this.bookingForm.getRawValue();

    if (rawValue.tableId === null) {
      return;
    }

    const expectedArriveTime = this.resolveExpectedArriveTime(
      rawValue.expectedArriveDate,
      rawValue.expectedArriveHour,
    );

    if (!expectedArriveTime) {
      this.submitError.set('Vui lòng chọn đúng ngày và giờ đến dự kiến (theo mốc giờ tròn).');
      return;
    }

    const expectedCheckOut = this.computeExpectedCheckOutIso(
      expectedArriveTime,
      rawValue.durationHours,
    );

    if (!expectedCheckOut) {
      return;
    }

    const normalizedDepositAmount = this.normalizeDepositAmount(rawValue.depositAmount);
    const hasDeposit = normalizedDepositAmount !== null;
    const depositPaidAt = this.resolveDepositPaidAt(rawValue.bookingStatus, hasDeposit);

    const payload: BookingRequestPayload = {
      tableId: rawValue.tableId,
      expectedArriveTime: this.toDateTimePayload(expectedArriveTime),
      expectedCheckOut: expectedCheckOut,
      customerName: rawValue.customerName.trim(),
      phoneNumber: rawValue.phoneNumber.trim(),
      depositAmount: normalizedDepositAmount,
      depositPaid: hasDeposit,
      depositPaidAt,
      bookingStatus: this.isWalkIn ? 'CONFIRMED' : rawValue.bookingStatus,
      note: rawValue.note.trim(),
      ...(this.isWalkIn ? { isWalkIn: true } : {}),
    };

    this.isSubmitting.set(true);

    this.posTableBookingService
      .createBooking(payload)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const bookingId = response.data.bookingId;
          const tableId = response.data.tableId;

          if (bookingId > 0 && tableId > 0) {
            this.dialogContext.completeWith({ bookingId, tableId });
            return;
          }

          this.submitError.set(
            'Tạo đơn đặt bàn thành công nhưng không nhận được bookingId hợp lệ để mở chi tiết.',
          );
        },
        error: (error: unknown) => {
          this.submitError.set(this.resolveSubmitErrorMessage(error));
        },
      });
  }

  protected selectTable(table: TableCard): void {
    const tableControl = this.bookingForm.controls.tableId;
    tableControl.setValue(table.tableId);
    tableControl.markAsTouched();
    tableControl.markAsDirty();
    this.submitError.set(null);
  }

  protected selectBookingStatus(status: BookingStatusCode): void {
    const statusControl = this.bookingForm.controls.bookingStatus;
    statusControl.setValue(status);
    statusControl.markAsTouched();
    statusControl.markAsDirty();
    this.applyStatusState(status, true);
    this.submitError.set(null);
  }

  protected isTableSelected(tableId: number): boolean {
    return this.selectedTableId() === tableId;
  }

  protected showControlError(
    controlName:
      | 'expectedArriveDate'
      | 'expectedArriveHour'
      | 'durationHours'
      | 'depositAmount'
      | 'customerName'
      | 'phoneNumber',
  ): boolean {
    const control = this.bookingForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty || this.submitAttempted());
  }

  protected floorLabel(floor: number): string {
    return `Tầng ${floor}`;
  }

  protected statusCardClass(status: BookingStatusCode): string {
    switch (status) {
      case 'CONFIRMED':
        return 'pos-table-booking__status-card--confirmed';
      case 'CANCELLED':
        return 'pos-table-booking__status-card--cancelled';
      case 'PENDING_CONFIRMATION':
      default:
        return 'pos-table-booking__status-card--pending';
    }
  }

  private applyStatusState(status: BookingStatusCode, autoFillNote: boolean): void {
    const depositControl = this.bookingForm.controls.depositAmount;

    if (status === 'CONFIRMED') {
      depositControl.addValidators([Validators.min(0)]);
      depositControl.updateValueAndValidity({ emitEvent: false });

      if (autoFillNote) {
        this.bookingForm.controls.note.setValue(this.buildAutoConfirmedNote());
      }

      return;
    }

    depositControl.clearValidators();
    depositControl.setValue(null, { emitEvent: false });
    depositControl.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeSearchQuery(value: Partial<SearchFormValue>): TableSearchQuery {
    return {
      floor: typeof value.floor === 'number' && Number.isFinite(value.floor) ? value.floor : null,
      seat: typeof value.seat === 'number' && Number.isFinite(value.seat) ? value.seat : null,
      keyword: (value.keyword ?? '').trim(),
    };
  }

  private reconcileSelectedTable(filteredTables: TableCard[]): void {
    const selectedTableId = this.bookingForm.controls.tableId.value;

    if (
      !this.hasAppliedInitialTableSelection &&
      this.initialTableId !== null &&
      selectedTableId === null
    ) {
      const initialTable = filteredTables.find((table) => table.tableId === this.initialTableId);

      if (initialTable) {
        this.selectTable(initialTable);
        this.scheduleScrollToTable(initialTable.tableId);
        this.hasAppliedInitialTableSelection = true;
        return;
      }
    }

    if (selectedTableId !== null) {
      const stillAvailable = filteredTables.some((table) => table.tableId === selectedTableId);

      if (stillAvailable) {
        return;
      }
    }

    this.bookingForm.controls.tableId.setValue(null);
  }

  private scheduleScrollToTable(tableId: number): void {
    this.pendingScrollTableId = tableId;

    const scheduleScroll = () => this.scrollToPendingTable();

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => scheduleScroll());
      return;
    }

    setTimeout(scheduleScroll, 0);
  }

  private scrollToPendingTable(): void {
    const tableId = this.pendingScrollTableId;

    if (tableId === null) {
      return;
    }

    const host = this.hostElement.nativeElement;
    const tableCard = host.querySelector<HTMLButtonElement>(
      `.pos-table-booking__table-card[data-table-id="${tableId}"]`,
    );

    if (!tableCard) {
      return;
    }

    tableCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    this.pendingScrollTableId = null;
  }

  private resolveInitialTableId(data: PosTableBookingDialogInput): number | null {
    if (typeof data === 'number') {
      return this.normalizeTableId(data);
    }

    if (data && typeof data === 'object') {
      return this.normalizeTableId(data.tableId ?? data.tableID ?? null);
    }

    return null;
  }

  private resolveWalkIn(data: PosTableBookingDialogInput): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    return data.walkIn === true;
  }

  private normalizeTableId(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return null;
    }

    return value;
  }

  private applyWalkInDefaults(): void {
    const expectedArriveAt = this.toCurrentHourSlot();

    this.bookingForm.patchValue(
      {
        expectedArriveDate: expectedArriveAt.date,
        expectedArriveHour: expectedArriveAt.hour,
        durationHours: this.bookingForm.controls.durationHours.value ?? 1,
        bookingStatus: 'CONFIRMED',
      },
      { emitEvent: false },
    );

    this.applyStatusState('CONFIRMED', true);

    const noteControl = this.bookingForm.controls.note;
    const currentNote = noteControl.value;

    if (currentNote.startsWith(WALK_IN_NOTE_PREFIX)) {
      return;
    }

    noteControl.setValue(`${WALK_IN_NOTE_PREFIX}\n${currentNote}`, { emitEvent: false });
  }

  private toCurrentHourSlot(): { date: string; hour: number } {
    const now = new Date();
    now.setMinutes(0, 0, 0);

    if (now.getHours() < SHOP_OPEN_HOUR) {
      now.setHours(SHOP_OPEN_HOUR, 0, 0, 0);
    } else if (now.getHours() > LAST_BOOKABLE_ARRIVAL_HOUR) {
      now.setDate(now.getDate() + 1);
      now.setHours(SHOP_OPEN_HOUR, 0, 0, 0);
    }

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = now.getHours();

    return {
      date: `${year}-${month}-${day}`,
      hour,
    };
  }

  private resolveExpectedArriveTime(
    expectedArriveDate: string,
    expectedArriveHour: number | null,
  ): string | null {
    return buildExpectedArriveTimeLocal(expectedArriveDate, expectedArriveHour);
  }

  private buildAutoConfirmedNote(): string {
    const userInfo = this.authFacade.getUserInfo();
    const fullName = userInfo?.full_name?.trim() || 'Nhân viên';
    const phoneNumber = userInfo?.phone_number?.trim() || 'N/A';

    return `Đã xác nhận bởi nhân viên ${fullName}.\nSố điện thoại: ${phoneNumber}`;
  }

  private toDateTimePayload(value: string): string {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return parsedDate.toISOString();
  }

  private normalizeDepositAmount(value: number | null): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return null;
    }

    return value;
  }

  private resolveDepositPaidAt(status: BookingStatusCode, hasDeposit: boolean): string | null {
    if (!hasDeposit || status !== 'CONFIRMED') {
      return null;
    }

    return new Date().toISOString();
  }

  private computeExpectedCheckOutIso(
    expectedArriveTime: string,
    durationHours: number | null,
  ): string | null {
    const arriveTime = new Date(expectedArriveTime);

    if (Number.isNaN(arriveTime.getTime())) {
      return null;
    }

    if (
      typeof durationHours !== 'number' ||
      !Number.isFinite(durationHours) ||
      durationHours <= 0
    ) {
      return null;
    }

    const expectedCheckOut = new Date(arriveTime.getTime() + durationHours * 60 * 60 * 1000);

    if (
      Number.isNaN(expectedCheckOut.getTime()) ||
      expectedCheckOut.getTime() <= arriveTime.getTime()
    ) {
      return null;
    }

    return expectedCheckOut.toISOString();
  }

  private formatDateTimeDisplay(value: string): string {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(parsedDate);
  }

  private resolveSearchErrorMessage(error: unknown): string {
    const httpError = error as {
      status?: number;
      error?: {
        message?: string;
        details?: unknown;
      };
    };

    const message = httpError?.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }

    const details = httpError?.error?.details;
    if (Array.isArray(details)) {
      const firstDetail = details.find(
        (detail) => typeof detail === 'string' && detail.trim().length > 0,
      );

      if (typeof firstDetail === 'string') {
        return firstDetail.trim();
      }
    }

    if (httpError?.status === 401 || httpError?.status === 403) {
      return 'Bạn không có quyền xem danh sách bàn trống.';
    }

    return 'Không thể tìm được danh sách bàn trống. Vui lòng thử lại.';
  }

  private resolveSubmitErrorMessage(error: unknown): string {
    const httpError = error as {
      status?: number;
      error?: {
        code?: string;
        message?: string;
        details?: unknown;
      };
    };

    const message = httpError?.error?.message;
    if (typeof message === 'string' && message.trim()) {
      const normalizedMessage = message.trim();

      if (httpError?.status === 400 && httpError?.error?.code === 'INVALID_DATA') {
        return `Dữ liệu đặt bàn chưa hợp lệ: ${normalizedMessage}`;
      }

      return normalizedMessage;
    }

    const details = httpError?.error?.details;
    if (Array.isArray(details)) {
      const firstDetail = details.find(
        (detail) => typeof detail === 'string' && detail.trim().length > 0,
      );

      if (typeof firstDetail === 'string') {
        return firstDetail.trim();
      }
    }

    if (
      httpError?.status === 409 &&
      (httpError?.error?.code === 'TABLE_LOCK_BUSY' ||
        httpError?.error?.code === 'BOOKING_TABLE_LOCK_BUSY')
    ) {
      return 'Bàn đang được thao tác bởi người khác. Vui lòng thử lại sau ít giây.';
    }

    if (httpError?.status === 401 || httpError?.status === 403) {
      return 'Bạn không có quyền tạo đơn đặt bàn.';
    }

    return 'Không thể tạo đơn đặt bàn. Vui lòng kiểm tra lại thông tin và thử lại.';
  }
}
