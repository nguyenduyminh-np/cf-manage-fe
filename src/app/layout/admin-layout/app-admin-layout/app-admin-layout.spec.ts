import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppAdminLayout } from './app-admin-layout';

describe('AppAdminLayout', () => {
  let component: AppAdminLayout;
  let fixture: ComponentFixture<AppAdminLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppAdminLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppAdminLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
