import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionCellRender } from './action-cell-render';

describe('ActionCellRender', () => {
  let component: ActionCellRender;
  let fixture: ComponentFixture<ActionCellRender>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionCellRender]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionCellRender);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
