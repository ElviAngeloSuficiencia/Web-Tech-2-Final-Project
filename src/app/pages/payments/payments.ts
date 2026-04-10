import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';

interface TimePackage {
  label: string;
  minutes: number;
  amount: number;
}

interface Member {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  balance: number;
  status: 'active' | 'inactive' | 'blocked' | string;
  createdAt: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  memberId: number | null;
  sessionId: number | null;
  description: string;
  createdAt: string;
  paymentMethod?: string;
  timeAddedMinutes?: number;
  memberName?: string;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payments.html',
  styleUrl: './payments.scss'
})
export class PaymentsComponent implements OnInit {
  members: Member[] = [];
  filteredMembers: Member[] = [];
  transactions: Transaction[] = [];

  memberSearch = '';
  selectedMemberId: number | null = null;
  selectedPackageLabel = '';
  selectedPaymentMethod = '';
  historySearch = '';

  showMemberResults = false;

  showMessageModal = false;
  messageModalTitle = '';
  messageModalText = '';
  messageModalType: 'success' | 'error' = 'success';

  receiptTransactionId = '';
  receiptMemberName = '';
  receiptPackageLabel = '';
  receiptAmount = 0;
  receiptPaymentMethod = '';
  receiptDate = '';
  receiptTime = '';

  isSubmitting = false;

  packages: TimePackage[] = [
    { label: '1h 0m', minutes: 60, amount: 15 },
    { label: '2h 0m', minutes: 120, amount: 25 },
    { label: '3h 0m', minutes: 180, amount: 30 },
    { label: '5h 0m', minutes: 300, amount: 50 },
    { label: '10h 0m', minutes: 600, amount: 90 }
  ];

  paymentMethods = ['Cash', 'GCash', 'Card'];

  constructor(
    private paymentService: PaymentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private normalizeRows(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.members)) return res.members;
    if (Array.isArray(res?.transactions)) return res.transactions;
    return [];
  }

  loadData(): void {
    this.paymentService.getMembers().subscribe({
      next: (res) => {
        const rows = this.normalizeRows(res);

        this.members = rows.map((row: any) => ({
          id: Number(row.member_id ?? row.id ?? 0),
          name: row.name || '',
          phone: row.contact_number || row.phone || '',
          email: row.email || '',
          balance: Number(row.remaining_time ?? row.balance ?? 0),
          status: row.status || 'active',
          createdAt: row.created_at || row.createdAt || ''
        }));

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load members:', err);
        this.members = [];
        this.filteredMembers = [];
        this.cdr.detectChanges();
      }
    });

    this.paymentService.getTransactions().subscribe({
      next: (res) => {
        const rows = this.normalizeRows(res);

        this.transactions = rows.map((row: any) => ({
          id: Number(row.transaction_id ?? row.id ?? 0),
          type: row.transaction_type || row.type || '',
          amount: Number(row.amount || 0),
          memberId: row.member_id !== null && row.member_id !== undefined ? Number(row.member_id) : null,
          sessionId: row.computer_id !== null && row.computer_id !== undefined ? Number(row.computer_id) : null,
          description: this.buildTransactionDescription(row),
          createdAt: row.transaction_date || row.created_at || '',
          paymentMethod: row.payment_method || '',
          timeAddedMinutes: Number(row.time_added || 0),
          memberName: row.member_name || ''
        }));

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load transactions:', err);
        this.transactions = [];
        this.cdr.detectChanges();
      }
    });
  }

  buildTransactionDescription(row: any): string {
    const type = row.transaction_type || row.type || '';

    if (type === 'topup') return `Top-up for ${row.member_name || 'Member'}`;
    if (type === 'session_start') return `Session started for ${row.member_name || 'Walk-in'}`;
    if (type === 'session_end') return `Session ended for ${row.member_name || 'Walk-in'}`;

    return type || 'Transaction';
  }

  onMemberSearchChange(): void {
    const search = this.memberSearch.trim().toLowerCase();

    const selected = this.selectedMember;
    if (!selected || selected.name.trim().toLowerCase() !== search) {
      this.selectedMemberId = null;
    }

    if (!search) {
      this.filteredMembers = [];
      this.showMemberResults = false;
      this.cdr.detectChanges();
      return;
    }

    this.filteredMembers = this.members.filter((member) => {
      const name = (member.name || '').toLowerCase();
      const phone = (member.phone || '').toLowerCase();
      const email = (member.email || '').toLowerCase();

      return name.includes(search) || phone.includes(search) || email.includes(search);
    });

    this.showMemberResults = true;
    this.cdr.detectChanges();
  }

  onMemberFocus(): void {
    if (this.memberSearch.trim()) {
      this.onMemberSearchChange();
    } else {
      this.showMemberResults = false;
      this.filteredMembers = [];
      this.cdr.detectChanges();
    }
  }

  selectMember(member: Member): void {
    this.selectedMemberId = member.id;
    this.memberSearch = member.name;
    this.filteredMembers = [];
    this.showMemberResults = false;
    this.cdr.detectChanges();
  }

  tryAutoSelectTypedMember(): void {
    const search = this.memberSearch.trim().toLowerCase();
    if (!search) return;

    const exactMatch = this.members.find(
      (member) => (member.name || '').trim().toLowerCase() === search
    );

    if (exactMatch) {
      this.selectMember(exactMatch);
    }
  }

  get selectedMember(): Member | undefined {
    if (this.selectedMemberId === null) return undefined;
    return this.members.find(member => member.id === this.selectedMemberId);
  }

  get selectedPackage(): TimePackage | undefined {
    return this.packages.find(pkg => pkg.label === this.selectedPackageLabel);
  }

  openMessageModal(title: string, text: string, type: 'success' | 'error' = 'success'): void {
    this.messageModalTitle = title;
    this.messageModalText = text;
    this.messageModalType = type;
    this.showMessageModal = true;
    this.cdr.detectChanges();
  }

  closeMessageModal(): void {
    this.showMessageModal = false;
    this.messageModalTitle = '';
    this.messageModalText = '';
    this.messageModalType = 'success';
    this.clearReceiptDetails();
    this.cdr.detectChanges();
  }

  clearReceiptDetails(): void {
    this.receiptTransactionId = '';
    this.receiptMemberName = '';
    this.receiptPackageLabel = '';
    this.receiptAmount = 0;
    this.receiptPaymentMethod = '';
    this.receiptDate = '';
    this.receiptTime = '';
  }

  setReceiptDetailsFromTransaction(transaction: Transaction): void {
    this.receiptTransactionId = this.formatTransactionId(transaction.id);
    this.receiptMemberName = transaction.memberName || this.getMemberName(transaction.memberId);
    this.receiptPackageLabel = this.formatTimeAdded(transaction.timeAddedMinutes);
    this.receiptAmount = transaction.amount;
    this.receiptPaymentMethod = transaction.paymentMethod || 'N/A';
    this.receiptDate = this.formatDate(transaction.createdAt);
    this.receiptTime = this.formatTime(transaction.createdAt);
  }

  addCredit(): void {
    if (this.isSubmitting) return;

    this.tryAutoSelectTypedMember();

    if (!this.selectedMemberId) {
      this.clearReceiptDetails();
      this.openMessageModal('Incomplete Form', 'Please select a valid member.', 'error');
      return;
    }

    if (!this.selectedPackage) {
      this.clearReceiptDetails();
      this.openMessageModal('Incomplete Form', 'Please choose a time package.', 'error');
      return;
    }

    if (!this.selectedPaymentMethod) {
      this.clearReceiptDetails();
      this.openMessageModal('Incomplete Form', 'Please choose a payment method.', 'error');
      return;
    }

    this.isSubmitting = true;

    this.paymentService.addCredit({
      member_id: this.selectedMemberId,
      amount: this.selectedPackage.amount,
      payment_method: this.selectedPaymentMethod,
      time_added_minutes: this.selectedPackage.minutes
    }).subscribe({
      next: (res) => {
        const tx = res?.data?.transaction;
        const updatedMember = res?.data?.member;

        if (tx) {
          const mappedTx: Transaction = {
            id: Number(tx.transaction_id ?? 0),
            type: tx.transaction_type || '',
            amount: Number(tx.amount || 0),
            memberId: tx.member_id !== null && tx.member_id !== undefined ? Number(tx.member_id) : null,
            sessionId: tx.computer_id !== null && tx.computer_id !== undefined ? Number(tx.computer_id) : null,
            description: `Top-up for ${this.selectedMember?.name || 'Member'}`,
            createdAt: tx.transaction_date || '',
            paymentMethod: tx.payment_method || '',
            timeAddedMinutes: Number(tx.time_added || 0),
            memberName: this.selectedMember?.name || ''
          };

          this.transactions = [mappedTx, ...this.transactions];
          this.setReceiptDetailsFromTransaction(mappedTx);
        }

        if (updatedMember) {
          this.members = this.members.map(member =>
            member.id === Number(updatedMember.member_id)
              ? {
                  id: Number(updatedMember.member_id),
                  name: updatedMember.name || '',
                  phone: updatedMember.contact_number || '',
                  email: updatedMember.email || '',
                  balance: Number(updatedMember.remaining_time || 0),
                  status: updatedMember.status || 'active',
                  createdAt: updatedMember.created_at || ''
                }
              : member
          );
        }

        this.memberSearch = '';
        this.selectedMemberId = null;
        this.selectedPackageLabel = '';
        this.selectedPaymentMethod = '';
        this.showMemberResults = false;
        this.filteredMembers = [];
        this.isSubmitting = false;

        this.cdr.detectChanges();
        this.openMessageModal('Payment Successful', 'Credit added successfully.', 'success');
      },
      error: (err) => {
        console.error('Payment failed:', err);
        this.clearReceiptDetails();
        this.isSubmitting = false;
        this.cdr.detectChanges();

        const message =
          err?.error?.message ||
          err?.error?.error ||
          'Unable to add credit.';

        this.openMessageModal('Unable to Add Credit', message, 'error');
      }
    });
  }

  get filteredTransactions(): Transaction[] {
    const search = this.historySearch.trim().toLowerCase();

    if (!search) return this.transactions;

    return this.transactions.filter(transaction => {
      const memberName =
        transaction.memberName ||
        (transaction.memberId
          ? (this.members.find(m => m.id === transaction.memberId)?.name || '')
          : '');

      const combined = [
        `T${transaction.id.toString().padStart(3, '0')}`,
        memberName,
        transaction.description,
        transaction.paymentMethod || '',
        this.formatPeso(transaction.amount)
      ].join(' ').toLowerCase();

      return combined.includes(search);
    });
  }

  getMethodClass(method?: string): string {
    const value = (method || '').toLowerCase();
    if (value === 'cash') return 'cash';
    if (value === 'gcash') return 'gcash';
    if (value === 'card') return 'card';
    return 'default';
  }

  getMessageButtonClass(): string {
    return this.messageModalType === 'error' ? 'btn btn-danger' : 'btn btn-primary';
  }

  formatPeso(amount: number): string {
    return `₱${amount.toLocaleString('en-PH')}`;
  }

  formatTransactionId(id: number): string {
    return `T${id.toString().padStart(3, '0')}`;
  }

  formatMemberId(id: number): string {
    return `M${id.toString().padStart(3, '0')}`;
  }

  formatTimeAdded(minutes?: number): string {
    if (!minutes || minutes <= 0) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  formatDate(dateText: string): string {
    const date = new Date(dateText);
    return date.toLocaleDateString('en-CA');
  }

  formatTime(dateText: string): string {
    const date = new Date(dateText);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  getMemberName(memberId: number | null): string {
    if (memberId === null) return 'Walk-in / N/A';
    const member = this.members.find(item => item.id === memberId);
    return member ? member.name : 'Unknown Member';
  }

  printReceipt(): void {
    if (!this.receiptTransactionId) return;

    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>${this.receiptTransactionId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            .receipt { max-width: 320px; margin: 0 auto; border: 1px dashed #94a3b8; padding: 20px; }
            .title { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 4px; }
            .subtitle { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 18px; }
            .line { border-top: 1px dashed #cbd5e1; margin: 14px 0; }
            .row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; font-size: 14px; }
            .label { color: #64748b; }
            .value { font-weight: 700; text-align: right; }
            .amount { font-size: 18px; }
            .footer { margin-top: 18px; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="title">Café System</div>
            <div class="subtitle">Payment Receipt</div>
            <div class="line"></div>
            <div class="row"><span class="label">Receipt No.</span><span class="value">${this.receiptTransactionId}</span></div>
            <div class="row"><span class="label">Member</span><span class="value">${this.receiptMemberName}</span></div>
            <div class="row"><span class="label">Time Package</span><span class="value">${this.receiptPackageLabel}</span></div>
            <div class="row"><span class="label">Payment Method</span><span class="value">${this.receiptPaymentMethod}</span></div>
            <div class="row"><span class="label">Date</span><span class="value">${this.receiptDate}</span></div>
            <div class="row"><span class="label">Time</span><span class="value">${this.receiptTime}</span></div>
            <div class="line"></div>
            <div class="row amount"><span class="label">Amount Paid</span><span class="value">${this.formatPeso(this.receiptAmount)}</span></div>
            <div class="footer">Thank you for your payment.</div>
          </div>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  }

  printTransactionReceipt(transaction: Transaction): void {
    this.setReceiptDetailsFromTransaction(transaction);
    this.printReceipt();
  }

  hideMemberResults(): void {
    setTimeout(() => {
      this.showMemberResults = false;
      this.cdr.detectChanges();
    }, 150);
  }
}