import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableBookingDialog } from './table-booking-dialog';

describe('TableBookingDialog', () => {
  let component: TableBookingDialog;
  let fixture: ComponentFixture<TableBookingDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableBookingDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableBookingDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
