import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sessions.html',
  styleUrl: './sessions.scss'
})
export class SessionsComponent {
  sessions = [
    { pc: 'PC-01', sid: 'S001', member: 'John Doe', mid: 'M001', start: '14:30', remainingMin: 125, totalMin: 240 },
    { pc: 'PC-03', sid: 'S002', member: 'Sarah Smith', mid: 'M002', start: '15:00', remainingMin: 180, totalMin: 180 },
    { pc: 'PC-05', sid: 'S003', member: 'Mike Johnson', mid: 'M003', start: '16:15', remainingMin: 45, totalMin: 120 },
    { pc: 'PC-07', sid: 'S004', member: 'Emma Wilson', mid: 'M004', start: '14:00', remainingMin: 200, totalMin: 300 },
    { pc: 'PC-09', sid: 'S005', member: 'David Lee', mid: 'M005', start: '12:10', remainingMin: 80, totalMin: 180 },
    { pc: 'PC-11', sid: 'S006', member: 'Chris Paul', mid: 'M006', start: '13:45', remainingMin: 140, totalMin: 240 },
  ];

  progress(session: any): number {
    const used = session.totalMin - session.remainingMin;
    return (used / session.totalMin) * 100;
  }

  formatMinutes(min: number): string {
    const hours = Math.floor(min / 60);
    const minutes = min % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
}