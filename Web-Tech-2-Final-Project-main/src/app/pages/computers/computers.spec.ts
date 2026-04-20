import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ComputersComponent } from './computers';
import { ComputersService } from '../../services/computers.service';

describe('ComputersComponent', () => {
  let component: ComputersComponent;
  let fixture: ComponentFixture<ComputersComponent>;

  let mockComputersService: jasmine.SpyObj<ComputersService>;

  beforeEach(async () => {
    mockComputersService = jasmine.createSpyObj('ComputersService', [
      'getMembers',
      'getComputers',
      'addComputer',
      'startSession',
      'endSession',
      'updateStatus',
      'removeComputer' // ✅ important (for delete feature)
    ]);

    // Default mock returns
    mockComputersService.getMembers.and.returnValue(of([]));
    mockComputersService.getComputers.and.returnValue(of([]));
    mockComputersService.addComputer.and.returnValue(of({}));
    mockComputersService.startSession.and.returnValue(of({}));
    mockComputersService.endSession.and.returnValue(of({}));
    mockComputersService.updateStatus.and.returnValue(of({}));
    mockComputersService.removeComputer.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [ComputersComponent],
      providers: [
        { provide: ComputersService, useValue: mockComputersService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComputersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load computers on init', async () => {
    await component.loadComputers();
    expect(mockComputersService.getComputers).toHaveBeenCalled();
  });

  it('should call removeComputer service', async () => {
    const pc = {
      id: 1,
      name: 'PC-01',
      ratePerHour: 25,
      status: 'available' as const
    };

    spyOn(window, 'confirm').and.returnValue(true);

    await component.removeComputer(pc as any);

    expect(mockComputersService.removeComputer).toHaveBeenCalledWith(1);
  });

  it('should NOT remove computer if cancelled', async () => {
    const pc = {
      id: 1,
      name: 'PC-01',
      ratePerHour: 25,
      status: 'available' as const
    };

    spyOn(window, 'confirm').and.returnValue(false);

    await component.removeComputer(pc as any);

    expect(mockComputersService.removeComputer).not.toHaveBeenCalled();
  });

  it('should NOT remove computer if in use', async () => {
    const pc = {
      id: 1,
      name: 'PC-01',
      ratePerHour: 25,
      status: 'occupied' as const
    };

    spyOn(window, 'alert');

    await component.removeComputer(pc as any);

    expect(window.alert).toHaveBeenCalled();
    expect(mockComputersService.removeComputer).not.toHaveBeenCalled();
  });
});