import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { TableBookingService } from './table-booking.service';

describe('TableBookingService', () => {
  let service: TableBookingService;
  let httpMock: HttpTestingController;
  let localTimezoneOffset: string;

  const toDateTimeWithOffset = (dateTime: string, timezoneOffset: string): string =>
    `${dateTime}${timezoneOffset}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TableBookingService);
    httpMock = TestBed.inject(HttpTestingController);

    const offsetMinutes = -new Date().getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    const offsetAbs = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(offsetAbs / 60)).padStart(2, '0');
    const offsetMins = String(offsetAbs % 60).padStart(2, '0');
    localTimezoneOffset = `${offsetSign}${offsetHours}:${offsetMins}`;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call create endpoint with normalized booking payload including depositPaidAt', () => {
    service
      .create({
        tableId: 8,
        expectedArriveTime: '2026-04-10T19:00',
        expectedCheckOut: '2026-04-10T21:30:12.999Z',
        customerName: '  Nguyen Van A  ',
        phoneNumber: ' 0987654321 ',
        depositAmount: 150000,
        depositPaid: true,
        depositPaidAt: '2026-04-10T12:05',
        bookingStatus: ' CONFIRMED ',
        note: '  Ban gan cua so ',
      })
      .subscribe();

    const request = httpMock.expectOne('http://localhost:8080/api/v1/table-booking/create');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      tableId: 8,
      expectedArriveTime: toDateTimeWithOffset('2026-04-10T19:00:00', localTimezoneOffset),
      expectedCheckOut: '2026-04-10T21:30:12.999Z',
      customerName: 'Nguyen Van A',
      phoneNumber: '0987654321',
      depositAmount: 150000,
      depositPaid: true,
      depositPaidAt: toDateTimeWithOffset('2026-04-10T12:05:00', localTimezoneOffset),
      bookingStatus: 'CONFIRMED',
      note: 'Ban gan cua so',
    });

    request.flush({
      status: 200,
      message: 'CREATE_TABLE_BOOKING_SUCCESS',
      data: {
        bookingId: 123,
        tableId: 8,
        tableCode: 'T08',
        tableName: 'Ban 08',
        expectedArriveTime: '2026-04-10T19:00:00',
        checkInAt: null,
        expectedCheckOut: '2026-04-10T21:30:12',
        checkOutAt: null,
        bookingStatus: 'CONFIRMED',
        bookingStatusName: 'Da xac nhan',
        customerName: 'Nguyen Van A',
        phoneNumber: '0987654321',
        depositAmount: 150000,
        depositPaid: true,
        depositPaidAt: '2026-04-10T12:05:00',
        depositForfeited: false,
        depositTxnRef: null,
        note: 'Ban gan cua so',
        accountId: 1,
        accountUsername: 'staff1',
        accountFullName: 'Nhan vien 1',
        active: true,
        createdAt: '2026-04-10T12:00:00',
      },
    });
  });

  it('should call create endpoint with isWalkIn flag when walk-in booking', () => {
    service
      .create({
        tableId: 8,
        expectedArriveTime: '2026-04-18T12:00:00.000Z',
        expectedCheckOut: '2026-04-18T14:00:00.000Z',
        customerName: 'Khach A',
        phoneNumber: '0901234567',
        depositAmount: 0,
        depositPaid: false,
        note: 'Khach den truc tiep',
        isWalkIn: true,
      })
      .subscribe();

    const request = httpMock.expectOne('http://localhost:8080/api/v1/table-booking/create');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      tableId: 8,
      expectedArriveTime: '2026-04-18T12:00:00.000Z',
      expectedCheckOut: '2026-04-18T14:00:00.000Z',
      customerName: 'Khach A',
      phoneNumber: '0901234567',
      depositAmount: 0,
      depositPaid: false,
      note: 'Khach den truc tiep',
      isWalkIn: true,
    });

    request.flush({
      status: 200,
      message: 'CREATE_TABLE_BOOKING_SUCCESS',
      data: {
        bookingId: 321,
        tableId: 8,
        tableCode: 'T08',
        tableName: 'Ban 08',
        expectedArriveTime: '2026-04-18T12:00:00.000Z',
        checkInAt: '2026-04-18T12:00:10.000Z',
        expectedCheckOut: '2026-04-18T14:00:00.000Z',
        checkOutAt: null,
        bookingStatus: 'CHECKED_IN',
        bookingStatusName: 'Đã nhận bàn',
        customerName: 'Khach A',
        phoneNumber: '0901234567',
        depositAmount: 0,
        depositPaid: false,
        depositPaidAt: null,
        depositForfeited: false,
        depositTxnRef: null,
        note: 'Khach den truc tiep',
        accountId: 1,
        accountUsername: 'staff1',
        accountFullName: 'Nhan vien 1',
        active: true,
        createdAt: '2026-04-18T11:59:50.000Z',
      },
    });
  });

  it('should map search dates to day precision using checkInAt and checkOutAt', () => {
    service
      .search({
        page: 0,
        limit: 10,
        sortField: 'checkInAt',
        sortDir: 'desc',
        tableId: 1,
        bookingStatus: 'COMPLETED',
        customerName: 'Nguyen',
        phoneNumber: '098',
        checkInAt: '2026-04-07T09:30:00',
        checkOutAt: '2026-04-08T20:15:45',
        active: true,
      })
      .subscribe();

    const request = httpMock.expectOne('http://localhost:8080/api/v1/table-booking/search');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      page: 0,
      limit: 10,
      sortField: 'checkInAt',
      sortDir: 'desc',
      tableId: 1,
      bookingStatus: 'COMPLETED',
      customerName: 'Nguyen',
      phoneNumber: '098',
      checkInAt: toDateTimeWithOffset('2026-04-07T00:00:00', localTimezoneOffset),
      checkOutAt: toDateTimeWithOffset('2026-04-08T00:00:00', localTimezoneOffset),
      active: true,
    });

    request.flush({
      status: 200,
      message: 'OK',
      data: { data: [], pageNo: 0, pageSize: 10, totalElements: 0, totalPages: 1 },
    });
  });

  it('should call check-out endpoint with bookingId in body and map id to bookingId', () => {
    let actualResponse:
      | {
          status: number;
          message: string;
          data: {
            bookingId: number;
            bookingStatus: string;
            checkOutAt: string | null;
          };
        }
      | undefined;

    service
      .checkOut({ bookingId: 123, checkOutAt: '2026-04-18T06:35:00Z' })
      .subscribe((response) => {
        actualResponse = {
          status: response.status,
          message: response.message,
          data: {
            bookingId: response.data.bookingId,
            bookingStatus: response.data.bookingStatus,
            checkOutAt: response.data.checkOutAt,
          },
        };
      });

    const request = httpMock.expectOne('http://localhost:8080/api/v1/table-booking/check-out');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      bookingId: 123,
      checkOutAt: '2026-04-18T06:35:00Z',
    });

    request.flush({
      status: 200,
      message: 'CHECK_OUT_TABLE_BOOKING_SUCCESS',
      data: {
        id: 123,
        bookingStatus: 'COMPLETED',
        bookingStatusName: 'Hoàn thành',
        checkInAt: '2026-04-18T04:30:00Z',
        checkOutAt: '2026-04-18T06:35:00Z',
      },
    });

    expect(actualResponse).toEqual({
      status: 200,
      message: 'CHECK_OUT_TABLE_BOOKING_SUCCESS',
      data: {
        bookingId: 123,
        bookingStatus: 'COMPLETED',
        checkOutAt: '2026-04-18T06:35:00Z',
      },
    });
  });

  it('should call check-in endpoint with bookingId in body and default force=false', () => {
    let actualResponse:
      | {
          status: number;
          message: string;
          data: {
            bookingId: number;
            tableId: number;
            bookingStatus: string;
            checkInAt: string | null;
          };
        }
      | undefined;

    service
      .checkIn({ bookingId: 123, checkInAt: '2026-04-18T12:30:00.000Z' })
      .subscribe((response) => {
        actualResponse = {
          status: response.status,
          message: response.message,
          data: {
            bookingId: response.data.bookingId,
            tableId: response.data.tableId,
            bookingStatus: response.data.bookingStatus,
            checkInAt: response.data.checkInAt,
          },
        };
      });

    const request = httpMock.expectOne('http://localhost:8080/api/v1/table-booking/check-in');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      bookingId: 123,
      checkInAt: '2026-04-18T12:30:00.000Z',
      force: false,
    });

    request.flush({
      status: 200,
      message: 'CHECK_IN_TABLE_BOOKING_SUCCESS',
      data: {
        bookingId: 123,
        tableId: 8,
        tableCode: 'T08',
        tableName: 'Ban 08',
        expectedArriveTime: '2026-04-18T12:00:00.000Z',
        checkInAt: '2026-04-18T12:30:00.000Z',
        expectedCheckOut: '2026-04-18T14:00:00.000Z',
        checkOutAt: null,
        bookingStatus: 'CHECKED_IN',
        bookingStatusName: 'Đã nhận bàn',
        customerName: 'Nguyen Van A',
        phoneNumber: '09xxxxxxxx',
        depositAmount: 100000,
        depositPaid: true,
        depositPaidAt: '2026-04-18T10:00:00.000Z',
        depositForfeited: false,
        depositTxnRef: 'TXN-001',
        note: '',
        accountId: 5,
        accountUsername: 'staff01',
        accountFullName: 'Staff 01',
        active: true,
        createdAt: '2026-04-17T09:00:00.000Z',
      },
    });

    expect(actualResponse).toEqual({
      status: 200,
      message: 'CHECK_IN_TABLE_BOOKING_SUCCESS',
      data: {
        bookingId: 123,
        tableId: 8,
        bookingStatus: 'CHECKED_IN',
        checkInAt: '2026-04-18T12:30:00.000Z',
      },
    });
  });

  it('should throw when check-in bookingId is invalid', () => {
    expect(() => service.checkIn({ bookingId: 0 }).subscribe()).toThrowError(
      'bookingId must be a positive integer',
    );
  });

  it('should throw when check-out bookingId is invalid', () => {
    expect(() => service.checkOut({ bookingId: 0 }).subscribe()).toThrowError(
      'bookingId must be a positive integer',
    );
  });

  it('should normalize pending-job response when backend returns direct array data', () => {
    let actualResponse:
      | {
          status: number;
          message: string;
          data: {
            data: Array<{ bookingId: number; tableId: number; bookingStatus: string }>;
            pageNo: number;
            pageSize: number;
            totalElements: number;
            totalPages: number;
          };
        }
      | undefined;

    service
      .searchPendingAndConfirmedBookings({
        page: 0,
        limit: 10,
        tableId: 1,
      })
      .subscribe((response) => {
        actualResponse = {
          status: response.status,
          message: response.message,
          data: {
            data: response.data.data.map((item) => ({
              bookingId: item.bookingId,
              tableId: item.tableId,
              bookingStatus: item.bookingStatus,
            })),
            pageNo: response.data.pageNo,
            pageSize: response.data.pageSize,
            totalElements: response.data.totalElements,
            totalPages: response.data.totalPages,
          },
        };
      });

    const request = httpMock.expectOne('http://localhost:8080/api/v1/table-booking/pending-job');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      page: 0,
      limit: 10,
      sortField: 'checkInAt',
      sortDir: 'desc',
      tableId: 1,
    });

    request.flush({
      status: 200,
      message: 'GET_PENDING_JOB_SUCCESS',
      data: [
        {
          bookingId: 240,
          tableId: 1,
          tableCode: 'TB-101-6',
          tableName: 'Bàn A1',
          expectedArriveTime: '2026-04-11T14:55:34.000Z',
          checkInAt: null,
          expectedCheckOut: '2026-04-11T16:55:34.000Z',
          checkOutAt: null,
          bookingStatus: 'PENDING_CONFIRMATION',
          bookingStatusName: 'Chờ xác nhận',
          customerName: 'Trinh Huy Khoi',
          phoneNumber: '0901234567',
          depositAmount: 200000,
          depositPaid: true,
          depositPaidAt: '2026-04-15T17:04:54.000Z',
          depositForfeited: false,
          depositTxnRef: null,
          note: 'Booking tao bang Postman theo sample data',
          accountId: 73,
          accountUsername: 'admin123',
          accountFullName: 'Admin Test',
          active: true,
          createdAt: '2026-04-11T12:45:35.000Z',
        },
      ],
    });

    expect(actualResponse).toEqual({
      status: 200,
      message: 'GET_PENDING_JOB_SUCCESS',
      data: {
        data: [
          {
            bookingId: 240,
            tableId: 1,
            bookingStatus: 'PENDING_CONFIRMATION',
          },
        ],
        pageNo: 0,
        pageSize: 1,
        totalElements: 1,
        totalPages: 1,
      },
    });
  });

  it('should omit search dates when not provided', () => {
    service
      .search({
        page: 0,
        limit: 10,
        sortField: 'checkInAt',
        sortDir: 'desc',
        tableId: 1,
      })
      .subscribe();

    const request = httpMock.expectOne('http://localhost:8080/api/v1/table-booking/search');
    expect(request.request.body).toEqual({
      page: 0,
      limit: 10,
      sortField: 'checkInAt',
      sortDir: 'desc',
      tableId: 1,
    });

    request.flush({
      status: 200,
      message: 'OK',
      data: { data: [], pageNo: 0, pageSize: 10, totalElements: 0, totalPages: 1 },
    });
  });

  it('should call detail endpoint and keep nullable booking fields', () => {
    let actualResponse:
      | {
          status: number;
          message: string;
          data: {
            bookingId: number;
            depositPaid: boolean | null;
            active: boolean | null;
            customerName: string | null;
          };
        }
      | undefined;

    service.getBookingDetail({ bookingId: 123 }).subscribe((response) => {
      actualResponse = {
        status: response.status,
        message: response.message,
        data: {
          bookingId: response.data.bookingId,
          depositPaid: response.data.depositPaid,
          active: response.data.active,
          customerName: response.data.customerName,
        },
      };
    });

    const request = httpMock.expectOne('http://localhost:8080/api/v1/table-booking/detail');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ bookingId: 123 });

    request.flush({
      status: 200,
      message: 'GET_TABLE_BOOKING_DETAIL_SUCCESS',
      data: {
        bookingId: 123,
        tableId: 8,
        tableCode: 'T08',
        tableName: 'Ban 08',
        expectedArriveTime: '2026-04-10T19:00:00',
        checkInAt: null,
        expectedCheckOut: '2026-04-10T21:00:00',
        checkOutAt: null,
        bookingStatus: 'PENDING_CONFIRMATION',
        bookingStatusName: 'Chờ xác nhận',
        customerName: null,
        phoneNumber: null,
        depositAmount: 150000,
        depositPaid: null,
        depositPaidAt: null,
        depositForfeited: null,
        depositTxnRef: null,
        note: null,
        accountId: null,
        accountUsername: null,
        accountFullName: null,
        active: null,
        createdAt: '2026-04-10T12:00:00',
      },
    });

    expect(actualResponse).toEqual({
      status: 200,
      message: 'GET_TABLE_BOOKING_DETAIL_SUCCESS',
      data: {
        bookingId: 123,
        depositPaid: null,
        active: null,
        customerName: null,
      },
    });
  });
});
