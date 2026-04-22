import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MemberService } from '../../services/member.service';

interface Member {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  remainingTime: number;
  status: 'active' | 'inactive' | 'blocked' | string;
  isUsing?: boolean;
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
  showModal = false;

  name = '';
  contact = '';
  email = '';

  members: Member[] = [];
  filteredMembers: Member[] = [];

  searchTerm = '';
  selectedStatus = 'all';

  isSubmitting = false;

  constructor(
    private memberService: MemberService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMembers();
  }

  // ===============================
  // LOAD MEMBERS
  // ===============================
  loadMembers(): void {
    this.memberService.getMembers().subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];

        this.members = rows.map((row: any) => ({
          id: Number(row.member_id ?? 0),
          name: row.name || '',
          phone: row.contact_number || '',
          email: row.email || '',
          remainingTime: Number(row.remaining_time || 0),
          status: row.status || 'active',
          isUsing: Boolean(row.is_using || false),
          createdAt: row.created_at || ''
        }));

        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load members:', err);
        this.members = [];
        this.filteredMembers = [];
        this.cdr.detectChanges();
      }
    });
  }

  // ===============================
  // SEARCH + FILTER
  // ===============================
  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase().trim();

    this.filteredMembers = this.members.filter((member) => {
      const computedStatus = this.getComputedStatus(member).toLowerCase();

      const matchesSearch =
        !term ||
        String(member.id).toLowerCase().includes(term) ||
        (member.name || '').toLowerCase().includes(term) ||
        (member.phone || '').toLowerCase().includes(term) ||
        (member.email || '').toLowerCase().includes(term);

      const matchesStatus =
        this.selectedStatus === 'all' ||
        computedStatus === this.selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }

  // ===============================
  // FINAL STATUS LOGIC
  // ===============================
  getComputedStatus(m: Member): string {
    const backendStatus = (m.status || '').toLowerCase();

    if (backendStatus === 'blocked') return 'blocked';
    if (m.remainingTime <= 0) return 'inactive';
    if (m.isUsing) return 'in-use';

    return 'active';
  }

  // ===============================
  // MODAL
  // ===============================
  openModal(): void {
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
    this.cdr.detectChanges();
  }

  resetForm(): void {
    this.name = '';
    this.contact = '';
    this.email = '';
    this.isSubmitting = false;
  }

  // ===============================
  // ADD MEMBER
  // ===============================
  addMember(): void {
    if (this.isSubmitting) return;

    if (!this.name.trim()) {
      alert('Member name is required.');
      return;
    }

    this.isSubmitting = true;

    const payload = {
      name: this.name.trim(),
      contact_number: this.contact.trim(),
      email: this.email.trim(),
      remaining_time: 0,
      status: 'active'
    };

    this.memberService.addMember(payload).subscribe({
      next: (res) => {
        const row = res?.data;

        if (row) {
          const newMember: Member = {
            id: Number(row.member_id ?? 0),
            name: row.name || '',
            phone: row.contact_number || '',
            email: row.email || '',
            remainingTime: Number(row.remaining_time || 0),
            status: row.status || 'active',
            isUsing: Boolean(row.is_using || false),
            createdAt: row.created_at || ''
          };

          this.members = [newMember, ...this.members];
          this.applyFilters();
        } else {
          this.loadMembers();
          return;
        }

        this.closeModal();
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to add member:', err);
        alert('Failed to add member.');
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ===============================
  // DELETE MEMBER
  // ===============================
  deleteMember(id: number): void {
    const confirmed = window.confirm('Are you sure you want to delete this member?');
    if (!confirmed) return;

    this.memberService.deleteMember(id).subscribe({
      next: () => {
        this.members = this.members.filter(member => member.id !== id);
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to delete member:', err);
        alert('Failed to delete member.');
      }
    });
  }

  // ===============================
  // TOP UP
  // ===============================
  addTopUp(id: number): void {
    const input = window.prompt('Enter top-up amount in minutes:');
    if (input === null) return;

    const amount = Number(input);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid number of minutes.');
      return;
    }

    const minutes = amount;

    this.memberService.addTopUp({
      member_id: id,
      amount,
      payment_method: 'Cash',
      time_added_minutes: minutes
    }).subscribe({
      next: (res) => {
        const updatedMember = res?.data?.member;

        if (updatedMember) {
          this.members = this.members.map(member =>
            member.id === Number(updatedMember.member_id)
              ? {
                  id: Number(updatedMember.member_id),
                  name: updatedMember.name || '',
                  phone: updatedMember.contact_number || '',
                  email: updatedMember.email || '',
                  remainingTime: Number(updatedMember.remaining_time || 0),
                  status: updatedMember.status || 'active',
                  isUsing: Boolean(updatedMember.is_using || false),
                  createdAt: updatedMember.created_at || ''
                }
              : member
          );

          this.applyFilters();
        } else {
          this.loadMembers();
          return;
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to top up member:', err);
        alert('Failed to top up member.');
      }
    });
  }

  // ===============================
  // OPTIONAL: DEMO USAGE TOGGLE
  // ===============================
  toggleUsage(m: Member): void {
    m.isUsing = !m.isUsing;
    this.applyFilters();
  }

  // ===============================
  // FORMAT TIME
  // ===============================
  formatRemainingTime(totalSeconds: number): string {
    const safeSeconds = Math.max(0, Number(totalSeconds || 0));

    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m ${seconds}s`;
  }

  // ===============================
  // STATUS STYLE
  // ===============================
  getStatusClass(status: string): string {
    const value = (status || '').toLowerCase();

    if (value === 'active') return 'active';
    if (value === 'inactive') return 'low';
    if (value === 'blocked') return 'expired';
    if (value === 'in-use') return 'in-use';

    return '';
  }
}