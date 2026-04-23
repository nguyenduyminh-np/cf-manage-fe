import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentSuccessDialog } from './payment-success-dialog';

describe('PaymentSuccessDialog', () => {
  let component: PaymentSuccessDialog;
  let fixture: ComponentFixture<PaymentSuccessDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentSuccessDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentSuccessDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
