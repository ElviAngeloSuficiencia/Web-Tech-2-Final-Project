import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CafeService } from '../../services/cafe.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  summary: any;

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

  constructor(private cafeService: CafeService) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.summary = this.cafeService.getDashboardSummary();

    this.stats = [
      {
        title: 'Active Sessions',
        value: this.summary.activeSessions,
        sub: `${this.summary.completedSessions} completed sessions`,
        icon: '⚡',
        type: 'blue'
      },
      {
        title: 'Total Members',
        value: this.summary.totalMembers,
        sub: `${this.summary.activeMembers} active members`,
        icon: '👥',
        type: 'green'
      },
      {
        title: 'Available Computers',
        value: `${this.summary.availableComputers} / ${this.summary.totalComputers}`,
        sub: `${this.summary.occupiedComputers} in use`,
        icon: '🖥️',
        type: 'orange'
      },
      {
        title: "Today's Revenue",
        value: `₱${this.summary.todayRevenue}`,
        sub: `${this.summary.maintenanceComputers} under maintenance`,
        icon: '💲',
        type: 'pink'
      }
    ];

    this.activity = [];
  }
}