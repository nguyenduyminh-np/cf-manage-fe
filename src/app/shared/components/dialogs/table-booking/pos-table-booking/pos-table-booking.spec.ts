import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { of } from 'rxjs';

import { AuthFacade } from '../../../../../core/facade/auth.facade';
import { PosTableBookingDialogInput } from '../../../../../core/models/table-booking/table-booking.model';
import { PosTableBookingService } from '../../../../../core/services/POS/pos-table-booking/pos-table-booking.service';
import { PosTableBooking } from './pos-table-booking';

describe('PosTableBooking', () => {
  let component: PosTableBooking;
  let fixture: ComponentFixture<PosTableBooking>;

  const dialogContext: Pick<
    TuiDialogContext<unknown, PosTableBookingDialogInput>,
    'data' | 'completeWith'
  > = {
    data: undefined,
    completeWith: () => undefined,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosTableBooking],
      providers: [
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: dialogContext,
        },
        {
          provide: PosTableBookingService,
          useValue: {
            searchAvailableTables: () => of([]),
            createBooking: () => of({ status: 200, message: 'OK', data: null }),
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            getUserInfo: () => null,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PosTableBooking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
