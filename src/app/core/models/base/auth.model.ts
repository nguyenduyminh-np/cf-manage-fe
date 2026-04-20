// DTO cho Login
export interface LoginRequest {
  username: string;
  password: string;
}

// DTO cho Register
export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
}

// Response từ các endpoint /login, /register, /refresh
export interface UserInfo {
  full_name: string;
  phone_number: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number; // 1800 (30 phút)
  message: string;
  user_info?: UserInfo;
}

// Refresh Request
export interface RefreshRequest {
  refreshToken: string;
}

// Logout Request
export interface LogoutRequest {
  refreshToken: string;
}

// JWT Payload (sau decode)
export interface JwtPayload {
  sub: string;        // username
  iss: string;        // 'cf-manager'
  iat: number;
  exp: number;
  jti: string;        // JWT ID để revoke
  uid: number;        // Account ID
  role: string;       // 'ADMIN', 'QL-002', 'PC-008'
  status: string;     // 'true' / 'false'
}

// API Error Response từ Backend
export interface ApiError {
  code: string;       // e.g., 'AUTH_TOKEN_EXPIRED'
  message: string;    // Mô tả tiếng Việt
  details?: string[];
  timestamp: string;
}
