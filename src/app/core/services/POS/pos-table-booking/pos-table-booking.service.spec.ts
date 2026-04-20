import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { TableBookingService } from '../../table-booking/table-booking.service';
import { TableService } from '../../table/table.service';
import { PosTableBookingService } from './pos-table-booking.service';

describe('PosTableBookingService', () => {
  let service: PosTableBookingService;
  let availableTablesResponse: unknown;

  const tableServiceMock = {
    getAvailableTables: (_request: unknown) => of(availableTablesResponse),
  };

  const tableBookingServiceMock = {
    create: (_request: unknown) => of(null),
  };

  beforeEach(() => {
    availableTablesResponse = {
      status: 200,
      message: 'OK',
      data: [],
    };

    TestBed.configureTestingModule({
      providers: [
        PosTableBookingService,
        {
          provide: TableService,
          useValue: tableServiceMock,
        },
        {
          provide: TableBookingService,
          useValue: tableBookingServiceMock,
        },
      ],
    });

    service = TestBed.inject(PosTableBookingService);
  });

  it('maps real table id from tableId payload', () => {
    availableTablesResponse = {
      status: 200,
      message: 'OK',
      data: [
        {
          tableId: 8,
          tableName: 'Ban 08',
          tableCode: 'T08',
          tableStatus: 'AVAILABLE',
          floor: 1,
          slot: 4,
        },
      ],
    };

    service.searchAvailableTables({ floor: null, seat: null, keyword: '' }).subscribe((tables) => {
      expect(tables.length).toBe(1);
      expect(tables[0].tableId).toBe(8);
      expect(tables[0].tableName).toBe('Ban 08');
      expect(tables[0].tableCode).toBe('T08');
    });
  });

  it('maps real table id from id payload', () => {
    availableTablesResponse = {
      status: 200,
      message: 'OK',
      data: [
        {
          id: 18,
          tableName: 'Ban 18',
          tableCode: 'T18',
          tableStatus: 'AVAILABLE',
          floor: 2,
          slot: 6,
        },
      ],
    };

    service.searchAvailableTables({ floor: null, seat: null, keyword: '' }).subscribe((tables) => {
      expect(tables.length).toBe(1);
      expect(tables[0].tableId).toBe(18);
      expect(tables[0].tableName).toBe('Ban 18');
      expect(tables[0].tableCode).toBe('T18');
    });
  });

  it('filters out rows without a real table id', () => {
    availableTablesResponse = {
      status: 200,
      message: 'OK',
      data: [
        {
          table_name: 'Ban A1',
          table_code: 'TA1',
          table_status: 'AVAILABLE',
          floor: 1,
          slot: 4,
        },
      ],
    };

    service.searchAvailableTables({ floor: null, seat: null, keyword: '' }).subscribe((tables) => {
      expect(tables).toEqual([]);
    });
  });
});
