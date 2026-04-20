import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getMembers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/members`);
  }

  getTransactions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/transactions`);
  }

  addCredit(payload: {
    member_id: number;
    amount: number;
    payment_method: string;
    time_added_minutes: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/payments`, payload);
  }
}