import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// Database interfaces
export interface User {
  id: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  email_verified: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: Date;
  last_login?: Date;
  login_attempts: number;
  lock_until?: Date;
  preferences: UserPreferences;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  [key: string]: unknown;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: string;
  granted_by?: string;
  granted_at: Date;
  expires_at?: Date;
  is_active: boolean;
  created_at: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  refresh_token?: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: Record<string, unknown>;
  expires_at: Date;
  last_activity: Date;
  is_active: boolean;
  created_at: Date;
}

export interface UserStatistics {
  id: string;
  user_id: string;
  total_scenarios: number;
  total_shares: number;
  total_reports: number;
  total_logins: number;
  last_scenario_at?: Date;
  last_share_at?: Date;
  stats_date: Date;
  created_at: Date;
  updated_at: Date;
}

// API Request/Response interfaces
export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  preferences?: Partial<UserPreferences>;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  preferences?: Partial<UserPreferences>;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// JWT Interfaces
export interface JWTUserPayload extends JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  sessionId: string;
}

// API Response interfaces
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface LoginResponse {
  user: Omit<User, 'password'>;
  token: string;
  refresh_token?: string;
  expires_at: string;
}

export interface UserProfileResponse {
  user: Omit<User, 'password'>;
  roles: string[];
  statistics: UserStatistics;
}

// Middleware interfaces
export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

// Error interfaces
export interface CustomError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
}

// OAuth interfaces
export interface OAuthProfile {
  id: string;
  provider: 'google' | 'facebook';
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

// Database connection interfaces
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | Record<string, unknown>;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

// Utility types
export type UserWithoutPassword = Omit<User, 'password'>;
export type UserCreateInput = Omit<User, 'id' | 'created_at' | 'updated_at' | 'login_attempts' | 'is_active' | 'email_verified'>;
export type UserUpdateInput = Partial<Pick<User, 'first_name' | 'last_name' | 'preferences' | 'email_verified' | 'is_active'>>;

// Express middleware types
export type AsyncRequestHandler = (req: AuthenticatedRequest, res: Response, next: (error?: Error) => void) => Promise<void>;
export type RequestHandler = (req: AuthenticatedRequest, res: Response, next: (error?: Error) => void) => void;

// Validation types
export interface ValidationRule {
  field: string;
  rules: string[];
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// Service interfaces
export interface EmailService {
  sendWelcomeEmail(email: string, name: string): Promise<boolean>;
  sendPasswordResetEmail(email: string, token: string): Promise<boolean>;
  sendEmailVerification(email: string, token: string): Promise<boolean>;
}

export interface TokenService {
  generateToken(payload: JWTUserPayload): string;
  verifyToken(token: string): JWTUserPayload;
  generateRefreshToken(): string;
  generateResetToken(): string;
}

// Audit log interface
export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  performed_by?: string;
  performed_at: Date;
}