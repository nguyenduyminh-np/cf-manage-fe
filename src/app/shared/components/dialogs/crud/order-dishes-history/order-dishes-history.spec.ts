import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderDishesHistory } from './order-dishes-history';

describe('OrderDishesHistory', () => {
  let component: OrderDishesHistory;
  let fixture: ComponentFixture<OrderDishesHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDishesHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderDishesHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
