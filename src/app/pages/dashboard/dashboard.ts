import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { CafeService } from '../../services/cafe.service';

type DashboardSummary = {
  activeSessions: number;
  completedSessions: number;
  totalMembers: number;
  activeMembers: number;
  availableComputers: number;
  totalComputers: number;
  occupiedComputers: number;
  maintenanceComputers: number;
  todayRevenue: number;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  summary: DashboardSummary | null = null;
  adminName = '';
  debugMessage = 'Initializing dashboard...';
  isLoading = false;

  stats: {
    title: string;
    value: string | number;
    sub: string;
    icon: string;
    type: string;
  }[] = [];

  activity: {
    name: string;
    text: string;
    time: string;
    type: string;
    icon: string;
  }[] = [];

  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly refreshMs = 5000;
  private readonly storageKey = 'dashboard_last_good_summary';

  constructor(
    private cafeService: CafeService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.debugMessage = 'Not running in browser.';
      this.setFallbackDashboard();
      return;
    }

    const admin = localStorage.getItem('adminUser');

    if (!admin) {
      this.router.navigateByUrl('/login');
      return;
    }

    try {
      const parsed = JSON.parse(admin);
      this.adminName = parsed.username || '';
    } catch {
      localStorage.removeItem('adminUser');
      this.router.navigateByUrl('/login');
      return;
    }

    this.restoreLastGoodSummary();
    this.startAutoRefresh();
    this.loadDashboard(true);
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private getEmptySummary(): DashboardSummary {
    return {
      activeSessions: 0,
      completedSessions: 0,
      totalMembers: 0,
      activeMembers: 0,
      availableComputers: 0,
      totalComputers: 0,
      occupiedComputers: 0,
      maintenanceComputers: 0,
      todayRevenue: 0
    };
  }

  private setFallbackDashboard(): void {
    this.summary = this.getEmptySummary();
    this.buildStats();
    this.activity = [];
  }

  private restoreLastGoodSummary(): void {
    try {
      const cached = localStorage.getItem(this.storageKey);

      if (cached) {
        this.summary = JSON.parse(cached) as DashboardSummary;
        this.buildStats();
        this.activity = [];
        this.debugMessage = 'Loaded cached dashboard while waiting for live data...';
        return;
      }
    } catch (error) {
      console.warn('Failed to restore cached dashboard summary:', error);
    }

    this.setFallbackDashboard();
    this.debugMessage = 'Showing fallback dashboard while waiting for live data...';
  }

  private saveLastGoodSummary(summary: DashboardSummary): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(summary));
    } catch (error) {
      console.warn('Failed to cache dashboard summary:', error);
    }
  }

  private hasUsefulData(summary: DashboardSummary): boolean {
    return (
      summary.totalMembers > 0 ||
      summary.totalComputers > 0 ||
      summary.todayRevenue > 0 ||
      summary.activeSessions > 0 ||
      summary.completedSessions > 0
    );
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Dashboard request timed out after ${timeoutMs} ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  async loadDashboard(isFirstLoad = false): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    this.debugMessage = isFirstLoad
      ? 'Loading dashboard from API...'
      : `Refreshing dashboard... ${new Date().toLocaleTimeString()}`;

    try {
      const apiSummary = await this.withTimeout(
        this.cafeService.getDashboardSummaryFromApi(),
        6500
      );

      const nextSummary: DashboardSummary = {
        activeSessions: apiSummary.activeSessions ?? 0,
        completedSessions: apiSummary.completedSessions ?? 0,
        totalMembers: apiSummary.totalMembers ?? 0,
        activeMembers: apiSummary.activeMembers ?? 0,
        availableComputers: apiSummary.availableComputers ?? 0,
        totalComputers: apiSummary.totalComputers ?? 0,
        occupiedComputers: apiSummary.occupiedComputers ?? 0,
        maintenanceComputers: apiSummary.maintenanceComputers ?? 0,
        todayRevenue: apiSummary.todayRevenue ?? 0
      };

      const looksEmpty = !this.hasUsefulData(nextSummary);
      const hasPreviousGoodData = !!this.summary && this.hasUsefulData(this.summary);

      if (looksEmpty && hasPreviousGoodData) {
        console.warn('API returned empty dashboard data. Keeping previous values.');
        this.debugMessage = `API returned empty data at ${new Date().toLocaleTimeString()}, keeping last good values.`;
      } else {
        this.summary = nextSummary;
        this.saveLastGoodSummary(nextSummary);
        this.buildStats();
        this.activity = [];
        this.debugMessage = `Dashboard updated at ${new Date().toLocaleTimeString()}`;
      }
    } catch (error) {
      console.error('Dashboard load failed:', error);

      if (!this.summary) {
        this.restoreLastGoodSummary();
      }

      this.debugMessage = `Refresh failed at ${new Date().toLocaleTimeString()}, keeping last good data.`;
    } finally {
      this.isLoading = false;
    }
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh();

    this.refreshInterval = setInterval(() => {
      this.loadDashboard(false);
    }, this.refreshMs);
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  buildStats(): void {
    const s = this.summary || this.getEmptySummary();

    this.stats = [
      {
        title: 'Active Sessions',
        value: s.activeSessions,
        sub: `${s.completedSessions} completed sessions`,
        icon: '⚡',
        type: 'blue'
      },
      {
        title: 'Total Members',
        value: s.totalMembers,
        sub: `${s.activeMembers} active members`,
        icon: '👥',
        type: 'green'
      },
      {
        title: 'Available Computers',
        value: `${s.availableComputers} / ${s.totalComputers}`,
        sub: `${s.occupiedComputers} in use`,
        icon: '🖥️',
        type: 'orange'
      },
      {
        title: "Today's Revenue",
        value: `₱${Number(s.todayRevenue).toLocaleString()}`,
        sub: `${s.maintenanceComputers} under maintenance`,
        icon: '💲',
        type: 'pink'
      }
    ];

    console.log('Dashboard summary used by UI:', s);
    console.log('Stats array:', this.stats);
  }
}