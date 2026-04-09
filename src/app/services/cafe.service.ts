import { Injectable } from '@angular/core';

export type MemberStatus = 'active' | 'inactive' | 'blocked';
export type ComputerStatus = 'available' | 'occupied' | 'maintenance' | 'offline';
export type SessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type TransactionType = 'topup' | 'session_payment' | 'product_sale' | 'adjustment' | 'refund';

export interface Member {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  balance: number;
  status: MemberStatus;
  createdAt: string;
}

export interface Computer {
  id: number;
  name: string;
  ratePerHour: number;
  status: ComputerStatus;
  specs?: string;
}

export interface CafeSession {
  id: number;
  computerId: number;
  memberId: number | null;
  customerName: string;
  startTime: string;
  endTime: string | null;
  status: SessionStatus;
  ratePerHour: number;
  totalAmount: number;

  amountPaid: number;
  minutesPurchased: number;
  remainingSeconds: number;
  lastTickAt: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  memberId: number | null;
  sessionId: number | null;
  description: string;
  createdAt: string;
  paymentMethod?: string;
  timeAddedMinutes?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CafeService {
  private members: Member[] = [];

  private computers: Computer[] = [
    { id: 1, name: 'PC-01', ratePerHour: 25, status: 'available', specs: 'Core i5 / 8GB / GTX 1050' },
    { id: 2, name: 'PC-02', ratePerHour: 25, status: 'available', specs: 'Core i5 / 8GB / GTX 1050' },
    { id: 3, name: 'PC-03', ratePerHour: 30, status: 'maintenance', specs: 'Core i7 / 16GB / RTX 2060' },
    { id: 4, name: 'PC-04', ratePerHour: 30, status: 'available', specs: 'Core i7 / 16GB / RTX 2060' }
  ];

  private sessions: CafeSession[] = [];
  private transactions: Transaction[] = [];

  private memberIdCounter = 1;
  private sessionIdCounter = 1;
  private transactionIdCounter = 1;

  private timerHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startTimerLoop();
  }

  private startTimerLoop(): void {
    if (this.timerHandle) return;

    this.timerHandle = setInterval(() => {
      this.tickSessions();
    }, 1000);
  }

  private tickSessions(): void {
    const now = new Date();

    for (const session of this.sessions) {
      if (session.status !== 'active') continue;

      const lastTick = new Date(session.lastTickAt);
      const diffSeconds = Math.floor((now.getTime() - lastTick.getTime()) / 1000);

      if (diffSeconds <= 0) continue;

      session.remainingSeconds = Math.max(0, session.remainingSeconds - diffSeconds);
      session.lastTickAt = now.toISOString();

      if (session.remainingSeconds <= 0) {
        this.autoCompleteSession(session.id);
      }
    }
  }

  private autoCompleteSession(sessionId: number): void {
    const session = this.sessions.find(item => item.id === sessionId);
    if (!session || session.status !== 'active') return;

    const computer = this.getComputerById(session.computerId);

    session.endTime = new Date().toISOString();
    session.status = 'completed';
    session.remainingSeconds = 0;
    session.totalAmount = session.amountPaid;

    if (computer) {
      computer.status = 'available';
    }

    this.transactions.push({
      id: this.transactionIdCounter++,
      type: 'session_payment',
      amount: session.amountPaid,
      memberId: session.memberId,
      sessionId: session.id,
      description: `Auto-completed prepaid session for ${session.customerName}`,
      createdAt: new Date().toISOString(),
      paymentMethod: 'Cash'
    });
  }

  getMembers(): Member[] {
    return [...this.members];
  }

  getMemberById(id: number): Member | undefined {
    return this.members.find(member => member.id === id);
  }

  addMember(member: Omit<Member, 'id' | 'createdAt'>): Member {
    const newMember: Member = {
      id: this.memberIdCounter++,
      createdAt: new Date().toISOString(),
      ...member
    };

    this.members.push(newMember);
    return newMember;
  }

  updateMember(id: number, changes: Partial<Member>): Member | null {
    const index = this.members.findIndex(member => member.id === id);

    if (index === -1) {
      return null;
    }

    this.members[index] = {
      ...this.members[index],
      ...changes,
      id: this.members[index].id
    };

    return this.members[index];
  }

  deleteMember(id: number): boolean {
    const index = this.members.findIndex(member => member.id === id);

    if (index === -1) {
      return false;
    }

    this.members.splice(index, 1);
    return true;
  }

  addCreditToMember(
    memberId: number,
    amount: number,
    paymentMethod?: string,
    timeAddedMinutes?: number
  ): boolean {
    const member = this.getMemberById(memberId);

    if (!member || amount <= 0) {
      return false;
    }

    member.balance += amount;

    this.transactions.push({
      id: this.transactionIdCounter++,
      type: 'topup',
      amount,
      memberId,
      sessionId: null,
      description: `Top-up for ${member.name}`,
      createdAt: new Date().toISOString(),
      paymentMethod,
      timeAddedMinutes
    });

    return true;
  }

  getComputers(): Computer[] {
    return [...this.computers];
  }

  getComputerById(id: number): Computer | undefined {
    return this.computers.find(computer => computer.id === id);
  }

  addComputer(payload: {
    name: string;
    ratePerHour: number;
    status?: ComputerStatus;
    specs?: string;
  }): { success: boolean; message: string; computer?: Computer } {
    const name = payload.name.trim();

    if (!name) {
      return { success: false, message: 'Computer name is required.' };
    }

    if (!payload.ratePerHour || payload.ratePerHour <= 0) {
      return { success: false, message: 'Rate per hour must be greater than zero.' };
    }

    const duplicate = this.computers.some(
      computer => computer.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      return { success: false, message: 'Computer name already exists.' };
    }

    const nextId =
      this.computers.length > 0
        ? Math.max(...this.computers.map(computer => computer.id)) + 1
        : 1;

    const newComputer: Computer = {
      id: nextId,
      name,
      ratePerHour: payload.ratePerHour,
      status: payload.status || 'available',
      specs: payload.specs?.trim() || ''
    };

    this.computers.push(newComputer);

    return {
      success: true,
      message: 'Computer added successfully.',
      computer: newComputer
    };
  }

  updateComputer(id: number, changes: Partial<Computer>): Computer | null {
    const index = this.computers.findIndex(computer => computer.id === id);

    if (index === -1) {
      return null;
    }

    this.computers[index] = {
      ...this.computers[index],
      ...changes,
      id: this.computers[index].id
    };

    return this.computers[index];
  }

  setComputerStatus(id: number, status: ComputerStatus): boolean {
    const computer = this.getComputerById(id);

    if (!computer) {
      return false;
    }

    computer.status = status;
    return true;
  }

  getSessions(): CafeSession[] {
    return [...this.sessions];
  }

  getActiveSessions(): CafeSession[] {
    return this.sessions.filter(session => session.status === 'active');
  }

  getActiveSessionByComputerId(computerId: number): CafeSession | undefined {
    return this.sessions.find(
      session => session.computerId === computerId && session.status === 'active'
    );
  }

  startSession(payload: {
    computerId: number;
    memberId?: number | null;
    customerName: string;
    amountPaid: number;
  }): { success: boolean; message: string; session?: CafeSession } {
    const computer = this.getComputerById(payload.computerId);

    if (!computer) {
      return { success: false, message: 'Computer not found.' };
    }

    if (computer.status !== 'available') {
      return { success: false, message: 'Computer is not available.' };
    }

    if (!payload.amountPaid || payload.amountPaid <= 0) {
      return { success: false, message: 'Amount paid must be greater than zero.' };
    }

    const hasActiveSession = this.sessions.some(
      session => session.computerId === payload.computerId && session.status === 'active'
    );

    if (hasActiveSession) {
      return { success: false, message: 'This computer already has an active session.' };
    }

    const minutesPurchased = Math.floor((payload.amountPaid / computer.ratePerHour) * 60);

    if (minutesPurchased <= 0) {
      return { success: false, message: 'Amount paid is too low for the selected computer rate.' };
    }

    const nowIso = new Date().toISOString();

    const newSession: CafeSession = {
      id: this.sessionIdCounter++,
      computerId: payload.computerId,
      memberId: payload.memberId ?? null,
      customerName: payload.customerName,
      startTime: nowIso,
      endTime: null,
      status: 'active',
      ratePerHour: computer.ratePerHour,
      totalAmount: payload.amountPaid,
      amountPaid: payload.amountPaid,
      minutesPurchased,
      remainingSeconds: minutesPurchased * 60,
      lastTickAt: nowIso
    };

    this.sessions.push(newSession);
    computer.status = 'occupied';

    return {
      success: true,
      message: 'Session started successfully.',
      session: newSession
    };
  }

  endSession(sessionId: number): { success: boolean; message: string; session?: CafeSession } {
    const session = this.sessions.find(item => item.id === sessionId);

    if (!session) {
      return { success: false, message: 'Session not found.' };
    }

    if (session.status !== 'active') {
      return { success: false, message: 'Only active sessions can be ended.' };
    }

    const computer = this.getComputerById(session.computerId);

    session.endTime = new Date().toISOString();
    session.status = 'completed';
    session.totalAmount = session.amountPaid;

    if (computer) {
      computer.status = 'available';
    }

    this.transactions.push({
      id: this.transactionIdCounter++,
      type: 'session_payment',
      amount: session.amountPaid,
      memberId: session.memberId,
      sessionId: session.id,
      description: `Session payment for ${session.customerName}`,
      createdAt: new Date().toISOString(),
      paymentMethod: 'Cash'
    });

    return {
      success: true,
      message: 'Session ended successfully.',
      session
    };
  }

  extendSession(sessionId: number, additionalAmount: number): { success: boolean; message: string } {
    const session = this.sessions.find(item => item.id === sessionId);

    if (!session) {
      return { success: false, message: 'Session not found.' };
    }

    if (session.status !== 'active') {
      return { success: false, message: 'Only active sessions can be extended.' };
    }

    if (!additionalAmount || additionalAmount <= 0) {
      return { success: false, message: 'Additional amount must be greater than zero.' };
    }

    const additionalMinutes = Math.floor((additionalAmount / session.ratePerHour) * 60);

    if (additionalMinutes <= 0) {
      return { success: false, message: 'Additional amount is too low.' };
    }

    session.amountPaid += additionalAmount;
    session.totalAmount = session.amountPaid;
    session.minutesPurchased += additionalMinutes;
    session.remainingSeconds += additionalMinutes * 60;

    return {
      success: true,
      message: 'Session extended successfully.'
    };
  }

  getRemainingTimeText(sessionId: number): string {
    const session = this.sessions.find(item => item.id === sessionId);
    if (!session) return '00:00';

    const totalSeconds = Math.max(0, session.remainingSeconds);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');

    return `${minutes}:${seconds}`;
  }

  getMinutesPurchasedText(sessionId: number): string {
    const session = this.sessions.find(item => item.id === sessionId);
    if (!session) return '0:00';

    return this.formatMinutes(session.minutesPurchased);
  }

  getProgressPercent(sessionId: number): number {
    const session = this.sessions.find(item => item.id === sessionId);
    if (!session) return 0;

    const totalSeconds = session.minutesPurchased * 60;
    if (totalSeconds <= 0) return 0;

    const percent = (session.remainingSeconds / totalSeconds) * 100;
    return Math.max(0, Math.min(100, percent));
  }

  private formatMinutes(totalMinutes: number): string {
    const safeMinutes = Math.max(0, totalMinutes);
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;

    return `${hours}h ${minutes}m`;
  }

  getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  getTodayRevenue(): number {
    const today = new Date().toDateString();

    return this.transactions
      .filter(transaction => new Date(transaction.createdAt).toDateString() === today)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  getDashboardSummary() {
    const totalMembers = this.members.length;
    const activeMembers = this.members.filter(member => member.status === 'active').length;
    const totalComputers = this.computers.length;
    const availableComputers = this.computers.filter(computer => computer.status === 'available').length;
    const occupiedComputers = this.computers.filter(computer => computer.status === 'occupied').length;
    const maintenanceComputers = this.computers.filter(computer => computer.status === 'maintenance').length;
    const activeSessions = this.sessions.filter(session => session.status === 'active').length;
    const completedSessions = this.sessions.filter(session => session.status === 'completed').length;
    const todayRevenue = this.getTodayRevenue();

    return {
      totalMembers,
      activeMembers,
      totalComputers,
      availableComputers,
      occupiedComputers,
      maintenanceComputers,
      activeSessions,
      completedSessions,
      todayRevenue
    };
  }
}