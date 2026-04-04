import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSelectInput } from './app-select-input';

describe('AppSelectInput', () => {
  let component: AppSelectInput;
  let fixture: ComponentFixture<AppSelectInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSelectInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSelectInput);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
