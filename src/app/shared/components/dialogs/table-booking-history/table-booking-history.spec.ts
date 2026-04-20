import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TableBookingHistory } from './table-booking-history';

describe('TableBookingHistory', () => {
  let component: TableBookingHistory;
  let fixture: ComponentFixture<TableBookingHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableBookingHistory],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TableBookingHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
