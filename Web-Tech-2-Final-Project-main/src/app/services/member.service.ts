import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Member {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  balance: number;
  status: 'active' | 'inactive' | 'blocked' | string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getMembers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/members`);
  }

  addMember(payload: {
    name: string;
    contact_number: string;
    email: string;
    remaining_time: number;
    status: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/members`, payload);
  }

  deleteMember(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/members/${id}`);
  }

  addTopUp(payload: {
    member_id: number;
    amount: number;
    payment_method: string;
    time_added_minutes: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/payments`, payload);
  }
}