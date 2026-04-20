import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ComputersService } from '../../services/computers.service';
import { PaymentService } from '../../services/payment.service';

interface ReportStat {
  label: string;
  value: string;
  note: string;
  icon: string;
  noteClass: string;
}

interface ActiveMemberRow {
  rank: number;
  name: string;
  sessions: number;
  hours: number;
  width: number;
}

interface UsageSlice {
  label: string;
  value: number;
  percent: number;
  colorClass: string;
  color: string;
}

interface MemberRow {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  remainingTime: number;
}

interface TransactionRow {
  id: number;
  type: string;
  amount: number;
  memberId: number | null;
  computerId: number | null;
  paymentMethod: string;
  timeAddedMinutes: number;
  createdAt: string;
  memberName: string;
}

interface SessionRow {
  id: number;
  memberId: number | null;
  memberName: string;
  computerId: number | null;
  startTime: string;
  endTime: string | null;
  minutesPurchased: number;
  amountPaid: number;
  paymentMethod: string;
  status: 'active' | 'completed';
}

interface ComputerRow {
  id: number;
  computerName: string;
  status: string;
  memberId: number | null;
  memberName: string;
  customerName: string;
  timeStarted: string;
  timeEnded: string;
  remainingSeconds: number;
  amountPaid: number;
}

type SessionTrendView = 'daily' | 'weekly' | 'monthly';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class ReportsComponent implements OnInit, OnDestroy {
  stats: ReportStat[] = [];

  days: string[] = [];
  revenueBars: number[] = [];

  sessionTrend: number[] = [];
  sessionTrendLabels: string[] = [];
  sessionTrendView: SessionTrendView = 'daily';

  activeMembers: ActiveMemberRow[] = [];
  usageDistribution: UsageSlice[] = [];
  donutStyle = '';

  maxRevenue = 1;
  maxSessions = 1;

  private refreshHandle: ReturnType<typeof setInterval> | null = null;
  private isLoading = false;

  private allSessions: SessionRow[] = [];

  constructor(
    private paymentService: PaymentService,
    private computersService: ComputersService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReports();

    this.refreshHandle = setInterval(() => {
      this.loadReports();
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
    }
  }

  private normalizeArrayResponse(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.result)) return payload.result;
    if (Array.isArray(payload?.members)) return payload.members;
    if (Array.isArray(payload?.transactions)) return payload.transactions;
    if (Array.isArray(payload?.computers)) return payload.computers;
    return [];
  }

  async loadReports(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const [membersRes, transactionsRes, computersRes] = await Promise.all([
        firstValueFrom(this.paymentService.getMembers()),
        firstValueFrom(this.paymentService.getTransactions()),
        firstValueFrom(this.computersService.getComputers())
      ]);

      const members = this.mapMembers(this.normalizeArrayResponse(membersRes));
      const transactions = this.mapTransactions(this.normalizeArrayResponse(transactionsRes));
      const computers = this.mapComputers(this.normalizeArrayResponse(computersRes));
      const sessions = this.buildSessions(transactions, computers);

      this.allSessions = sessions;

      const current7Days = this.getLastNDays(7, 0);
      const previous7Days = this.getLastNDays(7, 7);

      this.days = current7Days.map(day => day.label);

      this.revenueBars = current7Days.map(day =>
        transactions
          .filter(t => this.isSameDay(new Date(t.createdAt), day.date))
          .reduce((sum, t) => sum + Number(t.amount || 0), 0)
      );

      this.maxRevenue = Math.max(...this.revenueBars, 1);

      this.updateSessionTrendChart();

      this.activeMembers = this.buildActiveMembers(members, sessions);
      this.usageDistribution = this.buildUsageDistribution(transactions, current7Days);
      this.donutStyle = this.buildDonutStyle(this.usageDistribution);

      this.stats = this.buildStats(
        members,
        sessions,
        transactions,
        computers,
        current7Days,
        previous7Days
      );

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load reports:', error);

      this.stats = [
        {
          label: 'Weekly Revenue',
          value: this.formatPeso(0),
          note: 'No data available',
          icon: '💲',
          noteClass: 'orange'
        },
        {
          label: 'Total Sessions',
          value: '0',
          note: 'No data available',
          icon: '📊',
          noteClass: 'orange'
        },
        {
          label: 'Active Members',
          value: '0',
          note: 'No data available',
          icon: '👥',
          noteClass: 'orange'
        },
        {
          label: 'Avg. Session Time',
          value: '0m',
          note: 'No data available',
          icon: '📈',
          noteClass: 'orange'
        }
      ];

      this.days = this.getLastNDays(7, 0).map(day => day.label);
      this.revenueBars = [0, 0, 0, 0, 0, 0, 0];

      this.allSessions = [];
      this.sessionTrend = [];
      this.sessionTrendLabels = [];

      this.activeMembers = [];
      this.usageDistribution = [
        { label: 'Cash', value: 0, percent: 0, colorClass: 'cash', color: '#10b981' },
        { label: 'GCash', value: 0, percent: 0, colorClass: 'gcash', color: '#3b82f6' },
        { label: 'Card', value: 0, percent: 0, colorClass: 'card', color: '#f59e0b' }
      ];
      this.donutStyle = this.buildDonutStyle(this.usageDistribution);
      this.maxRevenue = 1;
      this.maxSessions = 1;

      this.cdr.detectChanges();
    } finally {
      this.isLoading = false;
    }
  }

  updateSessionTrendChart(): void {
    if (this.sessionTrendView === 'daily') {
      const daily = this.getLastNDaysTrend(this.allSessions, 7);
      this.sessionTrendLabels = daily.labels;
      this.sessionTrend = daily.values;
    } else if (this.sessionTrendView === 'weekly') {
      const weekly = this.getLastNWeeksTrend(this.allSessions, 6);
      this.sessionTrendLabels = weekly.labels;
      this.sessionTrend = weekly.values;
    } else {
      const monthly = this.getLastNMonthsTrend(this.allSessions, 6);
      this.sessionTrendLabels = monthly.labels;
      this.sessionTrend = monthly.values;
    }

    this.maxSessions = Math.max(...this.sessionTrend, 1);
  }

  getPointLeft(index: number): number {
    if (this.sessionTrend.length <= 1) {
      return 0;
    }

    return (index / (this.sessionTrend.length - 1)) * 100;
  }

  private mapMembers(rows: any[]): MemberRow[] {
    return rows.map((row: any) => ({
      id: Number(row.member_id ?? row.id ?? 0),
      name: row.name ?? row.member_name ?? 'Unknown Member',
      status: String(row.status ?? 'active'),
      createdAt: row.created_at ?? row.createdAt ?? '',
      remainingTime: Number(row.remaining_time ?? row.remainingTime ?? 0)
    }));
  }

  private mapTransactions(rows: any[]): TransactionRow[] {
    return rows.map((row: any) => ({
      id: Number(row.transaction_id ?? row.id ?? 0),
      type: String(row.transaction_type ?? row.type ?? '').trim().toLowerCase(),
      amount: Number(row.amount ?? 0),
      memberId:
        row.member_id !== null && row.member_id !== undefined
          ? Number(row.member_id)
          : null,
      computerId:
        row.computer_id !== null && row.computer_id !== undefined
          ? Number(row.computer_id)
          : null,
      paymentMethod: String(row.payment_method ?? 'Unknown').trim() || 'Unknown',
      timeAddedMinutes: Number(row.time_added ?? row.timeAddedMinutes ?? 0),
      createdAt: row.transaction_date ?? row.created_at ?? row.createdAt ?? '',
      memberName: row.member_name ?? row.name ?? 'Walk-in'
    }));
  }

  private mapComputers(rows: any[]): ComputerRow[] {
    return rows.map((row: any) => ({
      id: Number(row.computer_id ?? row.id ?? 0),
      computerName: row.computer_name ?? row.name ?? `PC-${row.computer_id ?? row.id ?? ''}`,
      status: String(row.status ?? 'available'),
      memberId:
        row.member_id !== null && row.member_id !== undefined
          ? Number(row.member_id)
          : null,
      memberName: row.member_name ?? '',
      customerName: row.customer_name ?? '',
      timeStarted: row.time_started ?? '',
      timeEnded: row.time_ended ?? '',
      remainingSeconds: Number(row.remaining_seconds ?? 0),
      amountPaid: Number(row.amount_paid ?? 0)
    }));
  }

  private buildSessions(transactions: TransactionRow[], computers: ComputerRow[]): SessionRow[] {
    const sessions: SessionRow[] = [];

    const sessionStarts = transactions.filter(
      transaction => transaction.type === 'session_start' || transaction.type === 'session_payment'
    );

    for (const transaction of sessionStarts) {
      sessions.push({
        id: transaction.id,
        memberId: transaction.memberId,
        memberName: transaction.memberName || 'Walk-in',
        computerId: transaction.computerId,
        startTime: transaction.createdAt,
        endTime: null,
        minutesPurchased: Number(transaction.timeAddedMinutes || 0),
        amountPaid: Number(transaction.amount || 0),
        paymentMethod: transaction.paymentMethod || 'Unknown',
        status: 'completed'
      });
    }

    const activeComputers = computers.filter(
      computer =>
        String(computer.status).toLowerCase() === 'occupied' &&
        !!computer.timeStarted
    );

    for (const computer of activeComputers) {
      const alreadyExists = sessions.some(session => {
        if (session.computerId !== computer.id) return false;

        const sessionDate = new Date(session.startTime).getTime();
        const computerDate = new Date(computer.timeStarted).getTime();

        return Math.abs(sessionDate - computerDate) < 60 * 1000;
      });

      if (alreadyExists) {
        continue;
      }

      sessions.push({
        id: Number(`9${computer.id}${Date.now()}`),
        memberId: computer.memberId,
        memberName: computer.memberName || computer.customerName || 'Walk-in',
        computerId: computer.id,
        startTime: computer.timeStarted,
        endTime: computer.timeEnded || null,
        minutesPurchased: Math.floor((computer.remainingSeconds || 0) / 60),
        amountPaid: Number(computer.amountPaid || 0),
        paymentMethod: 'Unknown',
        status: 'active'
      });
    }

    return sessions.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  buildStats(
    members: MemberRow[],
    sessions: SessionRow[],
    transactions: TransactionRow[],
    computers: ComputerRow[],
    current7Days: Array<{ date: Date; label: string }>,
    previous7Days: Array<{ date: Date; label: string }>
  ): ReportStat[] {
    const currentRevenue = this.sumRevenueForDays(transactions, current7Days);
    const previousRevenue = this.sumRevenueForDays(transactions, previous7Days);

    const currentSessions = this.countSessionsForDays(sessions, current7Days);
    const previousSessions = this.countSessionsForDays(sessions, previous7Days);

    const activeMembers = members.filter(
      member => String(member.status).toLowerCase() === 'active'
    ).length;

    const currentAvgMinutes = this.getAverageSessionMinutesForDays(sessions, current7Days);
    const previousAvgMinutes = this.getAverageSessionMinutesForDays(sessions, previous7Days);

    const revenueDiff = this.getPercentChange(currentRevenue, previousRevenue);
    const sessionDiff = this.getPercentChange(currentSessions, previousSessions);
    const avgMinuteDiff = Math.round(currentAvgMinutes - previousAvgMinutes);

    const liveOccupied = computers.filter(
      computer => String(computer.status).toLowerCase() === 'occupied'
    ).length;

    return [
      {
        label: 'Weekly Revenue',
        value: this.formatPeso(currentRevenue),
        note: this.buildChangeText(revenueDiff, 'vs previous 7 days'),
        icon: '💲',
        noteClass: revenueDiff >= 0 ? 'green' : 'orange'
      },
      {
        label: 'Total Sessions',
        value: currentSessions.toString(),
        note: `${liveOccupied} live occupied computer${liveOccupied === 1 ? '' : 's'}`,
        icon: '📊',
        noteClass: 'blue'
      },
      {
        label: 'Active Members',
        value: activeMembers.toString(),
        note: `${members.length} total registered members`,
        icon: '👥',
        noteClass: 'purple'
      },
      {
        label: 'Avg. Session Time',
        value: this.formatHoursMinutes(currentAvgMinutes),
        note: `${avgMinuteDiff >= 0 ? '+' : ''}${avgMinuteDiff} min vs previous 7 days`,
        icon: '📈',
        noteClass: avgMinuteDiff >= 0 ? 'green' : 'orange'
      }
    ];
  }

  buildActiveMembers(members: MemberRow[], sessions: SessionRow[]): ActiveMemberRow[] {
    const memberMap = new Map<number, { name: string; sessions: number; minutes: number }>();

    for (const session of sessions) {
      if (session.memberId === null || session.memberId === undefined) continue;

      const member = members.find(m => m.id === session.memberId);
      const memberName = member?.name || session.memberName || 'Unknown Member';

      if (!memberMap.has(session.memberId)) {
        memberMap.set(session.memberId, {
          name: memberName,
          sessions: 0,
          minutes: 0
        });
      }

      const entry = memberMap.get(session.memberId)!;
      entry.sessions += 1;
      entry.minutes += Number(session.minutesPurchased || 0);
    }

    const rows = Array.from(memberMap.values())
      .sort((a, b) => {
        if (b.sessions !== a.sessions) return b.sessions - a.sessions;
        return b.minutes - a.minutes;
      })
      .slice(0, 5);

    const maxSessions = Math.max(...rows.map(r => r.sessions), 1);

    return rows.map((row, index) => ({
      rank: index + 1,
      name: row.name,
      sessions: row.sessions,
      hours: Number((row.minutes / 60).toFixed(1)),
      width: (row.sessions / maxSessions) * 100
    }));
  }

  buildUsageDistribution(
    transactions: TransactionRow[],
    current7Days: Array<{ date: Date; label: string }>
  ): UsageSlice[] {
    const currentTransactions = transactions.filter(t =>
      current7Days.some(day => this.isSameDay(new Date(t.createdAt), day.date))
    );

    const methodTotals = new Map<string, number>();

    for (const transaction of currentTransactions) {
      const method = (transaction.paymentMethod || 'Unknown').trim() || 'Unknown';
      methodTotals.set(method, (methodTotals.get(method) || 0) + Number(transaction.amount || 0));
    }

    const colorMap: Record<string, { colorClass: string; color: string }> = {
      Cash: { colorClass: 'cash', color: '#10b981' },
      GCash: { colorClass: 'gcash', color: '#3b82f6' },
      Card: { colorClass: 'card', color: '#f59e0b' },
      System: { colorClass: 'unknown', color: '#94a3b8' },
      Unknown: { colorClass: 'unknown', color: '#94a3b8' }
    };

    const total = Array.from(methodTotals.values()).reduce((sum, value) => sum + value, 0);

    if (total <= 0) {
      return [
        { label: 'Cash', value: 0, percent: 0, colorClass: 'cash', color: '#10b981' },
        { label: 'GCash', value: 0, percent: 0, colorClass: 'gcash', color: '#3b82f6' },
        { label: 'Card', value: 0, percent: 0, colorClass: 'card', color: '#f59e0b' }
      ];
    }

    return Array.from(methodTotals.entries())
      .map(([label, value]) => ({
        label,
        value,
        percent: Number(((value / total) * 100).toFixed(1)),
        colorClass: colorMap[label]?.colorClass || 'unknown',
        color: colorMap[label]?.color || '#94a3b8'
      }))
      .sort((a, b) => b.value - a.value);
  }

  buildDonutStyle(slices: UsageSlice[]): string {
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

    if (total <= 0) {
      return 'conic-gradient(#e2e8f0 0 100%)';
    }

    let running = 0;
    const parts: string[] = [];

    for (const slice of slices) {
      const start = running;
      const end = running + (slice.value / total) * 100;
      parts.push(`${slice.color} ${start}% ${end}%`);
      running = end;
    }

    return `conic-gradient(${parts.join(', ')})`;
  }

  getLastNDays(count: number, offsetDays: number): Array<{ date: Date; label: string }> {
    const days: Array<{ date: Date; label: string }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i - offsetDays);

      days.push({
        date,
        label: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }

    return days;
  }

  private getLastNDaysTrend(
    sessions: SessionRow[],
    count: number
  ): { labels: string[]; values: number[] } {
    const ranges = this.getLastNDays(count, 0);

    return {
      labels: ranges.map(item => item.label),
      values: ranges.map(item =>
        sessions.filter(session =>
          this.isSameDay(new Date(session.startTime), item.date)
        ).length
      )
    };
  }

  private getLastNWeeksTrend(
    sessions: SessionRow[],
    count: number
  ): { labels: string[]; values: number[] } {
    const labels: string[] = [];
    const values: number[] = [];
    const today = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      end.setDate(today.getDate() - (i * 7));

      const start = new Date(end);
      start.setHours(0, 0, 0, 0);
      start.setDate(end.getDate() - 6);

      labels.push(`Week ${count - i}`);

      values.push(
        sessions.filter(session => {
          const sessionDate = new Date(session.startTime);
          return sessionDate >= start && sessionDate <= end;
        }).length
      );
    }

    return { labels, values };
  }

  private getLastNMonthsTrend(
    sessions: SessionRow[],
    count: number
  ): { labels: string[]; values: number[] } {
    const labels: string[] = [];
    const values: number[] = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = target.getFullYear();
      const month = target.getMonth();

      labels.push(
        target.toLocaleDateString('en-US', {
          month: 'short'
        })
      );

      values.push(
        sessions.filter(session => {
          const sessionDate = new Date(session.startTime);
          return (
            sessionDate.getFullYear() === year &&
            sessionDate.getMonth() === month
          );
        }).length
      );
    }

    return { labels, values };
  }

  sumRevenueForDays(
    transactions: TransactionRow[],
    days: Array<{ date: Date; label: string }>
  ): number {
    return transactions
      .filter(transaction =>
        days.some(day => this.isSameDay(new Date(transaction.createdAt), day.date))
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  }

  countSessionsForDays(
    sessions: SessionRow[],
    days: Array<{ date: Date; label: string }>
  ): number {
    return sessions.filter(session =>
      days.some(day => this.isSameDay(new Date(session.startTime), day.date))
    ).length;
  }

  getAverageSessionMinutesForDays(
    sessions: SessionRow[],
    days: Array<{ date: Date; label: string }>
  ): number {
    const filtered = sessions.filter(session =>
      days.some(day => this.isSameDay(new Date(session.startTime), day.date))
    );

    if (filtered.length === 0) return 0;

    const totalMinutes = filtered.reduce(
      (sum, session) => sum + Number(session.minutesPurchased || 0),
      0
    );

    return totalMinutes / filtered.length;
  }

  getPercentChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return ((current - previous) / previous) * 100;
  }

  buildChangeText(value: number, suffix: string): string {
    const rounded = Math.abs(value).toFixed(1);

    if (value > 0) return `+${rounded}% ${suffix}`;
    if (value < 0) return `-${rounded}% ${suffix}`;
    return `0.0% ${suffix}`;
  }

  isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  getBarHeight(value: number): number {
    return (value / this.maxRevenue) * 260;
  }

  getPointBottom(value: number): number {
    return (value / this.maxSessions) * 220;
  }

  formatPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }

  formatHoursMinutes(totalMinutes: number): string {
    const safeMinutes = Math.round(totalMinutes);
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;

    if (hours <= 0) {
      return `${minutes}m`;
    }

    return `${hours}h ${minutes}m`;
  }
}