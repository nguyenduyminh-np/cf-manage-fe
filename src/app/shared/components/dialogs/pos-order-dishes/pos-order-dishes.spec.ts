import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosOrderDishes } from './pos-order-dishes';

describe('PosOrderDishes', () => {
  let component: PosOrderDishes;
  let fixture: ComponentFixture<PosOrderDishes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosOrderDishes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosOrderDishes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
