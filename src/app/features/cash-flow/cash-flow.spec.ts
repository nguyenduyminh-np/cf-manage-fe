import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CashFlow } from './cash-flow';

describe('CashFlow', () => {
  let component: CashFlow;
  let fixture: ComponentFixture<CashFlow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashFlow]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CashFlow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
