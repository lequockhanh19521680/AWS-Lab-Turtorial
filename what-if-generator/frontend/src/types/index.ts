// User types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  emailVerified: boolean;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: 'vi' | 'en';
  notifications: boolean;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

// Scenario types
export interface Scenario {
  id: string;
  scenarioId: string;
  userId: string;
  topic: string;
  content: string;
  promptType: PromptType;
  provider: string;
  model: string;
  tokens: TokenUsage;
  tags: string[];
  isPublic: boolean;
  shareUrl?: string;
  isFavorite: boolean;
  rating?: number;
  viewCount: number;
  shareCount: number;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export type PromptType = 'default' | 'historical' | 'scientific' | 'social' | 'fantasy';

export interface GenerationRequest {
  topic: string;
  options?: {
    promptType?: PromptType;
    temperature?: number;
    maxTokens?: number;
    forceNew?: boolean;
    language?: 'vi' | 'en';
  };
}

export interface GenerationResponse {
  scenario: Scenario;
  userAuthenticated: boolean;
}

// Sharing types
export interface SharedScenario {
  shareUrl: string;
  shortUrl?: string;
  title?: string;
  description?: string;
  scenarioData: {
    topic: string;
    content: string;
    promptType: PromptType;
    tags: string[];
    generatedAt: string;
  };
  viewCount: number;
  shareCount: number;
  createdAt: string;
}

export interface ShareOptions {
  title?: string;
  description?: string;
  password?: string;
  expiresAt?: string;
  forceNew?: boolean;
}

export interface ShareResponse {
  shareUrl: string;
  fullUrl: string;
  shortUrl?: string;
  qrCodeUrl: string;
  expiresAt?: string;
  isPasswordProtected: boolean;
}

// Report types
export interface Report {
  targetType: 'scenario' | 'shared_scenario';
  targetId: string;
  shareUrl?: string;
  scenarioId: string;
  reason: ReportReason;
  description?: string;
  category?: ReportCategory;
  severity?: ReportSeverity;
}

export type ReportReason = 
  | 'inappropriate_content'
  | 'spam'
  | 'harassment'
  | 'violence'
  | 'hate_speech'
  | 'adult_content'
  | 'misinformation'
  | 'copyright_violation'
  | 'other';

export type ReportCategory = 'content' | 'behavior' | 'technical' | 'legal';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

// Search and pagination types
export interface SearchParams {
  q?: string;
  tags?: string;
  promptType?: PromptType;
  isFavorite?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sort?: 'createdAt' | 'updatedAt' | 'rating' | 'viewCount';
  order?: 'asc' | 'desc';
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Statistics types
export interface UserStats {
  totalScenarios: number;
  favoriteScenarios: number;
  publicScenarios: number;
  recentScenarios: number;
  totalViews: number;
  totalShares: number;
  popularTags: Array<{
    tag: string;
    count: number;
  }>;
}

export interface ShareAnalytics {
  totalShares: number;
  totalViews: number;
  totalShareEvents: number;
  activeShares: number;
  platformStats: Record<string, number>;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  code?: string;
  status?: number;
}

// UI state types
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Form types
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface FormState<T> {
  values: T;
  errors: FormErrors;
  isSubmitting: boolean;
  isValid: boolean;
}

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    background: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
  };
  fonts: {
    body: string;
    heading: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
}

// Social sharing types
export interface SocialShareOptions {
  url: string;
  title?: string;
  description?: string;
  hashtags?: string[];
}

export type SocialPlatform = 'facebook' | 'twitter' | 'linkedin' | 'whatsapp' | 'telegram' | 'email';

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

// Route types
export interface RouteConfig {
  path: string;
  component: React.ComponentType;
  exact?: boolean;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

// Export all types as default
export type * from './index';