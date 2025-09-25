import ScenarioGenerator from '@/components/ScenarioGenerator'

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-gray-900 leading-tight">
          Khám phá những viễn cảnh
          <span className="text-purple-600 block">không tưởng</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Nhập một chủ đề bất kỳ và để AI tạo ra những câu chuyện "Nếu như..." đầy sáng tạo và thú vị
        </p>
      </div>

      {/* Main Generator */}
      <ScenarioGenerator />

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 mt-16">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Trí tuệ nhân tạo</h3>
          <p className="text-gray-600">Sử dụng AI tiên tiến để tạo ra những viễn cảnh sáng tạo và độc đáo</p>
        </div>
        
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💡</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Không giới hạn</h3>
          <p className="text-gray-600">Khám phá vô số khả năng với bất kỳ chủ đề nào bạn nghĩ ra</p>
        </div>
        
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📚</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Lưu lịch sử</h3>
          <p className="text-gray-600">Đăng ký để lưu lại những viễn cảnh yêu thích của bạn</p>
        </div>
      </div>
    </div>
  )
}