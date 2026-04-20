import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComputersComponent } from './computers';

describe('Computers', () => {
  let component: ComputersComponent;
  let fixture: ComponentFixture<ComputersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComputersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ComputersComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
