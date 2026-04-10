import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class TopbarComponent implements OnInit {
  adminName = 'Admin User';
  adminRole = 'Staff Member';
  adminInitial = 'A';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const admin = localStorage.getItem('adminUser');

    if (!admin) {
      return;
    }

    try {
      const parsed = JSON.parse(admin);
      const username = String(parsed.username || '').trim();

      if (username) {
        this.adminName = username;
        this.adminInitial = username.charAt(0).toUpperCase();
      }
    } catch (error) {
      console.error('Failed to load admin user from localStorage:', error);
    }
  }
}