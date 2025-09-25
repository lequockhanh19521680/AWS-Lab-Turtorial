'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { scenarioAPI } from '@/lib/api'
import { Loader2, Sparkles, Share2 } from 'lucide-react'

export default function ScenarioGenerator() {
  const [topic, setTopic] = useState('')
  const [scenario, setScenario] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Vui lòng nhập một chủ đề')
      return
    }

    setLoading(true)
    setError('')
    setScenario('')

    try {
      const response = await scenarioAPI.generate(topic)
      setScenario(response.data.content)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đã có lỗi xảy ra, vui lòng thử lại sau')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (scenario) {
      try {
        await navigator.share({
          title: 'Viễn cảnh "Nếu như..." thú vị',
          text: `Chủ đề: ${topic}\n\n${scenario}`,
          url: window.location.href
        })
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(`Chủ đề: ${topic}\n\n${scenario}`)
        alert('Đã sao chép vào clipboard!')
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Input Section */}
      <Card className="border-purple-200">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Tạo viễn cảnh "Nếu như..."
              </h2>
              <p className="text-gray-600">
                Nhập một chủ đề và để AI tạo ra một viễn cảnh thú vị cho bạn
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Ví dụ: Nếu như Trái Đất hình vuông..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="min-h-[100px] text-lg border-purple-200 focus:border-purple-400"
                disabled={loading}
              />
              
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <Button
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Đang tạo viễn cảnh...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5" />
                    <span>Tạo viễn cảnh</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result Section */}
      {scenario && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  <span>Viễn cảnh được tạo</span>
                </h3>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Chia sẻ</span>
                </Button>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-semibold text-lg text-purple-700 mb-3">
                  Chủ đề: {topic}
                </h4>
                <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                  {scenario.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}