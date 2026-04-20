import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import { TableService } from '../../core/services/table.service';
import { Booking } from './booking';

describe('Booking', () => {
  let component: Booking;
  let fixture: ComponentFixture<Booking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Booking],
      providers: [
        {
          provide: TableService,
          useValue: {
            search: () =>
              of({
                status: 200,
                message: 'SEARCH_TABLE_SUCCESS',
                data: {
                  data: [
                    {
                      tableId: 1,
                      tableCode: 'T01',
                      tableName: 'Bàn 01',
                      tableStatus: 'AVAILABLE',
                      tableStatusName: 'Bàn trống',
                      floor: 1,
                      slot: 4,
                      totalBooking: 0,
                      lastBookingTime: '2026-04-03T00:00:00',
                      active: true,
                    },
                  ],
                  pageNo: 0,
                  pageSize: 12,
                  totalElements: 1,
                  totalPages: 1,
                },
              }),
            detail: () =>
              of({
                status: 200,
                message: 'GET_TABLE_DETAIL_SUCCESS',
                data: {
                  tableId: 1,
                  tableCode: 'T01',
                  tableName: 'Bàn 01',
                  tableStatus: 'AVAILABLE',
                  tableStatusName: 'Bàn trống',
                  floor: 1,
                  slot: 4,
                  totalBooking: 0,
                  lastBookingTime: '2026-04-03T00:00:00',
                  active: true,
                },
              }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Booking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open booking history on single click table card', fakeAsync(() => {
    const historyCalls: Array<{ tableId: number; tableName?: string }> = [];
    const bookingComponent = component as any;

    bookingComponent.openTableBookingHistory = (table: unknown) => {
      if (typeof table === 'number') {
        historyCalls.push({ tableId: table });
        return;
      }

      const typedTable = table as { tableId: number; tableName?: string };
      historyCalls.push({ tableId: typedTable.tableId, tableName: typedTable.tableName });
    };

    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.booking-card') as HTMLElement;
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    tick(220);

    expect(historyCalls).toEqual([{ tableId: 1, tableName: 'Bàn 01' }]);
  }));

  it('should open table detail on double click and cancel pending history dialog', fakeAsync(() => {
    const historyCalls: Array<{ tableId: number; tableName?: string }> = [];
    const detailCalls: number[] = [];
    const bookingComponent = component as any;

    bookingComponent.openTableBookingHistory = (table: unknown) => {
      if (typeof table === 'number') {
        historyCalls.push({ tableId: table });
        return;
      }

      const typedTable = table as { tableId: number; tableName?: string };
      historyCalls.push({ tableId: typedTable.tableId, tableName: typedTable.tableName });
    };

    bookingComponent.openTableDetail = (tableId: number) => {
      detailCalls.push(tableId);
    };

    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.booking-card') as HTMLElement;
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    tick(220);

    expect(historyCalls).toEqual([]);
    expect(detailCalls).toEqual([1]);
  }));
});
