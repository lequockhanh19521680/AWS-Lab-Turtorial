import { apiClient } from './api'

export interface StoryScript {
  id: string
  topic: string
  script: string
  creditsRemaining: number
  generatedAt: string
}

export interface AudioResult {
  audioUrl: string
  duration: number
  fileSize: number
}

export interface PremiumUpgrade {
  success: boolean
  paymentUrl: string
  sessionId: string
}

export interface VideoGeneration {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  estimatedTime?: number
}

class StoryHubAPI {
  private baseUrl = '/api/story-hub'

  /**
   * Generate a detailed script from a prompt
   */
  async generateScript(prompt: string): Promise<{ data: StoryScript }> {
    const response = await apiClient.post(`${this.baseUrl}/generate-script`, {
      prompt,
      options: {
        includeActs: true,
        includeDialogue: true,
        maxLength: 2000
      }
    })
    return response.data
  }

  /**
   * Generate audio narration from script
   */
  async generateAudio(script: string): Promise<{ data: AudioResult }> {
    const response = await apiClient.post(`${this.baseUrl}/generate-audio`, {
      script,
      options: {
        voice: 'professional',
        speed: 1.0,
        format: 'mp3'
      }
    })
    return response.data
  }

  /**
   * Get user's remaining credits
   */
  async getCredits(): Promise<{ data: { remaining: number; used: number } }> {
    const response = await apiClient.get(`${this.baseUrl}/credits`)
    return response.data
  }

  /**
   * Get pricing plans
   */
  async getPricingPlans(): Promise<{ data: { plans: any[] } }> {
    const response = await apiClient.get(`${this.baseUrl}/pricing`)
    return response.data
  }

  /**
   * Create premium upgrade session
   */
  async createUpgradeSession(planName: string): Promise<{ data: PremiumUpgrade }> {
    const response = await apiClient.post(`${this.baseUrl}/upgrade`, {
      planName
    })
    return response.data
  }

  /**
   * Verify payment and complete upgrade
   */
  async verifyUpgrade(sessionId: string, paymentToken: string): Promise<{ data: any }> {
    const response = await apiClient.post(`${this.baseUrl}/verify-upgrade`, {
      sessionId,
      paymentToken
    })
    return response.data
  }

  /**
   * Get premium status
   */
  async getPremiumStatus(): Promise<{ data: { hasPremium: boolean; tier: string; credits: any } }> {
    const response = await apiClient.get(`${this.baseUrl}/premium-status`)
    return response.data
  }

  /**
   * Generate 3D video (premium feature)
   */
  async generateVideo(script: string, audioUrl: string, options = {}): Promise<{ data: VideoGeneration }> {
    const response = await apiClient.post('/api/video/generate-story-hub', {
      script,
      audioUrl,
      options: {
        quality: 'high',
        style: 'cinematic',
        duration: 'auto',
        ...options
      }
    })
    return response.data
  }

  /**
   * Check video generation status
   */
  async getVideoStatus(videoId: string): Promise<{ data: VideoGeneration }> {
    const response = await apiClient.get(`${this.baseUrl}/video-status/${videoId}`)
    return response.data
  }

  /**
   * Get user's story history
   */
  async getStoryHistory(page = 1, limit = 10): Promise<{ data: { stories: StoryScript[]; total: number } }> {
    const response = await apiClient.get(`${this.baseUrl}/history`, {
      params: { page, limit }
    })
    return response.data
  }

  /**
   * Delete a story
   */
  async deleteStory(storyId: string): Promise<{ data: { success: boolean } }> {
    const response = await apiClient.delete(`${this.baseUrl}/stories/${storyId}`)
    return response.data
  }

  /**
   * Share a story
   */
  async shareStory(storyId: string): Promise<{ data: { shareUrl: string } }> {
    const response = await apiClient.post(`${this.baseUrl}/stories/${storyId}/share`)
    return response.data
  }
}

export const storyHubAPI = new StoryHubAPI()