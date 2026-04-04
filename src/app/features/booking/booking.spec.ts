import { ComponentFixture, TestBed } from '@angular/core/testing';
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
                  data: [],
                  pageNo: 0,
                  pageSize: 12,
                  totalElements: 0,
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
});
