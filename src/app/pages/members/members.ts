import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Member {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  balance: number;
  status: 'active' | 'inactive' | 'blocked' | string;
  createdAt: string;
}

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './members.html',
  styleUrl: './members.scss'
})
export class MembersComponent implements OnInit {
  private baseUrl = 'http://localhost:3000/api';

  showModal = false;

  name = '';
  contact = '';
  email = '';
  startingBalance = 0;

  members: Member[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    this.http.get<any>(`${this.baseUrl}/members`).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];

        this.members = rows.map((row: any) => ({
          id: Number(row.member_id),
          name: row.name || '',
          phone: row.contact_number || '',
          email: row.email || '',
          balance: Number(row.remaining_time || 0),
          status: row.status || 'active',
          createdAt: row.created_at || ''
        }));
      },
      error: (err) => {
        console.error('Failed to load members:', err);
        this.members = [];
      }
    });
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.name = '';
    this.contact = '';
    this.email = '';
    this.startingBalance = 0;
  }

  addMember(): void {
    if (!this.name.trim()) return;

    const payload = {
      name: this.name.trim(),
      contact_number: this.contact.trim(),
      email: this.email.trim(),
      remaining_time: Number(this.startingBalance || 0),
      status: 'active'
    };

    this.http.post<any>(`${this.baseUrl}/members`, payload).subscribe({
      next: () => {
        this.closeModal();
        this.loadMembers();
      },
      error: (err) => {
        console.error('Failed to add member:', err);
        alert('Failed to add member.');
      }
    });
  }

  deleteMember(id: number): void {
    const confirmed = window.confirm('Are you sure you want to delete this member?');
    if (!confirmed) return;

    this.http.delete<any>(`${this.baseUrl}/members/${id}`).subscribe({
      next: () => {
        this.loadMembers();
      },
      error: (err) => {
        console.error('Failed to delete member:', err);
        alert('Failed to delete member.');
      }
    });
  }

  addTopUp(id: number): void {
    const input = window.prompt('Enter top-up amount:');
    if (input === null) return;

    const amount = Number(input);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const minutes = amount;

    this.http.post<any>(`${this.baseUrl}/payments`, {
      member_id: id,
      amount,
      payment_method: 'Cash',
      time_added_minutes: minutes
    }).subscribe({
      next: () => {
        this.loadMembers();
      },
      error: (err) => {
        console.error('Failed to top up member:', err);
        alert('Failed to top up member.');
      }
    });
  }

  getStatusClass(status: string): string {
    if (status === 'active') return 'active';
    if (status === 'inactive') return 'low';
    if (status === 'blocked') return 'expired';
    return '';
  }
}