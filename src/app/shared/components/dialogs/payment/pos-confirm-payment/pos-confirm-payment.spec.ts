import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PosConfirmPayment } from './pos-confirm-payment';

describe('PosConfirmPayment', () => {
  let component: PosConfirmPayment;
  let fixture: ComponentFixture<PosConfirmPayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosConfirmPayment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PosConfirmPayment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
