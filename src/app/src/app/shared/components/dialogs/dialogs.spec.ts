import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dialogs } from './dialogs';

describe('Dialogs', () => {
  let component: Dialogs;
  let fixture: ComponentFixture<Dialogs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dialogs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Dialogs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
