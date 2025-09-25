'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { scenarioAPI, type Scenario } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Sparkles, Clock } from 'lucide-react'

export default function HistoryPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
      return
    }

    loadHistory()
  }, [router])

  const loadHistory = async () => {
    try {
      const response = await scenarioAPI.getHistory()
      setScenarios(response.data)
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login')
      } else {
        setError('Không thể tải lịch sử')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải lịch sử...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Lịch sử viễn cảnh
        </h1>
        <p className="text-gray-600">
          Xem lại những viễn cảnh thú vị bạn đã tạo ra
        </p>
      </div>

      {scenarios.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Chưa có viễn cảnh nào
            </h3>
            <p className="text-gray-500">
              Bạn chưa tạo viễn cảnh nào. Hãy bắt đầu từ trang chủ!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {scenarios.map((scenario) => (
            <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg text-purple-700 flex items-center space-x-2">
                    <Sparkles className="h-5 w-5" />
                    <span>{scenario.topic}</span>
                  </CardTitle>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDistanceToNow(new Date(scenario.created_at), {
                      addSuffix: true,
                      locale: vi
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-gray max-w-none">
                  {scenario.content.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-3 last:mb-0 text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}