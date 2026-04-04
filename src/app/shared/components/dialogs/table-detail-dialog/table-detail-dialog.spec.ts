import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { of } from 'rxjs';

import { TableService } from '../../../../core/services/table.service';
import { TableDetailDialog } from './table-detail-dialog';

describe('TableDetailDialog', () => {
  let component: TableDetailDialog;
  let fixture: ComponentFixture<TableDetailDialog>;

  const dialogContext: Pick<TuiDialogContext<void, number>, 'data' | 'completeWith'> = {
    data: 1,
    completeWith: () => undefined,
  };

  const tableServiceMock: Pick<TableService, 'detail'> = {
    detail: () =>
      of({
        status: 200,
        message: 'Success',
        data: {
          tableId: 1,
          tableCode: 'TB-101-6',
          tableName: 'Ban A1',
          tableStatus: 'BOOKED',
          tableStatusName: 'Da dat',
          floor: 1,
          slot: 4,
          totalBooking: 8,
          lastBookingTime: '2026-04-03T08:00:00Z',
          active: true,
          description: 'Ban canh cua so',
        },
      }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableDetailDialog],
      providers: [
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: dialogContext,
        },
        {
          provide: TableService,
          useValue: tableServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TableDetailDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
