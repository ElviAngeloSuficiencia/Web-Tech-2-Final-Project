import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  username = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(private router: Router) {}

  async onLogin() {
    this.errorMessage = '';

    const username = this.username.trim();
    const password = this.password.trim();

    if (!username || !password) {
      this.errorMessage = 'Please enter username and password';
      return;
    }

    this.isLoading = true;

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        this.errorMessage = result.message || 'Login failed';
        return;
      }

      localStorage.setItem('adminUser', JSON.stringify(result.data));
      this.router.navigateByUrl('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage = 'Cannot connect to server';
    } finally {
      this.isLoading = false;
    }
  }
}