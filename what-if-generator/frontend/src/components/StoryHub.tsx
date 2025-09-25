'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  Volume2, 
  VolumeX,
  Crown,
  Zap,
  Clock,
  Users,
  Star
} from 'lucide-react'
import { storyHubAPI } from '@/lib/api'

interface StoryResult {
  id: string
  topic: string
  script: string
  audioUrl?: string
  isGeneratingAudio: boolean
  creditsUsed: number
  creditsRemaining: number
}

interface PremiumDemo {
  id: string
  title: string
  description: string
  videoUrl: string
  thumbnailUrl: string
}

interface VideoGeneration {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  estimatedTime?: number
  duration?: number
  quality?: string
  style?: string
}

export default function StoryHub() {
  const [prompt, setPrompt] = useState('')
  const [storyResult, setStoryResult] = useState<StoryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [creditsRemaining, setCreditsRemaining] = useState(10)
  const [showPremiumDemo, setShowPremiumDemo] = useState(false)
  const [videoGeneration, setVideoGeneration] = useState<VideoGeneration | null>(null)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)

  // Premium demo data
  const premiumDemo: PremiumDemo = {
    id: 'demo-1',
    title: 'BƯỚC TIẾP THEO: SỐNG TRONG VIỄN CẢNH CỦA BẠN',
    description: 'Đây là ví dụ về Video 3D của viễn cảnh này!',
    videoUrl: '/demo-videos/story-demo.mp4',
    thumbnailUrl: '/demo-images/story-thumbnail.jpg'
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Vui lòng nhập một chủ đề cho câu chuyện')
      return
    }

    if (creditsRemaining <= 0) {
      setError('Bạn đã hết lượt tạo miễn phí. Vui lòng nâng cấp để tiếp tục.')
      return
    }

    setLoading(true)
    setError('')
    setStoryResult(null)
    setProgress(0)
    setCurrentStep('')

    try {
      // Step 1: Generate script
      setCurrentStep('Đang viết kịch bản...')
      setProgress(25)
      
      const scriptResponse = await storyHubAPI.generateScript(prompt)
      
      setProgress(50)
      setCurrentStep('Đang tạo giọng thuyết minh chuyên nghiệp...')
      
      // Step 2: Generate audio
      const audioResponse = await storyHubAPI.generateAudio(scriptResponse.data.script)
      
      setProgress(100)
      setCurrentStep('Hoàn thành!')
      
      const result: StoryResult = {
        id: scriptResponse.data.id,
        topic: prompt,
        script: scriptResponse.data.script,
        audioUrl: audioResponse.data.audioUrl,
        isGeneratingAudio: false,
        creditsUsed: 1,
        creditsRemaining: scriptResponse.data.creditsRemaining
      }
      
      setStoryResult(result)
      setCreditsRemaining(result.creditsRemaining)
      
      // Show premium demo after successful generation
      setTimeout(() => {
        setShowPremiumDemo(true)
      }, 2000)
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đã có lỗi xảy ra, vui lòng thử lại sau')
    } finally {
      setLoading(false)
      setCurrentStep('')
    }
  }

  const handlePlayPause = () => {
    if (!audioElement || !storyResult?.audioUrl) return

    if (isPlaying) {
      audioElement.pause()
      setIsPlaying(false)
    } else {
      audioElement.play()
      setIsPlaying(true)
    }
  }

  const handleDownload = () => {
    if (storyResult?.audioUrl) {
      const link = document.createElement('a')
      link.href = storyResult.audioUrl
      link.download = `story-${storyResult.id}.mp3`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleUpgradeToPremium = async () => {
    try {
      setLoading(true)
      const response = await storyHubAPI.createUpgradeSession('basic')
      
      // In a real implementation, this would redirect to Stripe checkout
      // For now, simulate a successful payment
      const mockPaymentToken = `mock_token_${Date.now()}`
      const verifyResponse = await storyHubAPI.verifyUpgrade(response.data.sessionId, mockPaymentToken)
      
      if (verifyResponse.data.success) {
        // Refresh credits and show success message
        const creditsResponse = await storyHubAPI.getCredits()
        setCreditsRemaining(creditsResponse.data.remaining)
        alert('Chúc mừng! Bạn đã nâng cấp thành công lên Premium!')
      }
    } catch (error) {
      console.error('Upgrade failed:', error)
      alert('Có lỗi xảy ra khi nâng cấp. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!storyResult?.script || !storyResult?.audioUrl) {
      alert('Vui lòng tạo kịch bản và âm thanh trước khi tạo video')
      return
    }

    try {
      setIsGeneratingVideo(true)
      setVideoGeneration({
        jobId: '',
        status: 'pending'
      })

      const response = await storyHubAPI.generateVideo(
        storyResult.script,
        storyResult.audioUrl,
        {
          quality: 'high',
          style: 'cinematic',
          duration: 'auto'
        }
      )

      setVideoGeneration(response.data)
      
      if (response.data.status === 'completed') {
        alert('Video 3D đã được tạo thành công!')
      }
    } catch (error) {
      console.error('Video generation failed:', error)
      alert('Có lỗi xảy ra khi tạo video. Vui lòng thử lại sau.')
      setVideoGeneration(null)
    } finally {
      setIsGeneratingVideo(false)
    }
  }

  useEffect(() => {
    if (storyResult?.audioUrl) {
      const audio = new Audio(storyResult.audioUrl)
      audio.addEventListener('ended', () => setIsPlaying(false))
      setAudioElement(audio)
      
      return () => {
        audio.pause()
        audio.removeEventListener('ended', () => setIsPlaying(false))
      }
    }
  }, [storyResult?.audioUrl])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Crown className="h-8 w-8 text-yellow-500" />
          <h1 className="text-4xl font-bold text-gray-900">
            What If: The Story Hub
          </h1>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Beta
          </Badge>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Tạo kịch bản và thuyết minh chất lượng cao miễn phí. Nâng cấp để trải nghiệm Video 3D tuyệt vời!
        </p>
        
        {/* Credits Display */}
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-lg">
            <Zap className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Credit miễn phí còn lại: {creditsRemaining}/10
            </span>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <Card className="border-purple-200">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Tạo câu chuyện "Nếu như..." của bạn
              </h2>
              <p className="text-gray-600">
                Nhập một ý tưởng và để AI tạo ra kịch bản chi tiết với thuyết minh chuyên nghiệp
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Ví dụ: Nếu như loài chó có khả năng nói tiếng người, chuyện gì sẽ xảy ra?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] text-lg border-purple-200 focus:border-purple-400"
                disabled={loading}
              />
              
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              {/* Progress Indicator */}
              {loading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{currentStep}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim() || creditsRemaining <= 0}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{currentStep}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5" />
                    <span>
                      {creditsRemaining <= 0 ? 'Hết lượt miễn phí' : 'Tạo câu chuyện'}
                    </span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Story Result */}
      {storyResult && (
        <div className="space-y-6">
          {/* Script Display */}
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <span>Kịch bản của bạn</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-semibold text-lg text-purple-700 mb-4">
                  Chủ đề: {storyResult.topic}
                </h4>
                <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                  {storyResult.script.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audio Player */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Volume2 className="h-6 w-6 text-blue-600" />
                <span>Thuyết minh chuyên nghiệp</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handlePlayPause}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">
                      {isPlaying ? 'Đang phát...' : 'Nhấn để phát'}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Tải xuống</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Result */}
          {videoGeneration && videoGeneration.status === 'completed' && videoGeneration.videoUrl && (
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-6 w-6 text-purple-600" />
                  <span>Video 3D của bạn</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
                    <video
                      controls
                      className="w-full h-full object-cover"
                      src={videoGeneration.videoUrl}
                    >
                      Trình duyệt của bạn không hỗ trợ video.
                    </video>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <p>Chất lượng: {videoGeneration.quality}</p>
                      <p>Phong cách: {videoGeneration.style}</p>
                      {videoGeneration.duration && <p>Thời lượng: {Math.round(videoGeneration.duration / 60)} phút</p>}
                    </div>
                    <Button
                      onClick={() => window.open(videoGeneration.videoUrl, '_blank')}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Tải xuống
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Premium Conversion Zone */}
          {showPremiumDemo && (
            <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-gray-900">
                      {premiumDemo.title}
                    </h3>
                    <p className="text-lg text-gray-600">
                      {premiumDemo.description}
                    </p>
                  </div>

                  {/* Demo Video/Image */}
                  <div className="relative max-w-2xl mx-auto">
                    <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
                      <img
                        src={premiumDemo.thumbnailUrl}
                        alt="Premium Demo"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button
                          size="lg"
                          className="bg-white/90 hover:bg-white text-gray-900"
                        >
                          <Play className="h-6 w-6 mr-2" />
                          Xem Demo
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Premium Features */}
                  <div className="grid md:grid-cols-3 gap-6 my-8">
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Star className="h-6 w-6 text-yellow-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Video 3D Chất Lượng Cao</h4>
                      <p className="text-sm text-gray-600">Trải nghiệm câu chuyện trong không gian 3D sống động</p>
                    </div>
                    
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="h-6 w-6 text-yellow-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Không Giới Hạn</h4>
                      <p className="text-sm text-gray-600">Tạo vô số câu chuyện mà không lo hết credit</p>
                    </div>
                    
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">Ưu Tiên Xử Lý</h4>
                      <p className="text-sm text-gray-600">Video được tạo nhanh hơn với độ ưu tiên cao</p>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-4">
                    <Button
                      onClick={handleUpgradeToPremium}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-6 px-12 text-xl font-bold"
                      size="lg"
                    >
                      <Crown className="h-6 w-6 mr-2" />
                      Mở khóa Video 3D (Premium) – Chỉ với $5 USD
                    </Button>
                    
                    {/* Video Generation Button (for premium users) */}
                    {creditsRemaining > 10 && (
                      <Button
                        onClick={handleGenerateVideo}
                        disabled={isGeneratingVideo || !storyResult?.script || !storyResult?.audioUrl}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-4 px-8 text-lg font-semibold"
                        size="lg"
                      >
                        {isGeneratingVideo ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Đang tạo Video 3D...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Star className="h-5 w-5" />
                            <span>Tạo Video 3D ngay bây giờ</span>
                          </div>
                        )}
                      </Button>
                    )}
                    
                    <p className="text-sm text-gray-500">
                      Chỉ 100 người dùng đầu tiên được truy cập tính năng Beta 3D.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}