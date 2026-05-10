import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderDishesSuccessDialog } from './order-dishes-success-dialog';

describe('OrderDishesSuccessDialog', () => {
  let component: OrderDishesSuccessDialog;
  let fixture: ComponentFixture<OrderDishesSuccessDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDishesSuccessDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderDishesSuccessDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
