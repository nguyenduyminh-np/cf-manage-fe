import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableBookingDetail } from './table-booking-detail';

describe('TableBookingDetail', () => {
  let component: TableBookingDetail;
  let fixture: ComponentFixture<TableBookingDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableBookingDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableBookingDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
