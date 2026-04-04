import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderDishesDialog } from './order-dishes-dialog';

describe('OrderDishesDialog', () => {
  let component: OrderDishesDialog;
  let fixture: ComponentFixture<OrderDishesDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDishesDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderDishesDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
