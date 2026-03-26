import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ingredient } from './ingredient';

describe('Ingredient', () => {
  let component: Ingredient;
  let fixture: ComponentFixture<Ingredient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ingredient]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Ingredient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
