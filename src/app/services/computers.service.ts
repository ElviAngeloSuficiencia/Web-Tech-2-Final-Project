import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComputersService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getComputers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/computers`);
  }

  getMembers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/members`);
  }

  startSession(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/computers/${id}/start`, data);
  }

  endSession(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/computers/${id}/end`, {});
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/computers/${id}/status`, { status });
  }

  addComputer(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/computers`, data);
  }
}