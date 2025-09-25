import StoryHub from '@/components/StoryHub'

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Main Story Hub */}
      <StoryHub />

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 mt-16">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎬</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Kịch bản chuyên nghiệp</h3>
          <p className="text-gray-600">AI tạo ra kịch bản chi tiết với cấu trúc ACT và hội thoại</p>
        </div>
        
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎵</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Thuyết minh chất lượng cao</h3>
          <p className="text-gray-600">Giọng thuyết minh chuyên nghiệp với công nghệ TTS tiên tiến</p>
        </div>
        
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎥</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Video 3D Premium</h3>
          <p className="text-gray-600">Nâng cấp để trải nghiệm câu chuyện trong không gian 3D sống động</p>
        </div>
      </div>
    </div>
  )
}