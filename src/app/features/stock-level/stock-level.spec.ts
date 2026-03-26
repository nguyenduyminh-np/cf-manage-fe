import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockLevel } from './stock-level';

describe('StockLevel', () => {
  let component: StockLevel;
  let fixture: ComponentFixture<StockLevel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockLevel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockLevel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
