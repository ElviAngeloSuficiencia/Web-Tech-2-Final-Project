import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ComputersService } from '../../services/computers.service';

type ComputerStatus = 'available' | 'occupied' | 'maintenance' | 'offline';

interface Member {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  balance?: number;
  status?: string;
}

interface Computer {
  id: number;
  name: string;
  ratePerHour: number;
  status: ComputerStatus;
  specs?: string;

  memberId?: number | null;
  customerName?: string;
  timeStarted?: string | null;
  timeEnded?: string | null;
  remainingSeconds?: number;
  amountPaid?: number;
}

@Component({
  selector: 'app-computers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './computers.html',
  styleUrl: './computers.scss'
})
export class ComputersComponent implements OnInit, OnDestroy {
  stats = [
    { label: 'Total Stations', value: '0', icon: '🖥️' },
    { label: 'In Use', value: '0', icon: '👤' },
    { label: 'Available', value: '0', icon: '💻' },
    { label: 'Maintenance', value: '0', icon: '🛠️' },
  ];

  computers: Computer[] = [];
  members: Member[] = [];

  showStartModal = false;
  selectedComputer: Computer | null = null;

  showEndModal = false;
  endingComputer: Computer | null = null;

  showAddComputerModal = false;
  newComputerName = '';
  newComputerRate: number | null = null;
  newComputerSpecs = '';
  newComputerStatus: ComputerStatus = 'available';

  computerStatusOptions: ComputerStatus[] = ['available', 'maintenance', 'offline'];

  memberSearch = '';
  selectedMemberId: number | null = null;
  walkInName = '';
  amountPaid: number | null = null;

  private refreshHandle: ReturnType<typeof setInterval> | null = null;
  private clockHandle: ReturnType<typeof setInterval> | null = null;
  private isLoading = false;

  constructor(
    private computersService: ComputersService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAll();

    this.refreshHandle = setInterval(() => {
      this.loadComputers();
    }, 5000);

    this.clockHandle = setInterval(() => {
      this.tickRemainingTime();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
    }

    if (this.clockHandle) {
      clearInterval(this.clockHandle);
      this.clockHandle = null;
    }
  }

  async loadAll(): Promise<void> {
    await Promise.all([
      this.loadMembers(),
      this.loadComputers()
    ]);
  }

  normalizeArrayResponse(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.result)) return payload.result;
    return [];
  }

  async loadMembers(): Promise<void> {
    try {
      const response = await firstValueFrom(this.computersService.getMembers());
      const rows = this.normalizeArrayResponse(response);

      this.members = rows.map((row: any) => ({
        id: Number(row.id ?? row.member_id ?? 0),
        name: row.name ?? row.member_name ?? row.full_name ?? 'Unknown Member',
        email: row.email ?? '',
        phone: row.phone ?? row.contact_number ?? '',
        balance: Number(row.balance ?? 0),
        status: row.status ?? 'active'
      }));

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load members:', error);
      this.members = [];
      this.cdr.detectChanges();
    }
  }

  async loadComputers(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;

    try {
      const response = await firstValueFrom(this.computersService.getComputers());
      const rows = this.normalizeArrayResponse(response);

      this.computers = rows.map((row: any) => ({
        id: Number(row.id ?? row.computer_id ?? 0),
        name: row.name ?? row.computer_name ?? 'Unnamed PC',
        ratePerHour: Number(row.ratePerHour ?? row.rate_per_hour ?? 25),
        status: (row.status ?? 'available') as ComputerStatus,
        specs: row.specs ?? '',
        memberId: row.memberId ?? row.member_id ?? null,
        customerName: row.customerName ?? row.customer_name ?? '',
        timeStarted: row.timeStarted ?? row.time_started ?? null,
        timeEnded: row.timeEnded ?? row.time_ended ?? null,
        remainingSeconds: Number(row.remainingSeconds ?? row.remaining_seconds ?? 0),
        amountPaid: Number(row.amountPaid ?? row.amount_paid ?? 0)
      }));

      this.updateStats();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load computers:', error);
    } finally {
      this.isLoading = false;
    }
  }

  tickRemainingTime(): void {
    this.computers = this.computers.map(pc => {
      if (pc.status === 'occupied' && (pc.remainingSeconds ?? 0) > 0) {
        return {
          ...pc,
          remainingSeconds: Math.max(0, (pc.remainingSeconds ?? 0) - 1)
        };
      }
      return pc;
    });

    this.cdr.detectChanges();
  }

  isInUse(status: string): boolean {
    return status === 'occupied';
  }

  isAvailable(status: string): boolean {
    return status === 'available';
  }

  isMaintenance(status: string): boolean {
    return status === 'maintenance';
  }

  openAddComputerModal(): void {
    this.showAddComputerModal = true;
    this.newComputerName = '';
    this.newComputerRate = null;
    this.newComputerSpecs = '';
    this.newComputerStatus = 'available';
  }

  closeAddComputerModal(): void {
    this.showAddComputerModal = false;
    this.newComputerName = '';
    this.newComputerRate = null;
    this.newComputerSpecs = '';
    this.newComputerStatus = 'available';
  }

  async confirmAddComputer(): Promise<void> {
    if (!this.newComputerName.trim()) {
      alert('Please enter a computer name.');
      return;
    }

    if (!this.newComputerRate || this.newComputerRate <= 0) {
      alert('Please enter a valid rate per hour.');
      return;
    }

    try {
      await firstValueFrom(
        this.computersService.addComputer({
          name: this.newComputerName.trim(),
          computer_name: this.newComputerName.trim(),
          ratePerHour: this.newComputerRate,
          rate_per_hour: this.newComputerRate,
          specs: this.newComputerSpecs.trim(),
          status: this.newComputerStatus
        })
      );

      this.closeAddComputerModal();
      await this.loadComputers();
    } catch (error: any) {
      console.error('Failed to add computer:', error);
      console.error('Add computer API error response:', error?.error);
      alert(
        error?.error?.message ||
        error?.message ||
        'Add Computer API is not ready or failed on the backend.'
      );
    }
  }

  openStartSessionModal(pc: Computer): void {
    if (!this.isAvailable(pc.status)) return;

    this.selectedComputer = pc;
    this.showStartModal = true;

    this.memberSearch = '';
    this.selectedMemberId = null;
    this.walkInName = '';
    this.amountPaid = null;
  }

  closeStartSessionModal(): void {
    this.showStartModal = false;
    this.selectedComputer = null;
    this.memberSearch = '';
    this.selectedMemberId = null;
    this.walkInName = '';
    this.amountPaid = null;
  }

  openEndSessionModal(pc: Computer): void {
    if (!this.isInUse(pc.status)) {
      alert('No active session found for this computer.');
      return;
    }

    this.endingComputer = pc;
    this.showEndModal = true;
  }

  closeEndSessionModal(): void {
    this.showEndModal = false;
    this.endingComputer = null;
  }

  get filteredMembers(): Member[] {
    const search = this.memberSearch.trim().toLowerCase();

    if (!search) {
      return this.members;
    }

    return this.members.filter(member =>
      (member.name || '').toLowerCase().includes(search) ||
      (member.phone || '').toLowerCase().includes(search) ||
      (member.email || '').toLowerCase().includes(search)
    );
  }

  selectMember(member: Member): void {
    this.selectedMemberId = member.id;
    this.memberSearch = member.name;
    this.walkInName = '';
  }

  clearSelectedMember(): void {
    this.selectedMemberId = null;
  }

  get selectedMember(): Member | undefined {
    if (this.selectedMemberId === null) return undefined;
    return this.members.find(member => member.id === this.selectedMemberId);
  }

  get computedCustomerName(): string {
    if (this.selectedMember) {
      return this.selectedMember.name;
    }

    return this.walkInName.trim();
  }

  get computedMinutes(): number {
    if (!this.selectedComputer || !this.amountPaid || this.amountPaid <= 0) {
      return 0;
    }

    if (!this.selectedComputer.ratePerHour || this.selectedComputer.ratePerHour <= 0) {
      return 0;
    }

    return Math.floor((this.amountPaid / this.selectedComputer.ratePerHour) * 60);
  }

  async confirmStartSession(): Promise<void> {
    if (!this.selectedComputer) return;

    const customerName = this.computedCustomerName;

    if (!customerName) {
      alert('Please select a member or enter a walk-in name.');
      return;
    }

    if (!this.amountPaid || this.amountPaid <= 0) {
      alert('Please enter a valid amount paid.');
      return;
    }

    const payload = {
      memberId: this.selectedMemberId,
      customerName: customerName,
      amountPaid: this.amountPaid,

      member_id: this.selectedMemberId,
      customer_name: customerName,
      amount_paid: this.amountPaid
    };

    console.log('Starting session payload:', payload);

    try {
      const response = await firstValueFrom(
        this.computersService.startSession(this.selectedComputer.id, payload)
      );

      console.log('Start session API response:', response);

      this.closeStartSessionModal();
      await this.loadComputers();
    } catch (error: any) {
      console.error('Failed to start session:', error);
      console.error('API error response:', error?.error);

      alert(
        error?.error?.message ||
        error?.message ||
        'Failed to start session from API.'
      );
    }
  }

  async confirmEndSession(): Promise<void> {
    if (!this.endingComputer) return;

    try {
      const response = await firstValueFrom(
        this.computersService.endSession(this.endingComputer.id)
      );

      console.log('End session API response:', response);

      this.closeEndSessionModal();
      await this.loadComputers();
    } catch (error: any) {
      console.error('Failed to end session:', error);
      console.error('End session API error response:', error?.error);

      alert(
        error?.error?.message ||
        error?.message ||
        'Failed to end session from API.'
      );
    }
  }

  async setMaintenance(pc: Computer): Promise<void> {
    if (pc.status === 'occupied') {
      alert('Cannot set to maintenance while computer is in use.');
      return;
    }

    try {
      const response = await firstValueFrom(
        this.computersService.updateStatus(pc.id, 'maintenance')
      );

      console.log('Set maintenance response:', response);

      await this.loadComputers();
    } catch (error: any) {
      console.error('Failed to set maintenance:', error);
      console.error('Set maintenance API error response:', error?.error);

      alert(
        error?.error?.message ||
        error?.message ||
        'Failed to update computer status.'
      );
    }
  }

  async setAvailable(pc: Computer): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.computersService.updateStatus(pc.id, 'available')
      );

      console.log('Set available response:', response);

      await this.loadComputers();
    } catch (error: any) {
      console.error('Failed to set available:', error);
      console.error('Set available API error response:', error?.error);

      alert(
        error?.error?.message ||
        error?.message ||
        'Failed to update computer status.'
      );
    }
  }

  getComputerStatusLabel(status: string): string {
    if (status === 'occupied') return 'In Use';
    if (status === 'available') return 'Available';
    if (status === 'maintenance') return 'Maintenance';
    if (status === 'offline') return 'Offline';
    return status;
  }

  getStatusClass(status: string): string {
    if (status === 'occupied') return 'tag-in-use';
    if (status === 'available') return 'tag-available';
    if (status === 'maintenance') return 'tag-maintenance';
    if (status === 'offline') return 'tag-offline';
    return '';
  }

  getComputerUser(computerId: number): string {
    const pc = this.computers.find(item => item.id === computerId);
    return pc?.customerName || 'Walk-in';
  }

  getComputerStarted(computerId: number): string {
    const pc = this.computers.find(item => item.id === computerId);

    if (!pc?.timeStarted) return '';

    const date = new Date(pc.timeStarted);

    if (isNaN(date.getTime())) return '';

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  formatSeconds(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60).toString().padStart(2, '0');
    const seconds = Math.floor(safe % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  formatMinutesLabel(totalMinutes: number): string {
    const safeMinutes = Math.max(0, Math.floor(totalMinutes));
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  getComputerRemainingTime(computerId: number): string {
    const pc = this.computers.find(item => item.id === computerId);
    return this.formatSeconds(pc?.remainingSeconds ?? 0);
  }

  getComputerTotalTime(computerId: number): string {
    const pc = this.computers.find(item => item.id === computerId);

    if (!pc?.ratePerHour || !pc?.amountPaid) {
      return '0:00';
    }

    const totalMinutes = Math.floor((pc.amountPaid / pc.ratePerHour) * 60);
    return this.formatMinutesLabel(totalMinutes);
  }

  getComputerProgress(computerId: number): number {
    const pc = this.computers.find(item => item.id === computerId);

    if (!pc?.ratePerHour || !pc?.amountPaid) return 0;

    const totalSeconds = Math.floor((pc.amountPaid / pc.ratePerHour) * 60 * 60);

    if (totalSeconds <= 0) return 0;

    const remaining = Math.max(0, pc.remainingSeconds ?? 0);
    const percent = (remaining / totalSeconds) * 100;

    return Math.max(0, Math.min(100, percent));
  }

  updateStats(): void {
    const total = this.computers.length;
    const inUse = this.computers.filter(pc => pc.status === 'occupied').length;
    const available = this.computers.filter(pc => pc.status === 'available').length;
    const maintenance = this.computers.filter(pc => pc.status === 'maintenance').length;

    this.stats = [
      { label: 'Total Stations', value: total.toString(), icon: '🖥️' },
      { label: 'In Use', value: inUse.toString(), icon: '👤' },
      { label: 'Available', value: available.toString(), icon: '💻' },
      { label: 'Maintenance', value: maintenance.toString(), icon: '🛠️' },
    ];
  }
}