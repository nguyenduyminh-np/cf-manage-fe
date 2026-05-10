import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceDetailDialog } from './invoice-detail-dialog';

describe('InvoiceDetailDialog', () => {
  let component: InvoiceDetailDialog;
  let fixture: ComponentFixture<InvoiceDetailDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceDetailDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceDetailDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
