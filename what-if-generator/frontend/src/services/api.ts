import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { 
  ApiResponse, 
  User, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse,
  GenerationRequest,
  GenerationResponse,
  Scenario,
  SearchParams,
  PaginatedResponse,
  UserStats,
  ShareOptions,
  ShareResponse,
  SharedScenario,
  ShareAnalytics,
  Report
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors and token refresh
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              localStorage.setItem('accessToken', response.data.accessToken);
              
              // Retry original request
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.logout();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(refreshToken: string): Promise<AxiosResponse> {
    return this.api.post('/api/auth/refresh', { refreshToken });
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    const response = await this.api.post('/api/auth/login', credentials);
    return response.data;
  }

  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await this.api.post('/api/auth/register', data);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await this.api.post('/api/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string, confirmPassword: string): Promise<ApiResponse> {
    const response = await this.api.post('/api/auth/reset-password', {
      token,
      password,
      confirmPassword
    });
    return response.data;
  }

  async verifyEmail(token: string): Promise<ApiResponse> {
    const response = await this.api.post('/api/auth/verify-email', { token });
    return response.data;
  }

  // User methods
  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.get('/api/users/profile');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.put('/api/users/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<ApiResponse> {
    const response = await this.api.put('/api/users/change-password', {
      currentPassword,
      newPassword,
      confirmPassword
    });
    return response.data;
  }

  async changeEmail(newEmail: string, password: string): Promise<ApiResponse> {
    const response = await this.api.put('/api/users/change-email', {
      newEmail,
      password
    });
    return response.data;
  }

  async deleteAccount(password: string): Promise<ApiResponse> {
    const response = await this.api.delete('/api/users/delete-account', {
      data: { password }
    });
    return response.data;
  }

  // Generation methods
  async generateScenario(request: GenerationRequest): Promise<ApiResponse<GenerationResponse>> {
    const response = await this.api.post('/api/generate', request);
    return response.data;
  }

  async getRandomScenario(): Promise<ApiResponse<{ scenario: Scenario }>> {
    const response = await this.api.get('/api/random');
    return response.data;
  }

  async regenerateScenario(topic: string, previousScenarioId?: string, options?: any): Promise<ApiResponse<{ scenario: Scenario }>> {
    const response = await this.api.post('/api/regenerate', {
      topic,
      previousScenarioId,
      options
    });
    return response.data;
  }

  async batchGenerate(topics: string[], options?: any): Promise<ApiResponse> {
    const response = await this.api.post('/api/batch-generate', {
      topics,
      options
    });
    return response.data;
  }

  // History methods
  async getMyScenarios(params?: SearchParams): Promise<ApiResponse<PaginatedResponse<Scenario>>> {
    const response = await this.api.get('/api/scenarios/my', { params });
    return response.data;
  }

  async searchScenarios(params: SearchParams): Promise<ApiResponse<PaginatedResponse<Scenario>>> {
    const response = await this.api.get('/api/scenarios/search', { params });
    return response.data;
  }

  async getScenario(scenarioId: string): Promise<ApiResponse<{ scenario: Scenario }>> {
    const response = await this.api.get(`/api/scenarios/${scenarioId}`);
    return response.data;
  }

  async updateScenario(scenarioId: string, data: Partial<Scenario>): Promise<ApiResponse<{ scenario: Scenario }>> {
    const response = await this.api.patch(`/api/scenarios/${scenarioId}`, data);
    return response.data;
  }

  async deleteScenario(scenarioId: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/api/scenarios/${scenarioId}`);
    return response.data;
  }

  async getUserStats(): Promise<ApiResponse<{ stats: UserStats }>> {
    const response = await this.api.get('/api/scenarios/stats');
    return response.data;
  }

  async bulkUpdateScenarios(scenarioIds: string[], operation: string, data?: any): Promise<ApiResponse> {
    const response = await this.api.patch('/api/scenarios/bulk', {
      scenarioIds,
      operation,
      data
    });
    return response.data;
  }

  // Sharing methods
  async createShare(scenarioId: string, options?: ShareOptions): Promise<ApiResponse<ShareResponse>> {
    const response = await this.api.post(`/api/share/${scenarioId}`, options);
    return response.data;
  }

  async getSharedScenario(shareUrl: string, password?: string): Promise<ApiResponse<{ scenario: SharedScenario }>> {
    const params = password ? { password } : {};
    const response = await this.api.get(`/shared/${shareUrl}`, { params });
    return response.data;
  }

  async getMyShares(params?: any): Promise<ApiResponse<PaginatedResponse<any>>> {
    const response = await this.api.get('/api/sharing/my', { params });
    return response.data;
  }

  async updateShare(shareUrl: string, data: any): Promise<ApiResponse> {
    const response = await this.api.patch(`/api/sharing/share/${shareUrl}`, data);
    return response.data;
  }

  async deleteShare(shareUrl: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/api/sharing/share/${shareUrl}`);
    return response.data;
  }

  async recordShare(shareUrl: string, platform: string): Promise<ApiResponse> {
    const response = await this.api.post(`/api/sharing/share/${shareUrl}/record`, { platform });
    return response.data;
  }

  async getShareAnalytics(dateFrom?: string, dateTo?: string): Promise<ApiResponse<{ analytics: ShareAnalytics }>> {
    const params = { dateFrom, dateTo };
    const response = await this.api.get('/api/sharing/analytics', { params });
    return response.data;
  }

  async getQRCode(shareUrl: string): Promise<Blob> {
    const response = await this.api.get(`/qr/${shareUrl}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Reporting methods
  async createReport(report: Report): Promise<ApiResponse> {
    const response = await this.api.post('/api/report', report);
    return response.data;
  }

  async getReportOptions(): Promise<ApiResponse> {
    const response = await this.api.get('/api/reporting/options');
    return response.data;
  }

  // Health check
  async getHealth(): Promise<ApiResponse> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // Generic request method
  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    data?: any,
    config?: any
  ): Promise<ApiResponse<T>> {
    const response = await this.api.request({
      method,
      url,
      data,
      ...config
    });
    return response.data;
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;

// Helper functions for common operations
export const isApiError = (response: any): response is { success: false; message: string } => {
  return response && response.success === false;
};

export const getErrorMessage = (error: any): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Đã xảy ra lỗi không xác định';
};

export const handleApiError = (error: any): never => {
  const message = getErrorMessage(error);
  throw new Error(message);
};