import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CafeService, CafeSession, Member, Transaction } from '../../services/cafe.service';

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

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss'
})
export class ReportsComponent implements OnInit, OnDestroy {
  stats: ReportStat[] = [];

  days: string[] = [];
  revenueBars: number[] = [];
  sessionTrend: number[] = [];

  activeMembers: ActiveMemberRow[] = [];
  usageDistribution: UsageSlice[] = [];
  donutStyle = '';

  maxRevenue = 1;
  maxSessions = 1;

  private refreshHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private cafeService: CafeService) {}

  ngOnInit(): void {
    this.loadReports();

    this.refreshHandle = setInterval(() => {
      this.loadReports();
    }, 2000);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
      this.refreshHandle = null;
    }
  }

  loadReports(): void {
    const members = this.cafeService.getMembers();
    const sessions = this.cafeService.getSessions();
    const transactions = this.cafeService.getTransactions();

    const current7Days = this.getLastNDays(7, 0);
    const previous7Days = this.getLastNDays(7, 7);

    this.days = current7Days.map(day => day.label);

    this.revenueBars = current7Days.map(day =>
      transactions
        .filter(t => this.isSameDay(new Date(t.createdAt), day.date))
        .reduce((sum, t) => sum + t.amount, 0)
    );

    this.sessionTrend = current7Days.map(day =>
      sessions.filter(s => this.isSameDay(new Date(s.startTime), day.date)).length
    );

    this.maxRevenue = Math.max(...this.revenueBars, 1);
    this.maxSessions = Math.max(...this.sessionTrend, 1);

    this.activeMembers = this.buildActiveMembers(members, sessions);
    this.usageDistribution = this.buildUsageDistribution(transactions, current7Days);
    this.donutStyle = this.buildDonutStyle(this.usageDistribution);

    this.stats = this.buildStats(members, sessions, transactions, current7Days, previous7Days);
  }

  buildStats(
    members: Member[],
    sessions: CafeSession[],
    transactions: Transaction[],
    current7Days: Array<{ date: Date; label: string }>,
    previous7Days: Array<{ date: Date; label: string }>
  ): ReportStat[] {
    const currentRevenue = this.sumRevenueForDays(transactions, current7Days);
    const previousRevenue = this.sumRevenueForDays(transactions, previous7Days);

    const currentSessions = this.countSessionsForDays(sessions, current7Days);
    const previousSessions = this.countSessionsForDays(sessions, previous7Days);

    const activeMembers = members.filter(member => member.status === 'active').length;

    const currentAvgMinutes = this.getAverageSessionMinutesForDays(sessions, current7Days);
    const previousAvgMinutes = this.getAverageSessionMinutesForDays(sessions, previous7Days);

    const revenueDiff = this.getPercentChange(currentRevenue, previousRevenue);
    const sessionDiff = this.getPercentChange(currentSessions, previousSessions);
    const avgMinuteDiff = Math.round(currentAvgMinutes - previousAvgMinutes);

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
        note: this.buildChangeText(sessionDiff, 'vs previous 7 days'),
        icon: '📊',
        noteClass: sessionDiff >= 0 ? 'blue' : 'orange'
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

  buildActiveMembers(members: Member[], sessions: CafeSession[]): ActiveMemberRow[] {
    const sessionMap = new Map<number, { name: string; sessions: number; minutes: number }>();

    for (const session of sessions) {
      if (session.memberId === null) continue;

      const member = members.find(m => m.id === session.memberId);
      if (!member) continue;

      if (!sessionMap.has(member.id)) {
        sessionMap.set(member.id, {
          name: member.name,
          sessions: 0,
          minutes: 0
        });
      }

      const entry = sessionMap.get(member.id)!;
      entry.sessions += 1;
      entry.minutes += session.minutesPurchased || 0;
    }

    const rows = Array.from(sessionMap.values())
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
    transactions: Transaction[],
    current7Days: Array<{ date: Date; label: string }>
  ): UsageSlice[] {
    const currentTransactions = transactions.filter(t =>
      current7Days.some(day => this.isSameDay(new Date(t.createdAt), day.date))
    );

    const methodTotals = new Map<string, number>();

    for (const transaction of currentTransactions) {
      const method = (transaction.paymentMethod || 'Unknown').trim() || 'Unknown';
      methodTotals.set(method, (methodTotals.get(method) || 0) + transaction.amount);
    }

    const colorMap: Record<string, { colorClass: string; color: string }> = {
      Cash: { colorClass: 'cash', color: '#10b981' },
      GCash: { colorClass: 'gcash', color: '#3b82f6' },
      Card: { colorClass: 'card', color: '#f59e0b' },
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

  sumRevenueForDays(transactions: Transaction[], days: Array<{ date: Date; label: string }>): number {
    return transactions
      .filter(transaction =>
        days.some(day => this.isSameDay(new Date(transaction.createdAt), day.date))
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  countSessionsForDays(sessions: CafeSession[], days: Array<{ date: Date; label: string }>): number {
    return sessions.filter(session =>
      days.some(day => this.isSameDay(new Date(session.startTime), day.date))
    ).length;
  }

  getAverageSessionMinutesForDays(
    sessions: CafeSession[],
    days: Array<{ date: Date; label: string }>
  ): number {
    const filtered = sessions.filter(session =>
      days.some(day => this.isSameDay(new Date(session.startTime), day.date))
    );

    if (filtered.length === 0) return 0;

    const totalMinutes = filtered.reduce((sum, session) => sum + (session.minutesPurchased || 0), 0);
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