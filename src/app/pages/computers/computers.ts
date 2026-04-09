import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CafeService,
  CafeSession,
  Computer,
  ComputerStatus,
  Member
} from '../../services/cafe.service';

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

  constructor(public cafeService: CafeService) {}

  ngOnInit(): void {
    this.loadComputers();

    this.refreshHandle = setInterval(() => {
      this.loadComputers();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
    }
  }

  loadComputers(): void {
    this.computers = this.cafeService.getComputers();
    this.updateStats();
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

  confirmAddComputer(): void {
    const result = this.cafeService.addComputer({
      name: this.newComputerName,
      ratePerHour: this.newComputerRate || 0,
      specs: this.newComputerSpecs,
      status: this.newComputerStatus
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    this.closeAddComputerModal();
    this.loadComputers();
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
    const activeSession = this.getActiveSessionForComputer(pc.id);

    if (!activeSession) {
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

  confirmEndSession(): void {
    if (!this.endingComputer) return;

    const activeSession = this.getActiveSessionForComputer(this.endingComputer.id);

    if (!activeSession) {
      alert('No active session found for this computer.');
      this.closeEndSessionModal();
      return;
    }

    const result = this.cafeService.endSession(activeSession.id);

    if (!result.success) {
      alert(result.message);
      return;
    }

    this.closeEndSessionModal();
    this.loadComputers();
  }

  get filteredMembers(): Member[] {
    const search = this.memberSearch.trim().toLowerCase();

    if (!search) {
      return this.cafeService.getMembers();
    }

    return this.cafeService.getMembers().filter(member =>
      member.name.toLowerCase().includes(search) ||
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
    return this.cafeService.getMemberById(this.selectedMemberId);
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

    return Math.floor((this.amountPaid / this.selectedComputer.ratePerHour) * 60);
  }

  confirmStartSession(): void {
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

    const result = this.cafeService.startSession({
      computerId: this.selectedComputer.id,
      memberId: this.selectedMemberId,
      customerName,
      amountPaid: this.amountPaid
    });

    if (!result.success) {
      alert(result.message);
      return;
    }

    this.closeStartSessionModal();
    this.loadComputers();
  }

  setMaintenance(pc: Computer): void {
    if (pc.status === 'occupied') {
      alert('Cannot set to maintenance while computer is in use.');
      return;
    }

    this.cafeService.setComputerStatus(pc.id, 'maintenance');
    this.loadComputers();
  }

  setAvailable(pc: Computer): void {
    this.cafeService.setComputerStatus(pc.id, 'available');
    this.loadComputers();
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

  getActiveSessionForComputer(computerId: number): CafeSession | undefined {
    return this.cafeService.getActiveSessionByComputerId(computerId);
  }

  getComputerUser(computerId: number): string {
    const session = this.getActiveSessionForComputer(computerId);
    return session ? session.customerName : '';
  }

  getComputerStarted(computerId: number): string {
    const session = this.getActiveSessionForComputer(computerId);

    if (!session) return '';

    const date = new Date(session.startTime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  getComputerRemainingTime(computerId: number): string {
    const session = this.getActiveSessionForComputer(computerId);
    if (!session) return '00:00';

    return this.cafeService.getRemainingTimeText(session.id);
  }

  getComputerTotalTime(computerId: number): string {
    const session = this.getActiveSessionForComputer(computerId);
    if (!session) return '0:00';

    return this.cafeService.getMinutesPurchasedText(session.id);
  }

  getComputerProgress(computerId: number): number {
    const session = this.getActiveSessionForComputer(computerId);
    if (!session) return 0;

    return this.cafeService.getProgressPercent(session.id);
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