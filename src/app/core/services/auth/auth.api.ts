import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegisterRequest,
} from '../../models/base/auth.model';

/**
 * Auth API Service — thin HTTP wrapper cho các endpoint /auth/*.
 * Base URL lấy từ environment config.
 */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, body);
  }

  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, body);
  }

  refresh(body: RefreshRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, body);
  }

  logout(body: LogoutRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/logout`, body);
  }
}
