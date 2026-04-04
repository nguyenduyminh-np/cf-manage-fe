import { NgClass } from '@angular/common';
import { Component, DestroyRef, Injector, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { map } from 'rxjs';

import { TableStatus } from '../../core/models/table.model';
import { TableDetailDialog } from '../../shared/components/dialogs/table-detail-dialog/table-detail-dialog';
import {
  BookingFacade,
  BookingSearchFormValue,
  BookingTable,
  FloorFilterValue,
  FloorValue,
  SeatFilterValue,
  StatusFilterValue,
} from './booking.facade';

@Component({
  selector: 'app-booking',
  imports: [ReactiveFormsModule, TuiButton, NgClass],
  providers: [BookingFacade],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly facade = inject(BookingFacade);
  private readonly dialogService = inject(TuiDialogService);

  protected readonly floorTabs = [
    { label: 'Tầng 1', value: 1 as FloorValue },
    { label: 'Tầng 2', value: 2 as FloorValue },
    { label: 'Tầng 3', value: 3 as FloorValue },
  ] as const;

  protected readonly seatOptions = [
    { label: 'Tất cả', value: null },
    { label: '2 chỗ', value: 2 },
    { label: '4 chỗ', value: 4 },
    { label: '6 chỗ', value: 6 },
    { label: '8 chỗ', value: 8 },
  ] as const;

  protected readonly statusOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Bàn trống', value: 'AVAILABLE' },
    { label: 'Đang sử dụng', value: 'OCCUPIED' },
    { label: 'Đã đặt', value: 'BOOKED' },
  ] as const;

  protected readonly floorOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Tầng 1', value: 1 },
    { label: 'Tầng 2', value: 2 },
    { label: 'Tầng 3', value: 3 },
  ] as const;

  protected readonly searchForm = this.fb.group({
    keyword: this.fb.nonNullable.control(''),
    seats: this.fb.control<SeatFilterValue>(null),
    status: this.fb.control<StatusFilterValue>(null),
    floor: this.fb.control<FloorFilterValue>(null),
  });

  public ngOnInit(): void {
    this.facade.initialize(this.toSearchFormValue(this.searchForm.getRawValue()));

    this.searchForm.valueChanges
      .pipe(
        map((value) => this.toSearchFormValue(value)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((filters) => {
        this.facade.onFiltersChanged(filters);
      });
  }

  protected get selectedFloor(): FloorValue | null {
    return this.searchForm.controls.floor.value;
  }

  protected get currentPageWithinRange(): number {
    return this.facade.currentPageWithinRange();
  }

  protected get totalCount(): number {
    return this.facade.totalCount();
  }

  protected get pagedTables(): BookingTable[] {
    return this.facade.pagedTables();
  }

  protected get visibleCount(): number {
    return this.facade.visibleCount();
  }

  protected get countStart(): number {
    return this.facade.countStart();
  }

  protected get countEnd(): number {
    return this.facade.countEnd();
  }

  protected get visiblePageNumbers(): number[] {
    return this.facade.visiblePageNumbers();
  }

  protected get totalPages(): number {
    return this.facade.totalPages();
  }

  protected get isLoading(): boolean {
    return this.facade.isLoading();
  }

  protected get loadError(): string {
    return this.facade.loadError();
  }

  protected setFloorTab(floor: FloorValue): void {
    this.searchForm.controls.floor.setValue(floor);
  }

  protected search(): void {
    this.facade.forceReload();
  }

  protected goToPage(page: number): void {
    this.facade.goToPage(page);
  }

  protected goToPreviousPage(): void {
    this.goToPage(this.currentPageWithinRange - 1);
  }

  protected goToNextPage(): void {
    this.goToPage(this.currentPageWithinRange + 1);
  }

  protected trackByTable(_: number, table: BookingTable): number {
    return table.tableId;
  }

  protected trackByPage(_: number, page: number): number {
    return page;
  }

  protected badgeClass(status: TableStatus): string {
    return `booking-card__badge--${status.toLowerCase()}`;
  }

  protected openTableDetail(tableId: number): void {
    this.dialogService
      .open(new PolymorpheusComponent(TableDetailDialog, this.injector), {
        data: tableId,
        size: 'auto',
        dismissible: true,
        closeable: true,
        label: 'Chi tiết bàn',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  private toSearchFormValue(value: Partial<BookingSearchFormValue>): BookingSearchFormValue {
    return {
      keyword: value.keyword ?? '',
      seats: value.seats ?? null,
      status: value.status ?? null,
      floor: value.floor ?? null,
    };
  }
}
